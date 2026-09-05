import { afterEach, describe, expect, it, vi } from 'vitest';

import { onRequest } from '../src/middleware';
import { resetEnv, setEnv } from './__mocks__/cloudflare-workers';

/*
 * `MiddlewareHandler` is typed `Response | void`. Every assertion below needs the
 * narrower type, and this is spelled as a runtime check rather than a cast on
 * purpose: answering with `void` — handing the response back unstamped, or
 * letting a limited request through — is exactly the regression these tests
 * exist to catch, and a cast would let it through silently.
 */
function asResponse(value: Response | void): Response {
  if (!(value instanceof Response)) {
    throw new Error('middleware answered with void instead of a Response');
  }
  return value;
}

function context(url: string, { isPrerendered = false } = {}) {
  return {
    url: new URL(url),
    request: new Request(url),
    isPrerendered,
    rewrite: vi.fn(),
  };
}

afterEach(() => {
  resetEnv();
});

describe('request middleware', () => {
  it('rewrites the trailing-slash offline URL onto /offline', async () => {
    const rewritten = new Response('offline-doc', { status: 200 });
    const rewrite = vi.fn(() => rewritten);
    const next = vi.fn();

    const response = await onRequest(
      { ...context('https://example.test/offline/'), rewrite } as never,
      next,
    );

    expect(rewrite).toHaveBeenCalledWith('/offline');
    expect(next).not.toHaveBeenCalled();
    expect(response).toBe(rewritten);
  });

  it('forces no-store text/plain on health probes', async () => {
    const next = vi.fn(
      async () =>
        new Response('ok\n', {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        }),
    );

    const response = await onRequest(
      {
        url: new URL('https://example.test/health/livenesses'),
        rewrite: vi.fn(),
      } as never,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    if (!(response instanceof Response)) throw new Error('middleware did not return a response');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('forces no-store JSON on the Edge self-health API', async () => {
    const next = vi.fn(
      async () =>
        new Response('{"status":"pass"}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    const response = await onRequest(
      {
        url: new URL('https://example.test/api/v0/health.json'),
        rewrite: vi.fn(),
      } as never,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    if (!(response instanceof Response)) throw new Error('middleware did not return a response');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('forces no-store text/plain on the revision document', async () => {
    // Deployment metadata, not a probe: it is metered like any other on-demand
    // route, and it still gets the machine-endpoint header treatment so a cache
    // or a crawler cannot keep a build id around.
    const next = vi.fn(
      async () =>
        new Response('abc-123\n', { status: 200, headers: { 'Cache-Control': 'public' } }),
    );

    const response = asResponse(
      await onRequest(context('https://example.test/revision') as never, next),
    );

    expect(next).toHaveBeenCalledOnce();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('stamps security headers on every other response', async () => {
    const next = vi.fn(async () => new Response('ok', { status: 200 }));

    const response = asResponse(
      await onRequest(context('https://example.test/ja/') as never, next),
    );

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
  });

  // adr/010: this unit has no `worker.ts`, so the middleware is its first touch
  // and the only place a limited request can be turned away.
  describe('first-touch rate limiting', () => {
    it('answers the 429 document without invoking the route', async () => {
      const limit = vi.fn().mockResolvedValue({ success: false });
      setEnv({ RATE_LIMITER: { limit } });
      const next = vi.fn(async () => new Response('ok', { status: 200 }));

      const response = asResponse(await onRequest(context('https://example.test/') as never, next));

      expect(response.status).toBe(429);
      expect(next).not.toHaveBeenCalled();
      expect(limit).toHaveBeenCalledOnce();
    });

    // A 429 is a full HTML document an attacker can elicit on demand, so it must
    // not be the one response on this origin served without a CSP.
    it('stamps the security headers on the 429 too', async () => {
      setEnv({ RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: false }) } });
      const next = vi.fn();

      const response = asResponse(await onRequest(context('https://example.test/') as never, next));

      expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('lets an allowed request reach the route', async () => {
      const limit = vi.fn().mockResolvedValue({ success: true });
      setEnv({ RATE_LIMITER: { limit } });
      const next = vi.fn(async () => new Response('ok', { status: 200 }));

      const response = asResponse(await onRequest(context('https://example.test/') as never, next));

      expect(response.status).toBe(200);
      expect(next).toHaveBeenCalledOnce();
      expect(limit).toHaveBeenCalledOnce();
    });

    it('passes the request through when no limiter is bound', async () => {
      const next = vi.fn(async () => new Response('ok', { status: 200 }));

      const response = asResponse(await onRequest(context('https://example.test/') as never, next));

      expect(response.status).toBe(200);
      expect(next).toHaveBeenCalledOnce();
    });

    // Prerendered routes run this middleware at BUILD time, where there is no
    // limiter bound and no client to limit. Spending a limiter call there would
    // charge the build against a real budget.
    it('does not call the limiter while prerendering', async () => {
      const limit = vi.fn().mockResolvedValue({ success: false });
      setEnv({ RATE_LIMITER: { limit } });
      const next = vi.fn(async () => new Response('ok', { status: 200 }));

      const response = asResponse(
        await onRequest(
          context('https://example.test/ja/', { isPrerendered: true }) as never,
          next,
        ),
      );

      expect(limit).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(next).toHaveBeenCalledOnce();
    });
  });
});
