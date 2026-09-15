import { HTTPException } from 'hono/http-exception';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApexApp } from '../src/create-apex-app';

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
});
