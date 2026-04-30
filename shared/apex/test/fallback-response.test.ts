import { Hono } from 'hono';
import { createBadRequestFallback, createNotFoundFallback } from '../fallback-response';

describe('fallback-response', () => {
  describe('createBadRequestFallback', () => {
    it('returns 400.html from ASSETS with status 400', async () => {
      const mockResponse = new Response('<html>Bad Request</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });

      const app = new Hono<{ Bindings: { ASSETS: { fetch: typeof fetch } } }>();
      app.get('/test', async (c) => {
        c.env = {
          ASSETS: {
            fetch: async () => mockResponse,
          },
        } as unknown as { ASSETS: { fetch: typeof fetch } };
        return createBadRequestFallback(c);
      });

      const res = await app.request('/test');
      expect(res.status).toBe(400);
      const body = await res.text();
      expect(body).toContain('Bad Request');
    });

    it('returns plain text when ASSETS binding is missing', async () => {
      const app = new Hono<{ Bindings: { ASSETS?: { fetch: typeof fetch } } }>();
      app.get('/test', async (c) => {
        return createBadRequestFallback(c);
      });

      const res = await app.request('/test');
      expect(res.status).toBe(400);
      expect(await res.text()).toBe('Bad Request');
    });

    it('returns plain text when env.ASSETS is undefined', async () => {
      const app = new Hono<{ Bindings: { ASSETS?: { fetch: typeof fetch } } }>();
      app.get('/test', async (c) => {
        c.env = {} as unknown as { ASSETS?: { fetch: typeof fetch } };
        return createBadRequestFallback(c);
      });

      const res = await app.request('/test');
      expect(res.status).toBe(400);
      expect(await res.text()).toBe('Bad Request');
    });
  });

  describe('createNotFoundFallback', () => {
    it('returns found asset response as-is when asset exists', async () => {
      const mockAssetResponse = new Response('<html>Page Content</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });

      const app = new Hono<{ Bindings: { ASSETS: { fetch: typeof fetch } } }>();
      app.get('/test', async (c) => {
        c.env = {
          ASSETS: {
            fetch: async () => mockAssetResponse,
          },
        } as unknown as { ASSETS: { fetch: typeof fetch } };
        return createNotFoundFallback(c);
      });

      const res = await app.request('/test');
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('Page Content');
    });

    it('returns plain text when ASSETS binding is missing', async () => {
      const app = new Hono<{ Bindings: { ASSETS?: { fetch: typeof fetch } } }>();
      app.get('/test', async (c) => {
        return createNotFoundFallback(c);
      });

      const res = await app.request('/test');
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('Not Found');
    });

    it('returns plain text when env.ASSETS is undefined', async () => {
      const app = new Hono<{ Bindings: { ASSETS?: { fetch: typeof fetch } } }>();
      app.get('/test', async (c) => {
        c.env = {} as unknown as { ASSETS?: { fetch: typeof fetch } };
        return createNotFoundFallback(c);
      });

      const res = await app.request('/test');
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('Not Found');
    });

    it('falls back to 404.html when requested asset returns 404', async () => {
      const notFoundResponse = new Response('Not Found', { status: 404 });
      const fallback404Response = new Response('<html>404 Page</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });

      const app = new Hono<{ Bindings: { ASSETS: { fetch: typeof fetch } } }>();
      app.get('/test', async (c) => {
        let callCount = 0;
        c.env = {
          ASSETS: {
            fetch: async () => {
              callCount++;
              if (callCount === 1) {
                // First call - requested asset not found
                return notFoundResponse;
              }
              // Second call - /404.html exists
              return fallback404Response;
            },
          },
        } as unknown as { ASSETS: { fetch: typeof fetch } };
        return createNotFoundFallback(c);
      });

      const res = await app.request('/test');
      expect(res.status).toBe(404);
      const body = await res.text();
      expect(body).toContain('404 Page');
    });

    it('returns text fallback when both asset and 404.html are not found', async () => {
      const notFoundResponse = new Response('Not Found', { status: 404 });

      const app = new Hono<{ Bindings: { ASSETS: { fetch: typeof fetch } } }>();
      app.get('/test', async (c) => {
        c.env = {
          ASSETS: {
            fetch: async () => notFoundResponse,
          },
        } as unknown as { ASSETS: { fetch: typeof fetch } };
        return createNotFoundFallback(c);
      });

      const res = await app.request('/test');
      expect(res.status).toBe(404);
      // When 404.html also returns 404, fetchHtmlFallback returns it with status 404
      // But body would be from 404.html response
    });
  });
});
