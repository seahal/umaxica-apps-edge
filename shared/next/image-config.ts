/**
 * Shared `images` config for Cloudflare-deployed apps using OpenNext's native
 * IMAGES binding (no custom loader). remotePatterns is intentionally empty:
 * only repository-local static-import images are optimized today.
 *
 * Not typed against `next`'s NextConfig here: this module is imported by
 * relative path from every app workspace, and `next` is not hoisted in this
 * pnpm monorepo, so a `next` type import fails to resolve outside app/core's
 * own workspace. The shape matches `NextConfig['images']`.
 */
export const sharedImageConfig = {
  formats: ['image/avif', 'image/webp'],
  qualities: [75],
  remotePatterns: [],
  dangerouslyAllowSVG: false,
  contentDispositionType: 'attachment',
};
