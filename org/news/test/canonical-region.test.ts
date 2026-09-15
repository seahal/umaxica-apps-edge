import { afterEach, describe, expect, it, vi } from 'vitest';

import { CANONICAL_ORIGINS } from '../src/lib/publishing-cell';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('canonical region', () => {
  it('selects the US origin only for an explicit us build value', async () => {
    vi.stubEnv('PUBLIC_REGION', 'us');
    vi.resetModules();
    await expect(import('../src/lib/canonical')).resolves.toHaveProperty(
      'CANONICAL_ORIGIN',
      CANONICAL_ORIGINS.us,
    );

    vi.stubEnv('PUBLIC_REGION', 'other');
    vi.resetModules();
    await expect(import('../src/lib/canonical')).resolves.toHaveProperty(
      'CANONICAL_ORIGIN',
      CANONICAL_ORIGINS.jp,
    );
  });
});
