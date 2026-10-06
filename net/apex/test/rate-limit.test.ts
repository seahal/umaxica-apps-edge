// First-touch rate limiting for this apex Worker.
//
// The limiter is injected rather than looked up: `create-apex-app.ts` passes
// `bindings(c)?.RATE_LIMITER`, so these tests hand `checkRateLimit` a stub
// directly. That is what makes them Vitest rather than Hurl — no HTTP client
// can supply a refusing limiter (AGENTS.md, "Test layers").

import { describe, expect, it, vi } from 'vitest';

import { checkRateLimit } from '../src/rate-limit';

function request(url = 'http://localhost/', headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

const allows = () => ({ limit: vi.fn().mockResolvedValue({ success: true }) });
const refuses = () => ({ limit: vi.fn().mockResolvedValue({ success: false }) });

describe('net/apex rate limiting', () => {
  it('passes the request through when no RATE_LIMITER binding is present', async () => {
    await expect(checkRateLimit(request(), undefined)).resolves.toBeNull();
  });

  it('passes the request through when the rate limiter allows it', async () => {
    await expect(checkRateLimit(request(), allows())).resolves.toBeNull();
  });

  it('answers 429 with a titled, no-store HTML document when the limiter refuses', async () => {
    const response = await checkRateLimit(request(), refuses());

    expect(response?.status).toBe(429);
    expect(response?.headers.get('Cache-Control')).toBe('no-store');
    expect(response?.headers.get('Content-Type')).toBe('text/html; charset=UTF-8');

    const body = await response?.text();
    expect(body).toContain('HTTP 429');
    // No language was detected for this call, so the document falls back to
    // English exactly as every other refused request on this origin does.
    expect(body).toContain('<html lang="en"');
    expect(body).toContain('<title>The request could not be processed — UMAXICA (NET)</title>');
  });

  it('answers the 429 in the language the unit detected', async () => {
    const body = await (await checkRateLimit(request(), refuses(), 'ja'))?.text();

    expect(body).toContain('<html lang="ja"');
    expect(body).toContain('<title>リクエストを処理できませんでした — UMAXICA (NET)</title>');
  });

  it('keys the limiter on the Cloudflare client IP', async () => {
    const limiter = allows();

    await checkRateLimit(
      request('http://localhost/', { 'cf-connecting-ip': '203.0.113.9' }),
      limiter,
    );

    expect(limiter.limit).toHaveBeenCalledWith({ key: '203.0.113.9' });
  });

  it('keeps the key independent of the attacker-controlled path when an IP is present', async () => {
    const limiter = allows();

    await checkRateLimit(
      request('http://localhost/health.json', { 'cf-connecting-ip': '10.0.0.1' }),
      limiter,
    );

    expect(limiter.limit).toHaveBeenCalledWith({ key: '10.0.0.1' });
  });

  // A missing `CF-Connecting-IP` must not put every such request into one shared
  // bucket: that bucket is a bypass for the clients inside it and a denial of
  // service against each other, since any one of them can spend it for all.
  it('falls back to a per-path key, not one bucket shared by every caller', async () => {
    const limiter = allows();

    await checkRateLimit(request(), limiter);

    expect(limiter.limit).toHaveBeenCalledWith({ key: 'no-ip:/' });
  });

  it('keeps two header-less requests to different paths in different buckets', async () => {
    const limiter = allows();

    await checkRateLimit(request('http://localhost/health'), limiter);
    await checkRateLimit(request('http://localhost/'), limiter);

    expect(limiter.limit).toHaveBeenNthCalledWith(1, { key: 'no-ip:/health' });
    expect(limiter.limit).toHaveBeenNthCalledWith(2, { key: 'no-ip:/' });
  });

  // An empty header value is as unattributable as an absent one.
  it('treats an empty cf-connecting-ip as absent', async () => {
    const limiter = allows();

    await checkRateLimit(request('http://localhost/', { 'cf-connecting-ip': '' }), limiter);

    expect(limiter.limit).toHaveBeenCalledWith({ key: 'no-ip:/' });
  });

  // The 429 is bare on purpose: `apexSecurityHeaders` runs ahead of the limiter
  // middleware, so the response is decorated on the way out, in the same place
  // every other response this unit answers is.
  it('returns the 429 without security headers, leaving them to the middleware', async () => {
    const response = await checkRateLimit(request(), refuses());

    expect(response?.headers.get('Content-Security-Policy')).toBeNull();
  });
});
