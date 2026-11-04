import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ApexEnv } from '../src/create-apex-app';
import { apexStructuredLogger } from '../src/structured-logger';

afterEach(() => vi.restoreAllMocks());

/*
 * `app.request()` here is the DRIVER, not the subject. The assertion is on the
 * `console.log` / `console.warn` / `console.error` lines the middleware emits —
 * those are what `observability.logs.enabled` in wrangler.jsonc collects into
 * Workers Logs, and no HTTP client can see them. The throwaway `new Hono()` is
 * the only way to reach every severity, since the real app emits a subset.
 */

describe('apex structured logger', () => {
  it('emits every supported severity as structured JSON', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = new Hono<ApexEnv>();
    app.use(requestId({ limitLength: 0 }));
    app.use(apexStructuredLogger);
    app.get('/levels', (c) => {
      const logger = c.get('logger');
      logger.warn({ outcome: 'degraded' });
      logger.error({ outcome: 'failed' }, 'request error');
      logger.debug({ outcome: 'trace' }, 'request end');
      return c.text('ok');
    });

    const response = await app.request('/levels', {
      headers: { 'x-request-id': 'external-secret-marker' },
    });
    expect(response.status).toBe(200);
    const responseId = response.headers.get('x-request-id');
    expect(responseId).toMatch(/^[0-9a-f-]{36}$/iu);
    expect(responseId).not.toBe('external-secret-marker');

    type RecordLine = { level: string; msg?: string; data: Record<string, unknown> };
    const records = [...log.mock.calls, ...warn.mock.calls, ...error.mock.calls].map(
      ([line]) => JSON.parse(String(line)) as RecordLine,
    );
    expect(records).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        data: expect.objectContaining({
          service: 'apex',
          method: 'GET',
          route: 'other',
          outcome: 'degraded',
          request_id: expect.any(String),
        }),
      }),
    );
    expect(records).toContainEqual(
      expect.objectContaining({
        level: 'error',
        msg: 'request error',
        data: expect.objectContaining({ outcome: 'failed' }),
      }),
    );
    expect(records).toContainEqual(
      expect.objectContaining({
        level: 'debug',
        msg: 'request end',
        data: expect.objectContaining({ outcome: 'trace' }),
      }),
    );
    const output = JSON.stringify(records);
    expect(output).not.toContain('external-secret-marker');
    expect(output).not.toContain('/levels');
  });
});

describe('apex structured logger field normalization', () => {
  type RecordLine = { level: string; msg?: string; data: Record<string, unknown> };

  function collectRecords(
    log: ReturnType<typeof vi.spyOn>,
    warn: ReturnType<typeof vi.spyOn>,
    error: ReturnType<typeof vi.spyOn>,
  ): RecordLine[] {
    return [...log.mock.calls, ...warn.mock.calls, ...error.mock.calls].map(
      ([line]) => JSON.parse(String(line)) as RecordLine,
    );
  }

  it('maps unrecognized HTTP methods to OTHER without leaking the raw verb', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = new Hono<ApexEnv>();
    app.use(requestId({ limitLength: 0 }));
    app.use(apexStructuredLogger);
    app.all('/', (c) => c.text('ok'));

    const response = await app.request('/', { method: 'PROPFIND' });
    expect(response.status).toBe(200);

    const records = collectRecords(log, warn, error);
    expect(records.some((r) => r.data['method'] === 'OTHER')).toBe(true);
    expect(JSON.stringify(records)).not.toContain('PROPFIND');
  });

  it('maps unrecognized EDGE_ENV values to unknown while keeping known values closed', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = new Hono<ApexEnv>();
    app.use(requestId({ limitLength: 0 }));
    app.use(apexStructuredLogger);
    app.get('/about', (c) => c.text('ok'));

    const response = await app.request('/about', undefined, {
      EDGE_ENV: 'staging-secret-label',
    });
    expect(response.status).toBe(200);

    const records = collectRecords(log, warn, error);
    expect(records.some((r) => r.data['environment'] === 'unknown')).toBe(true);
    expect(JSON.stringify(records)).not.toContain('staging-secret-label');
  });

  it('classifies the document root as route root', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = new Hono<ApexEnv>();
    app.use(requestId({ limitLength: 0 }));
    app.use(apexStructuredLogger);
    app.get('/', (c) => c.text('ok'));

    const response = await app.request('/');
    expect(response.status).toBe(200);

    const records = collectRecords(log, warn, error);
    expect(records.some((r) => r.data['route'] === 'root')).toBe(true);
  });
});
