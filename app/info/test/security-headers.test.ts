import { describe, expect, it } from 'vitest';

import { securityHeaders, withSecurityHeaders } from '../src/lib/security-headers';

describe('security headers', () => {
  it('loosens script and style sources only in development', () => {
    const dev = securityHeaders(false)['Content-Security-Policy'] ?? '';
    expect(dev).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(dev).toContain("style-src 'self' 'unsafe-inline'");
    expect(dev).not.toContain("default-src 'self' 'unsafe-inline'");
  });

  it('keeps production script-src and style-src on self only', () => {
    const prod = securityHeaders(true)['Content-Security-Policy'] ?? '';
    expect(prod).toContain("script-src 'self'");
    expect(prod).not.toContain('unsafe-inline');
    expect(prod).not.toContain('unsafe-eval');
    expect(prod).toContain("script-src-attr 'none'");
  });

  it('stamps the policy onto an existing response', () => {
    const stamped = withSecurityHeaders(new Response('ok', { status: 201 }), true);
    expect(stamped.status).toBe(201);
    expect(stamped.headers.get('x-content-type-options')).toBe('nosniff');
    expect(stamped.headers.get('permissions-policy')).toContain('usb=()');
  });
});
