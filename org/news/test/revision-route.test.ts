import { afterEach, describe, expect, it } from 'vitest';

import { GET as revisionJson } from '../src/pages/api/v0/revision.json';
import { GET } from '../src/pages/revision';
import { resetEnv, setEnv, setEnvShouldThrow } from './__mocks__/cloudflare-workers';

afterEach(() => {
  resetEnv();
});

describe('revision text route', () => {
  it('returns the version id as text/plain', async () => {
    setEnv({ REVISION: { id: 'abc', tag: 't', timestamp: '2024-01-01T00:00:00.000Z' } });

    const response = await GET({} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/plain\b/u);
    expect(response.headers.get('cache-control')).toContain('no-store');
    await expect(response.text()).resolves.toBe('abc\n');
  });

  it('returns unknown when the binding is missing', async () => {
    setEnv({});
    const response = await GET({} as never);
    await expect(response.text()).resolves.toBe('unknown\n');
  });

  it('returns unknown when the environment cannot be read', async () => {
    setEnvShouldThrow(true);
    const response = await GET({} as never);
    await expect(response.text()).resolves.toBe('unknown\n');
  });
});

describe('revision JSON API', () => {
  it('returns every supplied metadata field', async () => {
    setEnv({ REVISION: { id: 'abc', tag: 't', timestamp: '2024-01-01T00:00:00.000Z' } });
    const response = await revisionJson({} as never);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({
      id: 'abc',
      tag: 't',
      timestamp: '2024-01-01T00:00:00.000Z',
    });
  });

  it('returns null fields when the binding is missing', async () => {
    setEnv({});
    await expect((await revisionJson({} as never)).json()).resolves.toEqual({
      id: null,
      tag: null,
      timestamp: null,
    });
  });

  it('returns null fields when the environment cannot be read', async () => {
    setEnvShouldThrow(true);
    await expect((await revisionJson({} as never)).json()).resolves.toEqual({
      id: null,
      tag: null,
      timestamp: null,
    });
  });

  it('uses the same metadata authority as /revision', async () => {
    setEnv({
      REVISION: { id: 'version-id', tag: 'release-tag', timestamp: '2026-09-04T12:00:00.000Z' },
    });
    const text = await (await GET({} as never)).text();
    const json = await (await revisionJson({} as never)).json();
    expect(text).toBe('version-id\n');
    expect(json).toEqual({
      id: 'version-id',
      tag: 'release-tag',
      timestamp: '2026-09-04T12:00:00.000Z',
    });
  });
});
