const IMAGE_FONT_CSP = "font-src 'self'; img-src 'self' data:";

/**
 * Minimal CSP covering only font and image delivery, scoped to what
 * self-hosted next/font and the native next/image pipeline require.
 * A full CSP (script-src, etc.) is out of scope for this change.
 *
 * Not typed against `next`'s NextConfig here: this module is imported by
 * relative path from every app workspace, and `next` is not hoisted in this
 * pnpm monorepo, so a `next` type import fails to resolve outside app/core's
 * own workspace. The shape matches `NextConfig['headers']`.
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
