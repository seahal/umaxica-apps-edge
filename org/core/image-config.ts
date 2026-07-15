/**
 * `images` config for Cloudflare-deployed apps using OpenNext's native
 * IMAGES binding (no custom loader). remotePatterns is intentionally empty:
 * only repository-local static-import images are optimized today.
 *
 * Not typed against `next`'s NextConfig here: `next` is not hoisted in this
 * pnpm monorepo outside app/core's own workspace, so importing its type from
 * a shared module used to fail to resolve. Kept as a plain object; the shape
 * matches `NextConfig['images']`.
 */
export const imageConfig = {
  formats: ['image/avif', 'image/webp'],
  qualities: [75],
  remotePatterns: [],
  dangerouslyAllowSVG: false,
  contentDispositionType: 'attachment',
};
