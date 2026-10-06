import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApexApp } from '../src/create-apex-app';
import {
  APEX_PREVIEW_HOST,
  APEX_PUBLIC_HOST,
  APEX_WORKER_NAME,
  isAllowedApexHost,
} from '../src/host-policy';

afterEach(() => vi.restoreAllMocks());

describe('apex Host policy', () => {
  it('accepts this unit’s configured public and preview hosts', () => {
    expect(isAllowedApexHost(APEX_PUBLIC_HOST, { allowLocalhost: false })).toBe(true);
    expect(isAllowedApexHost(APEX_PUBLIC_HOST.toUpperCase(), { allowLocalhost: false })).toBe(true);
    expect(isAllowedApexHost(APEX_PREVIEW_HOST, { allowLocalhost: false })).toBe(true);
    expect(
      isAllowedApexHost(`version-${APEX_WORKER_NAME}.account.workers.dev`, {
        allowLocalhost: false,
      }),
    ).toBe(true);
  });

  it('allows local hosts only when the deployment permits them', () => {
    for (const host of ['localhost', 'app.localhost', '127.0.0.1', '[::1]']) {
      expect(isAllowedApexHost(host, { allowLocalhost: true })).toBe(true);
      expect(isAllowedApexHost(host, { allowLocalhost: false })).toBe(false);
    }
  });

  it('rejects sibling, malformed, and arbitrary hosts', () => {
    for (const host of [
      'umaxica.example',
      `${APEX_PUBLIC_HOST}.evil.example`,
      `umaxica-apps-edge-other-apex.account.workers.dev`,
      `umaxica-apps-edge-other-${APEX_WORKER_NAME}.account.workers.dev`,
      'workers.dev',
      'account.workers.dev',
      '',
      undefined,
    ]) {
      expect(isAllowedApexHost(host, { allowLocalhost: true })).toBe(false);
    }
  });

  it('rejects an unknown URL host before the limiter and ignores X-Forwarded-Host', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const limit = vi.fn().mockResolvedValue({ success: true });
    const app = createApexApp(() => undefined);

    const response = await app.request(
      'https://unknown.example/health?secret-query-marker',
      { headers: { 'x-forwarded-host': APEX_PUBLIC_HOST } },
      { EDGE_ENV: 'production', RATE_LIMITER: { limit } },
    );

    expect(response.status).toBe(421);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/iu);
    await expect(response.text()).resolves.toBe('Misdirected Request\n');
    expect(limit).not.toHaveBeenCalled();

    const records = log.mock.calls.map(
      ([line]) => JSON.parse(String(line)) as Record<string, unknown>,
    );
    expect(records.at(-1)).toMatchObject({
      msg: 'request end',
      data: {
        route: 'health',
        status: 421,
        outcome: 'completed',
      },
    });
    expect(JSON.stringify(records)).not.toContain('unknown.example');
    expect(JSON.stringify(records)).not.toContain('secret-query-marker');
  });
});
