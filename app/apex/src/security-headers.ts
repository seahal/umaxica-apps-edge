import type { RateLimiter } from './rate-limit';
import { APEX_INLINE_STYLE_CSP_SOURCE } from './inline-style';

const DEFAULT_CSP_STYLE_SRC = `'self' ${APEX_INLINE_STYLE_CSP_SOURCE}`;

export function buildCspHeader(styleSrc: string = DEFAULT_CSP_STYLE_SRC): string {
  return `default-src 'self'; base-uri 'self'; font-src 'self' data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data:; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src ${styleSrc}; style-src-attr 'none'; upgrade-insecure-requests`;
}

interface SecurityContext {
  header: (name: string, value: string, options?: { append?: boolean }) => void;
}

export function applySecurityHeaders(c: SecurityContext): void {
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  c.header('Content-Security-Policy', buildCspHeader());
  c.header(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  );
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
}

export type AssetEnv = {
  BRAND_NAME?: string;
  CF_VERSION_METADATA?: {
    id?: string;
  };
  RATE_LIMITER?: RateLimiter;
};
