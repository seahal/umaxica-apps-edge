import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CmsFetchResult } from '../../src/lib/cms/document';
import { documentFetchLogEntry, logDocumentFetch } from '../../src/lib/cms/document-fetch-log';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('document fetch log', () => {
  it('contains closed fields without request or response content', () => {
    const entry = documentFetchLogEntry(
      { kind: 'invalid-contract', reason: 'schema_mismatch', upstreamStatus: 200 },
      12.4,
    );
    expect(entry).toEqual({
      result_class: 'invalid_contract',
      duration_ms: 12,
      upstream_status_class: '2xx',
      upstream_status: 200,
      invalid_contract_reason: 'schema_mismatch',
    });
    expect(JSON.stringify(entry)).not.toMatch(/slug|url|body|header|message/iu);
  });

  it.each([
    [
      { kind: 'ok', document: {} as never, upstreamStatus: 200 },
      { result_class: 'ok', upstream_status_class: '2xx', upstream_status: 200 },
    ],
    [
      { kind: 'not-found', upstreamStatus: 404 },
      { result_class: 'not_found', upstream_status_class: '4xx', upstream_status: 404 },
    ],
    [
      { kind: 'upstream-error', upstreamStatus: 503 },
      { result_class: 'upstream_error', upstream_status_class: '5xx', upstream_status: 503 },
    ],
    [
      { kind: 'upstream-access-error', upstreamStatus: 403 },
      { result_class: 'upstream_access_error', upstream_status_class: '4xx', upstream_status: 403 },
    ],
    [
      { kind: 'upstream-rate-limited', upstreamStatus: 429 },
      { result_class: 'upstream_rate_limited', upstream_status_class: '4xx', upstream_status: 429 },
    ],
    [
      { kind: 'upstream-protocol-error', upstreamStatus: 302 },
      {
        result_class: 'upstream_protocol_error',
        upstream_status_class: '4xx',
        upstream_status: 302,
      },
    ],
    [
      { kind: 'upstream-unavailable', transportReason: 'dns_error' },
      {
        result_class: 'upstream_unavailable',
        upstream_status_class: 'none',
        transport_reason: 'dns_error',
      },
    ],
    [{ kind: 'timeout' }, { result_class: 'timeout', upstream_status_class: 'none' }],
    [
      { kind: 'configuration-error', reason: 'binding_missing' },
      { result_class: 'configuration_error', upstream_status_class: 'none' },
    ],
    [{ kind: 'internal-error' }, { result_class: 'internal_error', upstream_status_class: 'none' }],
  ] as Array<[CmsFetchResult, Record<string, unknown>]>)('maps %j', (result, expected) => {
    expect(documentFetchLogEntry(result, 1.2)).toMatchObject({
      duration_ms: 1,
      ...expected,
    });
  });

  it('emits one closed JSON line and never an ok as error', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    logDocumentFetch(documentFetchLogEntry({ kind: 'timeout' }, 4));
    expect(log).toHaveBeenCalledOnce();
    const line = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      level: string;
      msg: string;
      data: Record<string, unknown>;
    };
    expect(line).toMatchObject({
      level: 'error',
      msg: 'document_fetch',
      data: { event: 'document_fetch', surface: 'app_docs', result_class: 'timeout' },
    });
    expect(JSON.stringify(line)).not.toContain('docs.app.localhost');

    log.mockClear();
    logDocumentFetch(
      documentFetchLogEntry({ kind: 'ok', document: {} as never, upstreamStatus: 200 }, 0),
    );
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({ level: 'info' });
  });
});
