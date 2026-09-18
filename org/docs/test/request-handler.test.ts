import { afterEach, describe, expect, it, vi } from 'vitest';

import { PUBLISHING_STATUS_HEADER } from '../src/lib/publishing-status';
import { EDGE_INPUT_MAX_BYTES } from '../src/lib/request-boundary';
import { EDGE_RESPONSE_TIMEOUT_MS } from '../src/lib/response-timeout';
import { handleRequest } from '../src/request-handler';
import { resetEnv, setEnv } from './__mocks__/cloudflare-workers';

/*
 * The request boundary: what happens around the router on every request.
 *
 * `src/server.ts` supplies TanStack's fetch handler and cannot be imported here
 * — `@tanstack/react-start/server-entry` resolves only in the Worker build — so
 * the handler is passed in (`app.request()`-style driving, allowed because a
 * rate limiter that refuses and a router that answers a Publishing failure are
 * not states an HTTP client can produce on demand).
 */
afterEach(() => {
  resetEnv();
  vi.restoreAllMocks();
});

const ok = () => Promise.resolve(new Response('<html></html>', { status: 200 }));
const refusing = () => ({ limit: vi.fn().mockResolvedValue({ success: false }) });

describe('request handler', () => {
  it('adds the security headers to whatever the router returns, including a 404', async () => {
    const response = await handleRequest(new Request('http://localhost/ja/'), ok, true);
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");

    const notFound = () => Promise.resolve(new Response('<html></html>', { status: 404 }));
    const missing = await handleRequest(new Request('http://localhost/nope'), notFound, true);
    expect(missing.status).toBe(404);
    expect(missing.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('rejects an unknown Host before the limiter or router can run', async () => {
    const limiter = { limit: vi.fn().mockResolvedValue({ success: true }) };
    setEnv({ EDGE_ENV: 'production', RATE_LIMITER: limiter });
    const router = vi.fn(ok);

    const response = await handleRequest(
      new Request('https://attacker.example/ja/entries/'),
      router,
      true,
    );

    expect(response.status).toBe(421);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(limiter.limit).not.toHaveBeenCalled();
    expect(router).not.toHaveBeenCalled();
  });

  it('rejects an oversized application body before the router', async () => {
    const router = vi.fn(ok);
    const response = await handleRequest(
      new Request('http://localhost/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: new Uint8Array(EDGE_INPUT_MAX_BYTES + 1),
      }),
      router,
      true,
    );

    expect(response.status).toBe(413);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(router).not.toHaveBeenCalled();
  });

  it('returns a hardened 503 when application response generation exceeds three seconds', async () => {
    vi.useFakeTimers();
    try {
      const router = vi.fn(() => new Promise<Response>(() => {}));
      const responsePromise = handleRequest(new Request('http://localhost/'), router, true);

      await vi.advanceTimersByTimeAsync(EDGE_RESPONSE_TIMEOUT_MS);
      const response = await responsePromise;

      expect(response.status).toBe(503);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    } finally {
      vi.useRealTimers();
    }
  });

  it('answers 429 without running the router, and hardens the 429 too', async () => {
    const limiter = refusing();
    setEnv({ RATE_LIMITER: limiter });
    const router = vi.fn(ok);

    const response = await handleRequest(new Request('http://localhost/ja/entries/'), router, true);

    expect(response.status).toBe(429);
    expect(router).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('never meters the three constant probes, and does meter the Rails-backed ones', async () => {
    const limiter = refusing();
    setEnv({ RATE_LIMITER: limiter });

    for (const path of ['/health/startups', '/health/livenesses', '/api/v0/health.json']) {
      const response = await handleRequest(new Request(`http://localhost${path}`), ok, true);
      expect(response.status, path).toBe(200);
    }
    expect(limiter.limit).not.toHaveBeenCalled();

    for (const path of ['/health', '/health/readinesses', '/revision']) {
      const response = await handleRequest(new Request(`http://localhost${path}`), ok, true);
      expect(response.status, path).toBe(429);
    }
  });

  it('runs the router when the limiter allows the request', async () => {
    setEnv({ RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) } });
    const router = vi.fn(ok);

    const response = await handleRequest(new Request('http://localhost/'), router, true);

    expect(router).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
  });

  it('generates one request ID, ignores the incoming ID, and logs the final status safely', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    setEnv({
      EDGE_ENV: 'test',
      RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
    });
    const router = vi.fn((forwarded: Request) => {
      expect(forwarded.headers.get('X-Request-ID')).toMatch(/^[0-9a-f-]{36}$/iu);
      return ok();
    });

    const response = await handleRequest(
      new Request('http://localhost/ja/entries/?token=SECRET_QUERY', {
        headers: { 'X-Request-ID': 'external-secret-marker' },
      }),
      router,
      true,
    );

    const requestId = response.headers.get('X-Request-ID');
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/iu);
    expect(requestId).not.toBe('external-secret-marker');
    const lines = log.mock.calls.map(
      ([line]) => JSON.parse(String(line)) as Record<string, unknown>,
    );
    expect(lines).toContainEqual(
      expect.objectContaining({
        msg: 'edge_request',
        data: expect.objectContaining({
          service: 'public',
          environment: 'test',
          request_id: requestId,
          method: 'GET',
          route: 'publishing',
          status: 200,
          outcome: 'completed',
        }),
      }),
    );
    expect(JSON.stringify(lines)).not.toContain('external-secret-marker');
    expect(JSON.stringify(lines)).not.toContain('SECRET_QUERY');
  });

  it('turns an unexpected router exception into a fixed 500', async () => {
    const router = vi.fn(() => {
      throw new Error('SECRET_EXCEPTION_MARKER');
    });

    const response = await handleRequest(new Request('http://localhost/'), router, true);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Internal Server Error\n');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('moves a Publishing failure status onto the status line and never leaks the header', async () => {
    for (const status of [502, 503, 504]) {
      const router = () =>
        Promise.resolve(
          new Response('<html></html>', {
            status: 200,
            headers: { [PUBLISHING_STATUS_HEADER]: String(status), 'Cache-Control': 'no-store' },
          }),
        );
      const response = await handleRequest(
        new Request('http://localhost/ja/entries/'),
        router,
        true,
      );
      expect(response.status).toBe(status);
      expect(response.headers.has(PUBLISHING_STATUS_HEADER)).toBe(false);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    }
  });

  it('names one nonce per production request and none in development', async () => {
    const nonceOf = (response: Response) =>
      /'nonce-([^']+)'/u.exec(response.headers.get('Content-Security-Policy') ?? '')?.[1];

    const first = await handleRequest(new Request('http://localhost/'), ok, true);
    const second = await handleRequest(new Request('http://localhost/'), ok, true);
    expect(nonceOf(first)).toBeDefined();
    expect(nonceOf(first)).not.toBe(nonceOf(second));

    const development = await handleRequest(new Request('http://localhost/'), ok, false);
    expect(development.headers.get('Content-Security-Policy')).not.toContain('nonce-');
    expect(development.headers.get('Content-Security-Policy')).toContain("'unsafe-eval'");
  });

  it('maps an aborted body boundary to the generation-timeout response', async () => {
    const boundary = await import('../src/lib/request-boundary');
    vi.spyOn(boundary, 'limitRequestBody').mockResolvedValue({ kind: 'aborted' });
    const router = vi.fn(ok);
    const response = await handleRequest(new Request('http://localhost/ja/'), router, true);
    expect(response.status).toBe(503);
    expect(router).not.toHaveBeenCalled();
  });
});
