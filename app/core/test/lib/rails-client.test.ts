import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn<() => { env: Record<string, unknown> }>().mockReturnValue({
    env: {},
  }),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getRailsClient } from '../../src/lib/rails-client';

describe('app/core rails client', () => {
  afterEach(() => {
    vi.mocked(getCloudflareContext)
      .mockReset()
      .mockReturnValue({ env: {} } as unknown as ReturnType<typeof getCloudflareContext>);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('uses the VPC binding when present', async () => {
    const fetchMock = vi.fn<(input: string) => Promise<Response>>(() =>
      Promise.resolve(new Response('ok', { status: 200 })),
    );
    vi.mocked(getCloudflareContext).mockReturnValue({
      env: { UMAXICA_APPS_EDGE_CF_WORKERS_VPC: { fetch: fetchMock } },
    } as unknown as ReturnType<typeof getCloudflareContext>);

    const client = getRailsClient();
    expect(client).not.toBeNull();

    await client?.fetch('/edge/v0/health');

    const [requestUrl] = fetchMock.mock.calls[0] as [string];
    expect(new URL(requestUrl).host).toBe('core.app.localhost');
  });

  it('falls back to a dev-only direct fetcher in development when no binding exists', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const fetchSpy = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response('ok', { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const client = getRailsClient();
    expect(client).not.toBeNull();

    await client?.fetch('/edge/v0/health');

    const [requestUrl] = fetchSpy.mock.calls[0] as [string];
    const url = new URL(requestUrl);
    expect(url.protocol).toBe('http:');
    expect(url.port).toBe('3000');
    expect(url.hostname).toBe('core.app.localhost');
  });

  it('fails closed to null outside development when no binding exists', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const client = getRailsClient();

    expect(client).toBeNull();
  });
});
