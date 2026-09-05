import { readBoundedText } from './bounded-text';
import type { EdgeBindings } from './env';

/*
 * Ported verbatim from `src/lib/rails-client.ts` (TanStack Start unit). Two
 * deliberate differences and nothing else:
 *
 * 1. No Start/Next server-only marker — Astro decides server vs
 *    client by file location (`src/pages/*.ts` endpoints are server-only)
 *    and by `export const prerender = false`.
 * 2. `getRailsClient()` takes the Cloudflare `env` as an argument instead of
 *    reading a module-global `cloudflare:workers`. Astro exposes bindings
 *    per-request on `context.locals.runtime.env`, so the transport selection
 *    moves to the call site (`src/pages/health.ts`).
 *
 * Everything the invariant suite pins — the credential strip, the relative-path
 * validation, `redirect: 'manual'`, `cache: 'no-store'`, the 5s timeout, the
 * `ProxyError` → `unreachable` classification — is unchanged.
 */

const RAILS_FETCH_TIMEOUT_MS = 5000;

// The Rails entry point for this frame. Workers VPC does NOT route on this host;
// the VPC Service decides where the connection goes and this URL only populates
// the `Host` header, which Rails dispatches on to `<Frame>::<Brand>::…`. Editing
// it changes which Rails namespace answers.
const PRIVATE_RAILS_ORIGIN = 'http://docs.org.localhost:3000';

// Stripped from every outbound request, always. Never relay a caller's
// credentials to Rails — a browser session cookie or an inbound Access token
// must not become a Rails-side identity.
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

function readLocalFlag(name: string): string | undefined {
  const processEnv: unknown = typeof process === 'undefined' ? undefined : process.env;
  if (typeof processEnv !== 'object' || processEnv === null) {
    return undefined;
  }
  const value: unknown = Reflect.get(processEnv, name);
  return typeof value === 'string' ? value : undefined;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

const PROXY_ERROR_MAX_CHARS = 200;

/**
 * The `ProxyError: <code>` that Workers VPC returns when it cannot reach the
 * private origin, or null for any other response. Only a 500 with a `text/plain`
 * body is inspected, and the body is read from a clone.
 */
async function readProxyError(response: Response): Promise<string | null> {
  if (response.status !== 500) {
    return null;
  }
  if (!response.headers.get('content-type')?.startsWith('text/plain')) {
    return null;
  }

  try {
    const body = await readBoundedText(response.clone(), PROXY_ERROR_MAX_CHARS);
    return /^ProxyError:\s*\w+/iu.test(body) ? body : null;
  } catch {
    return null;
  }
}

function buildSanitizedHeaders(
  init: RailsClientInit | undefined,
  authHeaders: Readonly<Record<string, string>>,
): Headers {
  const headers = new Headers(init?.headers);
  for (const forbidden of FORBIDDEN_REQUEST_HEADERS) {
    headers.delete(forbidden);
  }
  for (const [name, value] of Object.entries(authHeaders)) {
    headers.set(name, value);
  }
  return headers;
}

export function createRailsClient(
  fetcher: RailsFetcher,
  origin: string,
  authHeaders: Readonly<Record<string, string>> = {},
): RailsClient {
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
        const response = await fetcher.fetch(url.toString(), {
          ...(init?.method === undefined ? {} : { method: init.method }),
          ...(init?.body === undefined ? {} : { body: init.body }),
          headers: buildSanitizedHeaders(init, authHeaders),
          redirect: 'manual',
          cache: 'no-store',
          signal: AbortSignal.timeout(RAILS_FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
          const proxyError = await readProxyError(response);
          if (proxyError) {
            return { kind: 'unreachable', errorMessage: proxyError };
          }
          return { kind: 'http-error', status: response.status, response };
        }

        return { kind: 'ok', status: response.status, response };
      } catch (error) {
        return { kind: 'unreachable', errorMessage: getErrorMessage(error) };
      }
    },
  };
}

/**
 * Two mutually exclusive transports, selected by an actual runtime capability:
 *
 * 1. Local Node dev  → direct private network, no Access token.
 * 2. VPC binding     → workerd. Cloudflare grants the real binding.
 * 3. Neither         → null, reported as `not-configured`. Fail closed.
 *
 * The local check runs first — a Workers VPC binding has no local simulator and
 * is truthy-but-throwing without `remote: true`, so testing it first would make
 * the direct transport dead code.
 */
export function getRailsClient(env: EdgeBindings): RailsClient | null {
  const isLocalNodeRuntime = readLocalFlag('EDGE_LOCAL_NODE_RUNTIME') === '1';

  if (isLocalNodeRuntime) {
    if (readLocalFlag('EDGE_LOCAL_RAILS_ENABLED') === '1') {
      return createRailsClient({ fetch }, PRIVATE_RAILS_ORIGIN);
    }
    return null;
  }

  const binding = env.UMAXICA_APPS_EDGE_CF_WORKERS_VPC;
  if (binding) {
    return createRailsClient(binding, PRIVATE_RAILS_ORIGIN);
  }

  return null;
}
