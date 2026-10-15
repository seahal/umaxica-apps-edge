// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';

describe('paraglide client strategy without a document', () => {
  it('returns undefined from getLocale when document is absent', async () => {
    expect(typeof document).toBe('undefined');

    let capturedGetLocale: (() => string | undefined) | undefined;
    vi.resetModules();
    vi.doMock('../../src/paraglide/runtime', () => ({
      defineCustomClientStrategy: (
        _name: string,
        strategy: { getLocale: () => string | undefined; setLocale: () => undefined },
      ) => {
        capturedGetLocale = strategy.getLocale;
      },
    }));

    await import('../../src/i18n/paraglide-client');
    expect(capturedGetLocale).toBeTypeOf('function');
    expect(capturedGetLocale?.()).toBeUndefined();
  });
});
