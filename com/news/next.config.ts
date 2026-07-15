import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import { imageConfig } from './image-config';
import { imageFontSecurityHeaders } from './security-headers';

const nextConfig: NextConfig = {
  images: imageConfig as NextConfig['images'],
  headers: imageFontSecurityHeaders as NextConfig['headers'],
  cacheComponents: true,
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'umaxica',

  project: 'umaxica-apps-edge-com-news',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: '/monitoring',

  webpack: {
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
void initOpenNextCloudflareForDev();
