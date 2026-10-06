import { describe, expect, it } from 'vitest';

import { CANONICAL_ORIGINS } from '../../src/lib/publishing-cell';
import {
  isAllowedPublishingHost,
  PUBLIC_PREVIEW_HOST,
  PUBLIC_WORKER_NAME,
} from '../../src/lib/publishing-host-policy';

describe('publishing Host policy', () => {
  it('accepts the configured canonical hosts and this Worker preview host', () => {
    for (const origin of Object.values(CANONICAL_ORIGINS)) {
      expect(isAllowedPublishingHost(new URL(origin).hostname, { allowLocalhost: false })).toBe(
        true,
      );
    }
    expect(isAllowedPublishingHost(PUBLIC_PREVIEW_HOST, { allowLocalhost: false })).toBe(true);
    expect(
      isAllowedPublishingHost(`version-${PUBLIC_WORKER_NAME}.account.workers.dev`, {
        allowLocalhost: false,
      }),
    ).toBe(true);
  });

  it('allows local hosts only outside the production tier', () => {
    for (const hostname of ['localhost', '127.0.0.1', '[::1]', 'docs.localhost']) {
      expect(isAllowedPublishingHost(hostname, { allowLocalhost: true }), hostname).toBe(true);
      expect(isAllowedPublishingHost(hostname, { allowLocalhost: false }), hostname).toBe(false);
    }
  });

  it('does not widen the allowlist to sibling, malformed or arbitrary hosts', () => {
    for (const hostname of [
      'other-worker.account.workers.dev',
      `umaxica-apps-edge-other-${PUBLIC_WORKER_NAME}.account.workers.dev`,
      'workers.dev',
      'docs.umaxica.attacker.example',
      `${PUBLIC_PREVIEW_HOST}.evil.example`,
      '',
    ]) {
      expect(isAllowedPublishingHost(hostname, { allowLocalhost: true }), hostname).toBe(false);
    }
  });
});
