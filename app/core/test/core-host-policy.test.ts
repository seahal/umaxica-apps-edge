import { describe, expect, it } from 'vitest';

import {
  CORE_ALTERNATE_HOST,
  CORE_PUBLIC_HOST,
  CORE_WORKER_NAME,
  isAllowedCoreHost,
  isProductionCoreEnvironment,
} from '../src/lib/core-host-policy';

describe('Core Host policy', () => {
  it('accepts both configured public region hosts and this Worker workers.dev host', () => {
    expect(isAllowedCoreHost(CORE_PUBLIC_HOST, { allowLocalhost: false })).toBe(true);
    expect(isAllowedCoreHost(CORE_ALTERNATE_HOST, { allowLocalhost: false })).toBe(true);
    expect(
      isAllowedCoreHost(`${CORE_WORKER_NAME}.account.workers.dev`, { allowLocalhost: false }),
    ).toBe(true);
  });

  it('accepts case-insensitive public hostnames', () => {
    expect(isAllowedCoreHost(CORE_PUBLIC_HOST.toUpperCase(), { allowLocalhost: false })).toBe(true);
  });

  it('accepts local loopback names only outside the production tier', () => {
    for (const hostname of ['localhost', '127.0.0.1', '[::1]', 'core.localhost']) {
      expect(isAllowedCoreHost(hostname, { allowLocalhost: true }), hostname).toBe(true);
      expect(isAllowedCoreHost(hostname, { allowLocalhost: false }), hostname).toBe(false);
    }
  });

  it('does not widen the workers.dev or public host allowlist', () => {
    for (const hostname of [
      'other-worker.account.workers.dev',
      `version-${CORE_WORKER_NAME}.account.workers.dev`,
      'workers.dev',
      'jp.umaxica.attacker.example',
      'jp.umaxica.invalid',
      '',
    ]) {
      expect(isAllowedCoreHost(hostname, { allowLocalhost: true }), hostname).toBe(false);
    }
  });

  it('uses the runtime deployment tier for the local-host decision', () => {
    expect(isProductionCoreEnvironment({ EDGE_ENV: 'production' })).toBe(true);
    expect(isProductionCoreEnvironment({ EDGE_ENV: 'local' })).toBe(false);
    expect(isProductionCoreEnvironment({ EDGE_ENV: 'test' })).toBe(false);
    expect(isProductionCoreEnvironment({})).toBe(false);
  });
});
