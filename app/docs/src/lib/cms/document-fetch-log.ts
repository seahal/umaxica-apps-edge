import type { CmsFetchResult, InvalidContractReason, TransportReason } from './document';
export type DocumentResultClass =
  | 'configuration_error'
  | 'internal_error'
  | 'invalid_contract'
  | 'not_found'
  | 'ok'
  | 'timeout'
  | 'upstream_access_error'
  | 'upstream_error'
  | 'upstream_protocol_error'
  | 'upstream_rate_limited'
  | 'upstream_unavailable';
export interface DocumentFetchLogEntry {
  result_class: DocumentResultClass;
  duration_ms: number;
  upstream_status_class: '2xx' | '4xx' | '5xx' | 'none';
  upstream_status?: number;
  invalid_contract_reason?: InvalidContractReason;
  transport_reason?: TransportReason;
}
export function documentFetchLogEntry(
  result: CmsFetchResult,
  durationMs: number,
): DocumentFetchLogEntry {
  const base = { duration_ms: Math.max(0, Math.round(durationMs)) };
  switch (result.kind) {
    case 'ok':
      return {
        ...base,
        result_class: 'ok',
        upstream_status_class: '2xx',
        upstream_status: result.upstreamStatus,
      };
    case 'not-found':
      return {
        ...base,
        result_class: 'not_found',
        upstream_status_class: '4xx',
        upstream_status: 404,
      };
    case 'invalid-contract':
      return {
        ...base,
        result_class: 'invalid_contract',
        upstream_status_class: '2xx',
        upstream_status: result.upstreamStatus,
        invalid_contract_reason: result.reason,
      };
    case 'upstream-error':
      return {
        ...base,
        result_class: 'upstream_error',
        upstream_status_class: '5xx',
        upstream_status: result.upstreamStatus,
      };
    case 'upstream-access-error':
      return {
        ...base,
        result_class: 'upstream_access_error',
        upstream_status_class: '4xx',
        upstream_status: result.upstreamStatus,
      };
    case 'upstream-rate-limited':
      return {
        ...base,
        result_class: 'upstream_rate_limited',
        upstream_status_class: '4xx',
        upstream_status: 429,
      };
    case 'upstream-protocol-error':
      return {
        ...base,
        result_class: 'upstream_protocol_error',
        upstream_status_class: '4xx',
        upstream_status: result.upstreamStatus,
      };
    case 'upstream-unavailable':
      return {
        ...base,
        result_class: 'upstream_unavailable',
        upstream_status_class: 'none',
        transport_reason: result.transportReason,
      };
    case 'timeout':
      return { ...base, result_class: 'timeout', upstream_status_class: 'none' };
    case 'configuration-error':
      return { ...base, result_class: 'configuration_error', upstream_status_class: 'none' };
    case 'internal-error':
      return { ...base, result_class: 'internal_error', upstream_status_class: 'none' };
  }
}
export function logDocumentFetch(entry: DocumentFetchLogEntry): void {
  globalThis.console.log(
    JSON.stringify({
      level: entry.result_class === 'ok' ? 'info' : 'error',
      msg: 'document_fetch',
      data: { event: 'document_fetch', surface: 'app_docs', route_class: 'cms_document', ...entry },
    }),
  );
}
