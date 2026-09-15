import { afterEach, describe, expect, it, vi } from 'vitest';

import { CANONICAL_ORIGINS, PUBLISHING_SURFACE } from '../src/lib/publishing-cell';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('canonical region', () => {
  it('keeps global cells on one origin and selects the US origin for regional cells', async () => {
    vi.stubEnv('PUBLIC_REGION', 'us');
    vi.resetModules();
    const us = await import('../src/lib/canonical');

    vi.stubEnv('PUBLIC_REGION', 'other');
    vi.resetModules();
    const fallback = await import('../src/lib/canonical');

    if (PUBLISHING_SURFACE === 'info') {
      expect(us.CANONICAL_ORIGIN).toBe(CANONICAL_ORIGINS.jp);
      expect(fallback.CANONICAL_ORIGIN).toBe(CANONICAL_ORIGINS.jp);
      return;
    }

    expect(us.CANONICAL_ORIGIN).toBe(CANONICAL_ORIGINS.us);
    expect(fallback.CANONICAL_ORIGIN).toBe(CANONICAL_ORIGINS.jp);
  });
});
