import { secureHeaders } from 'hono/secure-headers';

import type { RateLimiter } from './rate-limit';

/*
 * `style-src` is `'self'` alone.
 *
 * It used to carry a sha256 of an inline `<style>` alongside `'self'`, which
 * bought nothing: `'self'` was already present, so a same-origin stylesheet was
 * already permitted, and the digest had to be recomputed by hand — and pinned
 * by its own test — every time a single character of the CSS changed. The CSS
 * is now a compiled static asset served from this origin, so the hash is gone
 * and the policy is the narrower of the two.
 *
 * `styleSrcAttr: 'none'` still forbids inline `style="…"` attributes, which is
 * why every visual rule in this unit is a Tailwind class.
 */
export const apexSecurityHeaders = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    fontSrc: ["'self'", 'data:'],
    formAction: ["'self'"],
    /*
     * `'none'`, not `'self'`, because `xFrameOptions: 'DENY'` below says the
     * same thing and only one of the two is actually consulted: a browser that
     * sees `frame-ancestors` MUST ignore `X-Frame-Options` entirely. With
     * `'self'` here the effective policy was same-origin framing while the
     * header beside it read DENY — the weaker of the two silently winning.
     * These apex documents are framed by nothing, and every frame unit's
     * `security-headers.ts` already sends `frame-ancestors 'none'`.
     */
    frameAncestors: ["'none'"],
    imgSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    scriptSrc: ["'self'"],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'self'"],
    styleSrcAttr: ["'none'"],
    upgradeInsecureRequests: [],
  },
  permissionsPolicy: {
    accelerometer: [],
    camera: [],
    geolocation: [],
    gyroscope: [],
    magnetometer: [],
    microphone: [],
    payment: [],
    usb: [],
  },
  referrerPolicy: 'no-referrer',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
});

export type AssetEnv = {
  BRAND_NAME?: string;
  EDGE_ENV?: string;
  CF_VERSION_METADATA?: {
    id?: string;
    tag?: string;
    timestamp?: string;
  };
  RATE_LIMITER?: RateLimiter;
};
