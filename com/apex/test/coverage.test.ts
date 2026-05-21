import { describe, it, expect, vi } from 'vite-plus/test';
// @ts-ignore
import app from '../src/index';

describe('com/apex/src/index.tsx coverage', () => {
  it('returns 404 text when ASSETS is missing in notFound', async () => {
    const res = await app.request('/nonexistent-404', {}, {});
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).toBe('Not Found');
  });

  it('handles health check error and hits onError catch block', async () => {
    const isoSpy = vi.spyOn(Date.prototype, 'toISOString').mockImplementation(() => {
      throw new Error('ISO String error');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await app.request('/health', {}, {});
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toBe('Bad Request');

    isoSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('handles health check error and hits onError with ASSETS', async () => {
    const isoSpy = vi.spyOn(Date.prototype, 'toISOString').mockImplementation(() => {
      throw new Error('ISO String error');
    });

    const env = {
      ASSETS: {
        fetch: async (_request: Request) => {
          return new Response('Mock 400 Page', { status: 200 });
        },
      },
    };

    const res = await app.request('/health', {}, env);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toBe('Mock 400 Page');

    isoSpy.mockRestore();
  });

  it('handles notFound when assetRes.status is not 404', async () => {
    const env = {
      ASSETS: {
        fetch: async (_request: Request) => {
          const url = new URL(_request.url);
          if (url.pathname === '/found-asset') {
            return new Response('Asset found', { status: 200 });
          }
          return new Response('Not Found', { status: 404 });
        },
      },
    };

    const res = await app.request('/found-asset', {}, env);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('Asset found');
  });
});
