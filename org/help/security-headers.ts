const IMAGE_FONT_CSP = "font-src 'self'; img-src 'self' data:";

/**
 * Minimal CSP covering only font and image delivery, scoped to what
 * self-hosted next/font and the native next/image pipeline require.
 * A full CSP (script-src, etc.) is out of scope for this change.
 */
export const imageFontSecurityHeaders = async () => [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: IMAGE_FONT_CSP,
      },
    ],
  },
];
