import { vi, afterEach } from 'vite-plus/test';
import { createHealthRoute } from '../../routes/health';

describe('shared/apex/routes/health.ts', () => {
  describe('createHealthRoute', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

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

    it('renders revision as a single field', async () => {
      const route = createHealthRoute();
      const res = await route.request(
        '/health',
        {},
        {
          BRAND_NAME: 'UMAXICA',
          REVISION: {
            id: 'df8ea12b-8219-4acd-a00e-b7ddb93568fb',
            tag: '',
            timestamp: '2026-04-30T08:04:14.812558Z',
          },
        },
      );
      const body = await res.text();

      expect(res.status).toBe(200);
      expect(body).toContain('<strong>Revision:</strong>');
      expect(body).toContain('df8ea12b-8219-4acd-a00e-b7ddb93568fb');
      expect(body).toContain('2026-04-30T08:04:14.812558Z');
      expect(body).not.toContain('Revision ID');
      expect(body).not.toContain('Revision Tag');
      expect(body).not.toContain('Revision Time');
    });

    it('tolerates incomplete revision metadata', async () => {
      const route = createHealthRoute();
      const res = await route.request('/health', {}, {
        BRAND_NAME: 'UMAXICA',
        REVISION: {
          id: 'df8ea12b-8219-4acd-a00e-b7ddb93568fb',
        },
      } as unknown as { BRAND_NAME: string });
      const body = await res.text();

      expect(res.status).toBe(200);
      expect(body).toContain('<strong>Status:</strong> OK');
      expect(body).toContain('df8ea12b-8219-4acd-a00e-b7ddb93568fb');
    });

    it('ignores RAILS_API_URL and does not call external services', async () => {
      const fetchMock = vi.fn<typeof fetch>();
      vi.stubGlobal('fetch', fetchMock);

      const route = createHealthRoute();
      const res = await route.request('/health', {}, { RAILS_API_URL: 'http://localhost:3000' });
      const body = await res.text();

      expect(res.status).toBe(200);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(body).toContain('<strong>Status:</strong> OK');
      expect(body).not.toContain('Rails Backend');
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
