import { describe, expect, it, vi } from 'vitest';

import type { RailsClient, RailsClientResult } from '../../src/lib/rails-client';
import { createRailsEntriesClient } from '../../src/lib/rails-entries';

const entry = {
  public_id: 'entry-1',
  namespace: 'info',
  surface: 'app',
  slug: 'welcome',
  locale: 'ja',
  title: 'Welcome',
  summary: null,
  body: { text: 'Body' },
  published_at: '2026-09-03T00:00:00Z',
  taxonomy: {},
};

function client(...results: RailsClientResult[]) {
  const fetch = vi.fn(() =>
    Promise.resolve(results.shift() ?? { kind: 'invalid-path', reason: 'test result missing' }),
  );
  return { entries: createRailsEntriesClient({ fetch } as RailsClient), fetch };
}

describe('Rails entries client', () => {
  it('uses fixed, encoded entry and collection API paths with only an Accept header', async () => {
    const { entries, fetch } = client(
      { kind: 'ok', status: 200, response: Response.json(entry) },
      {
        kind: 'ok',
        status: 200,
        response: Response.json({
          data: [entry],
          page: { next_cursor: null, has_more: false },
          ignored_by_client: true,
        }),
      },
    );

    await expect(
      entries.fetchEntry({ publicId: 'id/-safe space?', locale: 'ja' }),
    ).resolves.toMatchObject({
      kind: 'ok',
    });
    await expect(
      entries.fetchEntriesPage({ locale: 'ja', limit: 20, cursor: 'after one' }),
    ).resolves.toMatchObject({
      kind: 'ok',
    });

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v0/entries/id%2F-safe%20space%3F?locale=ja', {
      headers: { Accept: 'application/json' },
    });
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/v0/entries?locale=ja&limit=20&cursor=after+one',
      {
        headers: { Accept: 'application/json' },
      },
    );
  });

  it('parses valid entries and tolerates additive response fields', async () => {
    const { entries } = client({
      kind: 'ok',
      status: 200,
      response: Response.json({ ...entry, additive: { field: true } }),
    });

    await expect(entries.fetchEntry({ publicId: 'entry-1', locale: 'ja' })).resolves.toMatchObject({
      kind: 'ok',
      value: entry,
    });
  });

  it.each([
    [404, 'not-found'],
    [500, 'upstream-error'],
  ] as const)('classifies Rails HTTP %i as %s', async (status, kind) => {
    const { entries } = client({
      kind: 'http-error',
      status,
      response: new Response(null, { status }),
    });

    await expect(entries.fetchEntry({ publicId: 'entry-1', locale: 'ja' })).resolves.toMatchObject({
      kind,
    });
  });

  it('classifies transport failures and timeout without exposing the transport error', async () => {
    const unreachable = client({ kind: 'unreachable', errorMessage: 'private upstream details' });
    await expect(
      unreachable.entries.fetchEntry({ publicId: 'entry-1', locale: 'ja' }),
    ).resolves.toEqual({
      kind: 'unreachable',
    });

    const timeout = client({ kind: 'timeout' } as unknown as RailsClientResult);
    await expect(
      timeout.entries.fetchEntry({ publicId: 'entry-1', locale: 'ja' }),
    ).resolves.toEqual({
      kind: 'timeout',
    });
  });

  it('rejects malformed JSON and malformed entry fields', async () => {
    const malformedJson = client({ kind: 'ok', status: 200, response: new Response('{') });
    await expect(
      malformedJson.entries.fetchEntry({ publicId: 'entry-1', locale: 'ja' }),
    ).resolves.toMatchObject({
      kind: 'invalid-contract',
    });

    const wrongField = client({
      kind: 'ok',
      status: 200,
      response: Response.json({ ...entry, title: 42 }),
    });
    await expect(
      wrongField.entries.fetchEntry({ publicId: 'entry-1', locale: 'ja' }),
    ).resolves.toMatchObject({
      kind: 'invalid-contract',
    });
  });

  it('follows cursor pages and stops at has_more false', async () => {
    const second = { ...entry, public_id: 'entry-2' };
    const { entries, fetch } = client(
      {
        kind: 'ok',
        status: 200,
        response: Response.json({ data: [entry], page: { next_cursor: 'next/2', has_more: true } }),
      },
      {
        kind: 'ok',
        status: 200,
        response: Response.json({ data: [second], page: { next_cursor: null, has_more: false } }),
      },
    );

    await expect(entries.fetchAllEntries({ locale: 'ja' })).resolves.toMatchObject({
      kind: 'ok',
      value: [entry, second],
    });
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v0/entries?locale=ja', {
      headers: { Accept: 'application/json' },
    });
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/v0/entries?locale=ja&cursor=next%2F2', {
      headers: { Accept: 'application/json' },
    });
  });

  it('maps an invalid-path client result to upstream-error without its reason', async () => {
    // `invalid-path` is the transport refusing to build a request at all. It is
    // not a Rails answer, so there is no upstream status to report, and the
    // reason string is internal — the client seam is the only way to produce it.
    const { entries } = client({ kind: 'invalid-path', reason: 'path must not be empty' });

    const result = await entries.fetchEntry({ publicId: 'entry-1', locale: 'ja' });

    expect(result).toEqual({ kind: 'upstream-error' });
    expect(JSON.stringify(result)).not.toContain('path must not be empty');
  });

  it('abandons pagination at the first page that is not ok, keeping that page\u2019s outcome', async () => {
    // The first page succeeds and asks for a second, which fails. Collecting
    // entries must stop there and answer with the failing page's own result
    // rather than the partial list gathered so far.
    const { entries, fetch } = client(
      {
        kind: 'ok',
        status: 200,
        response: Response.json({ data: [entry], page: { next_cursor: 'next/2', has_more: true } }),
      },
      { kind: 'http-error', status: 503, response: new Response('down', { status: 503 }) },
    );

    const result = await entries.fetchAllEntries({ locale: 'ja' });

    expect(result).toEqual({ kind: 'upstream-error', upstreamStatus: 503 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(result)).not.toContain('entry-1');
  });

  it('rejects malformed cursor envelopes and bounds malformed infinite pagination', async () => {
    const missingCursor = client({
      kind: 'ok',
      status: 200,
      response: Response.json({ data: [entry], page: { next_cursor: null, has_more: true } }),
    });
    await expect(missingCursor.entries.fetchAllEntries({ locale: 'ja' })).resolves.toMatchObject({
      kind: 'invalid-contract',
    });

    const page = {
      kind: 'ok' as const,
      status: 200,
      response: Response.json({ data: [entry], page: { next_cursor: 'again', has_more: true } }),
    };
    const infinite = client(...Array.from({ length: 101 }, () => page));
    await expect(infinite.entries.fetchAllEntries({ locale: 'ja' })).resolves.toEqual({
      kind: 'invalid-contract',
    });
    expect(infinite.fetch).toHaveBeenCalledTimes(100);
  });

  it('does not offer arbitrary paths or origins, and rejects invalid page limits before calling Rails', async () => {
    const { entries, fetch } = client({ kind: 'ok', status: 200, response: Response.json(entry) });

    await expect(entries.fetchEntriesPage({ locale: 'ja', limit: 101 })).resolves.toEqual({
      kind: 'invalid-contract',
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
