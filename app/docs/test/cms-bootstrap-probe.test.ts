import type { APIContext, APIRoute } from 'astro';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../src/pages/cms-bootstrap-probe.json';
import { resetEnv, setEnv } from './__mocks__/cloudflare-workers';

const context = {
  request: new Request('https://example.test/cms-bootstrap-probe.json'),
  url: new URL('https://example.test/cms-bootstrap-probe.json'),
} as APIContext;

function invoke(get: APIRoute): Promise<Response> | Response {
  return get(context);
}

afterEach(() => {
  resetEnv();
  vi.restoreAllMocks();
});

describe('cms bootstrap probe', () => {
  it('answers 404 outside the cms_bootstrap tier', async () => {
    setEnv({ EDGE_ENV: 'local' });
    const response = await invoke(GET);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ status: 'not_found' });
  });

  it('answers 500 when the VPC binding is missing', async () => {
    setEnv({ EDGE_ENV: 'cms_bootstrap' });
    const response = await invoke(GET);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ status: 'configuration_error' });
  });

  it('answers 502 when Rails is unreachable', async () => {
    setEnv({
      EDGE_ENV: 'cms_bootstrap',
      UMAXICA_APPS_EDGE_CF_WORKERS_VPC: {
        fetch: () => Promise.reject(new Error('down')),
      },
    });
    const response = await invoke(GET);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ status: 'upstream_error' });
  });

  it('rejects a Content-Length over the body cap', async () => {
    setEnv({
      EDGE_ENV: 'cms_bootstrap',
      UMAXICA_APPS_EDGE_CF_WORKERS_VPC: {
        fetch: () =>
          Promise.resolve(
            new Response('{}', {
              status: 200,
              headers: { 'content-length': String(1024 * 1024 + 1) },
            }),
          ),
      },
    });
    const response = await invoke(GET);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ status: 'invalid_contract' });
  });

  it('rejects a body that exceeds the cap without Content-Length', async () => {
    setEnv({
      EDGE_ENV: 'cms_bootstrap',
      UMAXICA_APPS_EDGE_CF_WORKERS_VPC: {
        fetch: () =>
          Promise.resolve(new Response(new Uint8Array(1024 * 1024 + 1), { status: 200 })),
      },
    });
    const response = await invoke(GET);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ status: 'invalid_contract' });
  });

  it('rejects malformed JSON', async () => {
    setEnv({
      EDGE_ENV: 'cms_bootstrap',
      UMAXICA_APPS_EDGE_CF_WORKERS_VPC: {
        fetch: () => Promise.resolve(new Response('{', { status: 200 })),
      },
    });
    const response = await invoke(GET);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ status: 'invalid_contract' });
  });

  it('rejects a JSON body that fails the entries contract', async () => {
    setEnv({
      EDGE_ENV: 'cms_bootstrap',
      UMAXICA_APPS_EDGE_CF_WORKERS_VPC: {
        fetch: () => Promise.resolve(Response.json({ data: [{ slug: '' }] })),
      },
    });
    const response = await invoke(GET);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ status: 'invalid_contract' });
  });

  it('reports the first slug on a valid payload', async () => {
    setEnv({
      EDGE_ENV: 'cms_bootstrap',
      UMAXICA_APPS_EDGE_CF_WORKERS_VPC: {
        fetch: () => Promise.resolve(Response.json({ data: [{ slug: 'guide' }], page: { n: 1 } })),
      },
    });
    const response = await invoke(GET);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      count: 1,
      first_slug: 'guide',
    });
  });

  it('allows an empty data array', async () => {
    setEnv({
      EDGE_ENV: 'cms_bootstrap',
      UMAXICA_APPS_EDGE_CF_WORKERS_VPC: {
        fetch: () => Promise.resolve(Response.json({ data: [], page: {} })),
      },
    });
    const response = await invoke(GET);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      count: 0,
      first_slug: null,
    });
  });
});
