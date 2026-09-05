/*
 * Headers applied to every Astro response (dev, on-demand, and as defense in
 * depth on prerendered pages). `public/_headers` still covers Cloudflare's
 * asset match, which never reaches the Worker.
 *
 * Dev keeps `'unsafe-inline'` / `'unsafe-eval'` because the Vite HMR client
 * injects inline scripts. Production is `'self'` only — no nonce; styles and
 * scripts are same-origin files (`inlineStylesheets: 'never'`).
 */

function scriptSource(isProduction: boolean): string {
  if (!isProduction) {
    return "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  }
  return "script-src 'self'";
}

function styleSource(isProduction: boolean): string {
  if (!isProduction) {
    return "style-src 'self' 'unsafe-inline'";
  }
  return "style-src 'self'";
}

function contentSecurityPolicy(isProduction: boolean): string {
  return [
    "default-src 'self'",
    "base-uri 'none'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "object-src 'none'",
    scriptSource(isProduction),
    "script-src-attr 'none'",
    styleSource(isProduction),
    "style-src-attr 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function securityHeaders(isProduction: boolean): Record<string, string> {
  return {
    'Content-Security-Policy': contentSecurityPolicy(isProduction),
    'Permissions-Policy':
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
}

export function withSecurityHeaders(response: Response, isProduction: boolean): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders(isProduction))) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
