import type { RailsClient, RailsClientResult } from '../rails-client';
import {
  CMS_RESPONSE_MAX_BYTES,
  type CmsFetchResult,
  type CmsLocale,
  parseCmsDocument,
  type TransportReason,
} from './document';
const REASONS: readonly Exclude<TransportReason, 'unknown'>[] = [
  'connection_limit_reached',
  'connection_refused',
  'connection_terminated',
  'connection_timeout',
  'destination_not_found',
  'destination_unavailable',
  'dns_error',
  'http_response_incomplete',
  'rate_limited',
  'tls_certificate_error',
];
function reason(message: string): TransportReason {
  const lower = message.toLowerCase();
  return REASONS.find((item) => lower.includes(item)) ?? 'unknown';
}
function isByteStream(value: unknown): value is ReadableStream<Uint8Array> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'getReader') === 'function'
  );
}
async function json(
  response: Response,
): Promise<{ kind: 'ok'; value: unknown } | { kind: 'invalid-json' } | { kind: 'too-large' }> {
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > CMS_RESPONSE_MAX_BYTES) return { kind: 'too-large' };
  const body: unknown = response.body;
  if (!isByteStream(body)) return { kind: 'invalid-json' };
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let part = await reader.read();
  while (!part.done) {
    size += part.value.byteLength;
    if (size > CMS_RESPONSE_MAX_BYTES) {
      await reader.cancel();
      return { kind: 'too-large' };
    }
    chunks.push(part.value);
    part = await reader.read();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { kind: 'ok', value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { kind: 'invalid-json' };
  }
}
function http(result: Extract<RailsClientResult, { kind: 'http-error' }>): CmsFetchResult {
  const status = result.status;
  if (status === 404) return { kind: 'not-found', upstreamStatus: 404 };
  if (status === 401 || status === 403)
    return { kind: 'upstream-access-error', upstreamStatus: status };
  if (status === 429) return { kind: 'upstream-rate-limited', upstreamStatus: 429 };
  if (status >= 500 && status <= 599) return { kind: 'upstream-error', upstreamStatus: status };
  return { kind: 'upstream-protocol-error', upstreamStatus: status };
}
async function map(result: RailsClientResult): Promise<CmsFetchResult> {
  switch (result.kind) {
    case 'invalid-path':
      return { kind: 'internal-error' };
    case 'timeout':
      return { kind: 'timeout' };
    case 'unreachable':
      return { kind: 'upstream-unavailable', transportReason: reason(result.errorMessage) };
    case 'http-error':
      return http(result);
    case 'ok': {
      const decoded = await json(result.response);
      if (decoded.kind === 'too-large')
        return {
          kind: 'invalid-contract',
          reason: 'response_too_large',
          upstreamStatus: result.status,
        };
      if (decoded.kind === 'invalid-json')
        return { kind: 'invalid-contract', reason: 'invalid_json', upstreamStatus: result.status };
      const parsed = parseCmsDocument(decoded.value);
      return parsed.kind === 'ok'
        ? { kind: 'ok', document: parsed.document, upstreamStatus: result.status }
        : { kind: 'invalid-contract', reason: parsed.reason, upstreamStatus: result.status };
    }
  }
}
export interface CmsClient {
  fetchDocument(locale: CmsLocale, slug: string): Promise<CmsFetchResult>;
}
export function createCmsClient(rails: RailsClient): CmsClient {
  return {
    async fetchDocument(locale, slug) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug))
        return { kind: 'upstream-protocol-error', upstreamStatus: 400 };
      const result = await map(
        await rails.fetch(`/api/v0/entries/${encodeURIComponent(slug)}?locale=${locale}`, {
          headers: { Accept: 'application/json' },
        }),
      );
      if (
        result.kind === 'ok' &&
        (result.document.locale !== locale || result.document.slug !== slug)
      )
        return {
          kind: 'invalid-contract',
          reason: 'schema_mismatch',
          upstreamStatus: result.upstreamStatus,
        };
      return result;
    },
  };
}
