import { vi, afterEach } from 'vite-plus/test';
import { createHealthRoute } from '../../routes/health';

describe('shared/apex/routes/health.ts', () => {
  describe('createHealthRoute', () => {
    it('creates health route and responds to /health', async () => {
      const route = createHealthRoute();
      const res = await route.request('/health', {}, { BRAND_NAME: 'UMAXICA' });

      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('UMAXICA');
      expect(body).toContain('<strong>Status:</strong> OK');
    });

    it('uses default BRAND_NAME when not provided', async () => {
      const route = createHealthRoute();
      const res = await route.request('/health', {}, {});

      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('UMAXICA');
    });

    it('includes security headers', async () => {
      const route = createHealthRoute();
      const res = await route.request('/health', {}, { BRAND_NAME: 'UMAXICA' });

      expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
      expect(res.headers.get('content-type')).toContain('text/html');
    });

    it('includes timestamp in response', async () => {
      const route = createHealthRoute();
      const res = await route.request('/health', {}, { BRAND_NAME: 'UMAXICA' });

      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('Timestamp:');
    });

    describe('Rails Backend Integration', () => {
      afterEach(() => {
        vi.unstubAllGlobals();
      });

      it('shows "not configured" when RAILS_API_URL is missing', async () => {
        const route = createHealthRoute();
        const res = await route.request('/health', {}, {});
        const body = await res.text();

        expect(body).toContain('Rails Backend');
        expect(body).toContain('RAILS_API_URL not configured');
      });

      it('fetches Rails health and displays JSON on success', async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
          new Response(JSON.stringify({ status: 'ok', uptime: 100 }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const route = createHealthRoute();
        const res = await route.request('/health', {}, { RAILS_API_URL: 'http://localhost:3000' });
        const body = await res.text();

        expect(fetchMock).toHaveBeenCalledWith(
          'http://localhost:3000/edge/v0/health',
          expect.anything(),
        );
        expect(body).toContain('Status:</strong> OK (HTTP 200)');
        expect(body).toContain('&quot;status&quot;: &quot;ok&quot;');
        expect(body).toContain('&quot;uptime&quot;: 100');
      });

      it('displays error status and raw body when Rails returns non-2xx', async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
          new Response('Service Unavailable', {
            status: 503,
          }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const route = createHealthRoute();
        const res = await route.request('/health', {}, { RAILS_API_URL: 'http://localhost:3000' });
        const body = await res.text();

        expect(res.status).toBe(503);
        expect(body).toContain('Status:</strong> Error (HTTP 503)');
        expect(body).toContain('Service Unavailable');
        expect(body).toContain('<strong>Status:</strong> Error');
      });

      it('displays unreachable error message when fetch throws', async () => {
        const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('Network failure'));
        vi.stubGlobal('fetch', fetchMock);

        const route = createHealthRoute();
        const res = await route.request('/health', {}, { RAILS_API_URL: 'http://localhost:3000' });
        const body = await res.text();

        expect(res.status).toBe(503);
        expect(body).toContain('Status:</strong> Unreachable');
        expect(body).toContain('Error: <code>Network failure</code>');
      });

      it('displays unreachable error message when fetch throws a non-Error object', async () => {
        const fetchMock = vi.fn<typeof fetch>().mockRejectedValue('String error');
        vi.stubGlobal('fetch', fetchMock);

        const route = createHealthRoute();
        const res = await route.request('/health', {}, { RAILS_API_URL: 'http://localhost:3000' });
        const body = await res.text();

        expect(res.status).toBe(503);
        expect(body).toContain('Status:</strong> Unreachable');
        expect(body).toContain('Error: <code>String error</code>');
      });

      it('escapes Rails response body and fetch errors before rendering', async () => {
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
          new Response('<script>alert("xss")</script>', {
            status: 503,
          }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const route = createHealthRoute();
        const res = await route.request('/health', {}, { RAILS_API_URL: 'http://localhost:3000' });
        const body = await res.text();

        expect(res.status).toBe(503);
        expect(body).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        expect(body).not.toContain('<script>alert("xss")</script>');
      });
    });

    it('errors propagate to parent app onError', async () => {
      const { Hono } = await import('hono');

      const parentApp = new Hono<{ Bindings: { BRAND_NAME?: string } }>();
      const mockParentOnError = vi
        .fn<() => Response>()
        .mockReturnValue(new Response('caught', { status: 500 }));
      parentApp.onError(mockParentOnError);

      const route = createHealthRoute();
      // Add a route that throws to verify error propagation via the re-throw pattern
      route.get('/test-throw', () => {
        throw new Error('propagation test');
      });
      parentApp.route('/', route);

      const res = await parentApp.request('/test-throw', {}, {});
      expect(mockParentOnError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'propagation test' }),
        expect.anything(),
      );
      expect(res.status).toBe(500);
    });
  });

  describe('handleHealthError', () => {
    it('is exported as function', async () => {
      const { handleHealthError } = await import('../../routes/health');
      expect(typeof handleHealthError).toBe('function');
    });
  });
});
