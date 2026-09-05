import { describe, expect, it } from 'vitest';

import { cmsStatus, parseCmsDocument, type CmsFetchResult } from '../../src/lib/cms/document';
const valid = {
  namespace: 'docs',
  surface: 'app',
  slug: 'guide',
  locale: 'ja',
  title: 'Guide',
  summary: null,
  body: { text: '<b>plain</b>' },
  published_at: '2026-09-03T00:00:00Z',
  taxonomy: {},
  extra: true,
};
describe('CMS document consumer contract', () => {
  it('accepts plain text and unknown top-level fields', () => {
    const parsed = parseCmsDocument(valid);
    expect(parsed.kind).toBe('ok');
    if (parsed.kind === 'ok') expect(parsed.document.body.text).toBe('<b>plain</b>');
  });
  it('rejects a missing body object', () => {
    expect(parseCmsDocument(null)).toEqual({ kind: 'invalid', reason: 'body_missing_or_invalid' });
    expect(parseCmsDocument({ title: 'Guide' })).toEqual({
      kind: 'invalid',
      reason: 'body_missing_or_invalid',
    });
  });

  it('rejects a well-shaped body that still fails the schema', () => {
    expect(parseCmsDocument({ ...valid, namespace: 'help' })).toEqual({
      kind: 'invalid',
      reason: 'schema_mismatch',
    });
  });

  it('maps a successful fetch to HTTP 200', () => {
    const parsed = parseCmsDocument(valid);
    if (parsed.kind !== 'ok') throw new Error('fixture must parse');
    expect(cmsStatus({ kind: 'ok', document: parsed.document, upstreamStatus: 200 })).toBe(200);
  });

  it.each([
    { body: null },
    { body: {} },
    { body: { text: 1 } },
    { body: { text: 'ok', html: '<b>x</b>' } },
  ])('rejects an unsupported body: %j', (change) => {
    expect(parseCmsDocument({ ...valid, ...change })).toEqual({
      kind: 'invalid',
      reason: 'body_missing_or_invalid',
    });
  });
  it('pins every outward failure status', () => {
    const cases: Array<[CmsFetchResult, number]> = [
      [{ kind: 'not-found', upstreamStatus: 404 }, 404],
      [{ kind: 'internal-error' }, 500],
      [{ kind: 'configuration-error', reason: 'binding_missing' }, 500],
      [{ kind: 'invalid-contract', reason: 'invalid_json', upstreamStatus: 200 }, 502],
      [{ kind: 'upstream-error', upstreamStatus: 503 }, 502],
      [{ kind: 'upstream-access-error', upstreamStatus: 401 }, 502],
      [{ kind: 'upstream-protocol-error', upstreamStatus: 302 }, 502],
      [{ kind: 'upstream-unavailable', transportReason: 'dns_error' }, 503],
      [{ kind: 'upstream-rate-limited', upstreamStatus: 429 }, 503],
      [{ kind: 'timeout' }, 504],
    ];
    for (const [result, status] of cases) expect(cmsStatus(result)).toBe(status);
  });
});
