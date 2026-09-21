// @vitest-environment node
import { HTTPException } from 'hono/http-exception';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createApexApp,
  EDGE_INPUT_MAX_BYTES,
  EDGE_RESPONSE_TIMEOUT_MS,
} from '../src/create-apex-app';

afterEach(() => vi.restoreAllMocks());

/*
 * Every case here needs something injected that the deployed app does not have:
 * a route that throws `HTTPException`, a route that throws an unexpected error,
 * or a `RATE_LIMITER` binding that refuses. None is reachable from an HTTP
 * client, which is why these stay in Vitest while the surfaces they produce
 * (404 and the security headers on an error response) moved to
 * `api/`. `app.request()` is the driver here, never the subject.
 */
describe('apex error boundary', () => {
  it('preserves deliberate HTTP errors from page routes', async () => {
    const app = createApexApp((routes) => {
      routes.get('/forbidden', () => {
        throw new HTTPException(403, { message: 'Forbidden' });
      });
    });

    const response = await app.request('/forbidden');
    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toContain('HTTP 403');
  });

  it('contains unexpected errors without leaking details', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = createApexApp((routes) => {
      routes.get('/explode', () => {
        throw new Error('secret failure details');
      });
    });

    const response = await app.request('/explode');
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toContain('HTTP 500');
    expect(body).not.toContain('secret failure details');
    expect(consoleError).toHaveBeenCalledTimes(1);
    const records = consoleError.mock.calls.map(
      ([line]) =>
        JSON.parse(String(line)) as {
          level: string;
          msg?: string;
          data: Record<string, unknown>;
        },
    );
    expect(records).toContainEqual(
      expect.objectContaining({
        level: 'error',
        msg: 'request error',
        data: expect.objectContaining({
          method: 'GET',
          route: 'other',
          status: 500,
          outcome: 'failed',
        }),
      }),
    );
    expect(JSON.stringify(records)).not.toContain('secret failure details');
    expect(JSON.stringify(records)).not.toContain('/explode');
  });

  it('stops request processing when the rate limiter rejects the caller', async () => {
    const app = createApexApp(() => undefined);
    const response = await app.request(
      '/about',
      { headers: { 'cf-connecting-ip': '192.0.2.10' } },
      { RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: false }) } },
    );
    expect(response.status).toBe(429);
  });

  it('accepts an exact byte-bound body from a stream and rejects the next byte', async () => {
    const app = createApexApp((routes) => {
      routes.post('/echo-size', async (c) =>
        c.text(String((await c.req.arrayBuffer()).byteLength)),
      );
    });
    const exact = new TextEncoder().encode('あ'.repeat(21_845) + 'a');
    expect(exact.byteLength).toBe(EDGE_INPUT_MAX_BYTES);

    const exactInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(exact);
          controller.close();
        },
      }),
      duplex: 'half' as const,
    };
    const exactRequest = new Request('http://localhost/echo-size', exactInit);
    const exactResponse = await app.request(exactRequest);
    expect(exactResponse.status).toBe(200);
    await expect(exactResponse.text()).resolves.toBe(String(EDGE_INPUT_MAX_BYTES));

    const oversizedInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(EDGE_INPUT_MAX_BYTES + 1));
          controller.close();
        },
      }),
      duplex: 'half' as const,
    };
    const oversizedRequest = new Request('http://localhost/echo-size', oversizedInit);
    const oversizedResponse = await app.request(oversizedRequest);
    expect(oversizedResponse.status).toBe(413);
    expect(oversizedResponse.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects unsupported content encoding before the route reads the body', async () => {
    const route = vi.fn(() => new Response('should not run'));
    const app = createApexApp((routes) => {
      routes.post('/encoded', route);
    });
    const request = new Request('http://localhost/encoded', {
      method: 'POST',
      headers: {
        'Content-Encoding': 'gzip',
        'Content-Type': 'application/octet-stream',
      },
      body: '{}',
    });

    const response = await app.request(request);
    expect(response.status).toBe(415);
    expect(route).not.toHaveBeenCalled();
  });

  it('returns a 503 when an application route exceeds the three-second budget', async () => {
    vi.useFakeTimers();
    try {
      const app = createApexApp((routes) => {
        routes.get('/hang', () => new Promise<Response>(() => {}));
      });
      const responsePromise = app.request('/hang');

      await vi.advanceTimersByTimeAsync(EDGE_RESPONSE_TIMEOUT_MS);
      const response = await responsePromise;

      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    } finally {
      vi.useRealTimers();
    }
  });
});
