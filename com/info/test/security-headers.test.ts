import { describe, expect, it } from 'vitest';
import { imageFontSecurityHeaders } from '../security-headers';

describe('imageFontSecurityHeaders', () => {
  it('applies a font/image CSP to every path', async () => {
    const rules = await imageFontSecurityHeaders?.();
    expect(rules).toEqual([
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "font-src 'self'; img-src 'self' data:",
          },
        ],
      },
    ]);
  });
});
