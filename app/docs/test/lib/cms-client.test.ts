import { describe, expect, it, vi } from 'vitest';

import { createCmsClient } from '../../src/lib/cms/client';
import type { RailsClient, RailsClientResult } from '../../src/lib/rails-client';
function client(result: RailsClientResult) {
  const fetch = vi.fn(() => Promise.resolve(result));
  return { cms: createCmsClient({ fetch } as RailsClient), fetch };
}
const payload = {
  namespace: 'docs',
  surface: 'app',
  slug: 'guide',
  locale: 'ja',
  title: 'Guide',
  summary: 'Summary',
  body: { text: 'Body' },
  published_at: '2026-09-03T00:00:00Z',
  taxonomy: {},
};
describe('CMS Rails client', () => {
  it('uses only the fixed entries path and JSON accept header', async () => {
    const { cms, fetch } = client({ kind: 'ok', status: 200, response: Response.json(payload) });
    await expect(cms.fetchDocument('ja', 'guide')).resolves.toMatchObject({ kind: 'ok' });
    expect(fetch).toHaveBeenCalledWith('/api/v0/entries/guide?locale=ja', {
      headers: { Accept: 'application/json' },
    });
  });
  it.each([
    [404, 'not-found'],
    [401, 'upstream-access-error'],
    [403, 'upstream-access-error'],
    [429, 'upstream-rate-limited'],
    [500, 'upstream-error'],
    [503, 'upstream-error'],
    [302, 'upstream-protocol-error'],
  ] as const)('maps Rails %i to %s', async (status, kind) => {
    const { cms } = client({
      kind: 'http-error',
      status,
      response: new Response(null, { status }),
    });
    await expect(cms.fetchDocument('ja', 'guide')).resolves.toMatchObject({ kind });
  });
  it.each([
    ['a body Rails did not send', { ...payload, body: undefined }, 'body_missing_or_invalid'],
    ['a field Rails typed differently', { ...payload, title: 42 }, 'schema_mismatch'],
  ] as const)('maps well-formed JSON with %s to invalid-contract', async (_label, body, reason) => {
    // The JSON parses and is within the size bound, so neither earlier guard
    // fires: `parseCmsDocument` is what rejects it, and its reason is carried
    // through unchanged while the upstream status stays 200.
    const { cms } = client({ kind: 'ok', status: 200, response: Response.json(body) });

    await expect(cms.fetchDocument('ja', 'guide')).resolves.toEqual({
      kind: 'invalid-contract',
      reason,
      upstreamStatus: 200,
    });
  });

  it('maps an invalid Rails path to an internal error', async () => {
    const { cms } = client({ kind: 'invalid-path', reason: 'path must not be empty' });
    await expect(cms.fetchDocument('ja', 'guide')).resolves.toEqual({ kind: 'internal-error' });
  });

  it('distinguishes the Astro timeout', async () => {
    const { cms } = client({ kind: 'timeout' });
    await expect(cms.fetchDocument('ja', 'guide')).resolves.toEqual({ kind: 'timeout' });
  });
  it('normalizes known and unknown transport errors', async () => {
    for (const [message, transportReason] of [
      ['workerd: dns_error', 'dns_error'],
      ['private detail', 'unknown'],
    ] as const) {
      const { cms } = client({ kind: 'unreachable', errorMessage: message });
      await expect(cms.fetchDocument('ja', 'guide')).resolves.toMatchObject({
        kind: 'upstream-unavailable',
        transportReason,
      });
    }
  });
  it('rejects malformed JSON and empty successful responses', async () => {
    for (const response of [new Response('{'), new Response(null, { status: 204 })]) {
      const { cms } = client({ kind: 'ok', status: response.status, response });
      await expect(cms.fetchDocument('ja', 'guide')).resolves.toMatchObject({
        kind: 'invalid-contract',
      });
    }
  });
  it('rejects bodies larger than one MiB', async () => {
    const response = new Response('x', { headers: { 'Content-Length': String(1024 * 1024 + 1) } });
    const { cms } = client({ kind: 'ok', status: 200, response });
    await expect(cms.fetchDocument('ja', 'guide')).resolves.toEqual({
      kind: 'invalid-contract',
      reason: 'response_too_large',
      upstreamStatus: 200,
    });
  });
  it('rejects a representation for another locale or slug', async () => {
    for (const change of [{ locale: 'en' }, { slug: 'other' }]) {
      const { cms } = client({
        kind: 'ok',
        status: 200,
        response: Response.json({ ...payload, ...change }),
      });
      await expect(cms.fetchDocument('ja', 'guide')).resolves.toEqual({
        kind: 'invalid-contract',
        reason: 'schema_mismatch',
        upstreamStatus: 200,
      });
    }
  });
  it('enforces the one MiB limit while streaming without Content-Length', async () => {
    const { cms } = client({
      kind: 'ok',
      status: 200,
      response: new Response(new Uint8Array(1024 * 1024 + 1)),
    });
    await expect(cms.fetchDocument('ja', 'guide')).resolves.toEqual({
      kind: 'invalid-contract',
      reason: 'response_too_large',
      upstreamStatus: 200,
    });
  });
  it('rejects unsafe slugs without calling Rails', async () => {
    const { cms, fetch } = client({ kind: 'ok', status: 200, response: Response.json(payload) });
    await expect(cms.fetchDocument('ja', '../secret')).resolves.toMatchObject({
      kind: 'upstream-protocol-error',
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
