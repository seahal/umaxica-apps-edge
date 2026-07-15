import 'server-only';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const RAILS_HOSTNAME = 'core.app.localhost';
const RAILS_PORT = 3000;
const RAILS_FETCH_TIMEOUT_MS = 5000;

const FORBIDDEN_REQUEST_HEADERS = [
  'cookie',
  'authorization',
  'cf-access-client-id',
  'cf-access-client-secret',
];

export interface RailsFetcher {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

export type RailsClientInit = Pick<RequestInit, 'method' | 'headers' | 'body'>;

export type RailsClientResult =
  | { kind: 'ok'; status: number; response: Response }
  | { kind: 'http-error'; status: number; response: Response }
  | { kind: 'unreachable'; errorMessage: string }
  | { kind: 'invalid-path'; reason: string };

export interface RailsClient {
  fetch(path: string, init?: RailsClientInit): Promise<RailsClientResult>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function hasControlCharacter(path: string): boolean {
  for (let i = 0; i < path.length; i += 1) {
    const code = path.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function validateRelativePath(path: string): string | null {
  if (path.length === 0) {
    return 'path must not be empty';
  }
  if (!path.startsWith('/')) {
    return 'path must start with a single leading slash';
  }
  if (path.startsWith('//')) {
    return 'path must not be protocol-relative';
  }
  if (path.includes('://')) {
    return 'path must not embed a scheme';
  }
  if (path.includes('\\')) {
    return 'path must not contain a backslash';
  }
  if (hasControlCharacter(path)) {
    return 'path must not contain control characters';
  }
  return null;
}

function buildSanitizedHeaders(init: RailsClientInit | undefined): Headers {
  const headers = new Headers(init?.headers);
  for (const forbidden of FORBIDDEN_REQUEST_HEADERS) {
    headers.delete(forbidden);
  }
  return headers;
}

export function createRailsClient(
  binding: RailsFetcher,
  hostname: string,
  port: number,
): RailsClient {
  const origin = `http://${hostname}:${port}`;

  return {
    async fetch(path, init) {
      const validationError = validateRelativePath(path);
      if (validationError) {
        return { kind: 'invalid-path', reason: validationError };
      }

      const url = new URL(path, `${origin}/`);
      if (url.origin !== origin) {
        return { kind: 'invalid-path', reason: 'path resolved outside the fixed origin' };
      }

      try {
        const response = await binding.fetch(url.toString(), {
          method: init?.method,
          body: init?.body,
          headers: buildSanitizedHeaders(init),
          redirect: 'manual',
          cache: 'no-store',
          signal: AbortSignal.timeout(RAILS_FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
          return { kind: 'http-error', status: response.status, response };
        }

        return { kind: 'ok', status: response.status, response };
      } catch (error) {
        return { kind: 'unreachable', errorMessage: getErrorMessage(error) };
      }
    },
  };
}

function createDevOnlyFetcher(): RailsFetcher {
  return {
    fetch(input, init) {
      return fetch(input, init);
    },
  };
}

export function getRailsClient(): RailsClient | null {
  const { env } = getCloudflareContext() as { env: Partial<CloudflareEnv> };
  const binding = env.UMAXICA_APPS_EDGE_CF_WORKERS_VPC;

  if (binding) {
    return createRailsClient(binding, RAILS_HOSTNAME, RAILS_PORT);
  }

  if (process.env.NODE_ENV === 'development') {
    return createRailsClient(createDevOnlyFetcher(), RAILS_HOSTNAME, RAILS_PORT);
  }

  return null;
}
