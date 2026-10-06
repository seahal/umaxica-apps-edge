import { vi, describe, it, expect } from 'vitest';

import { checkRateLimit } from '../../src/lib/rate-limit';

describe(checkRateLimit, () => {
  it('returns null when rateLimiter is undefined', async () => {
    const request = new Request('http://localhost/');
    const result = await checkRateLimit(request, undefined);
    expect(result).toBeNull();
  });

  it('returns null when rate limit check succeeds', async () => {
    const request = new Request('http://localhost/', {
      headers: { 'cf-connecting-ip': '192.168.1.1' },
    });
    const mockRateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: true }),
    };
    const result = await checkRateLimit(request, mockRateLimiter);
    expect(result).toBeNull();
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: '192.168.1.1' });
  });

  it('returns 429 response when rate limit is exceeded', async () => {
    const request = new Request('http://localhost/', {
      headers: { 'cf-connecting-ip': '192.168.1.1' },
    });
    const mockRateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: false }),
    };
    const result = await checkRateLimit(request, mockRateLimiter);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
    expect(await result?.text()).toContain('HTTP 429');
  });

  it('answers in the default locale when the caller resolves none', async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });
    const result = await checkRateLimit(new Request('http://localhost/'), { limit });
    expect(result?.headers.get('Cache-Control')).toBe('no-store');
    expect(result?.headers.get('Content-Type')).toBe('text/html; charset=UTF-8');
    const body = await result?.text();
    expect(body).toContain('<html lang="ja">');
    expect(body).toContain('<title>リクエストを処理できませんでした — UMAXICA (APP)</title>');
  });

  it('answers in English when the caller resolved English', async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });
    const result = await checkRateLimit(new Request('http://localhost/'), { limit }, () => 'en');
    const body = await result?.text();
    expect(body).toContain('<html lang="en">');
    expect(body).toContain('<title>The request could not be processed — UMAXICA (APP)</title>');
    expect(body).toContain('<h1>The request could not be processed</h1>');
  });

  // Locale resolution belongs to a refused request only.
  it('does not resolve a locale for a request the limiter allows', async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    const locale = vi.fn((): 'en' => 'en');
    await checkRateLimit(new Request('http://localhost/'), { limit }, locale);
    expect(locale).not.toHaveBeenCalled();
  });

  // A missing `CF-Connecting-IP` must not put every such request into one shared
  // bucket: that bucket is a bypass for the clients inside it and a denial of
  // service against each other, since any one of them can spend it for all.
  it('falls back to a per-path key, not one bucket shared by every caller', async () => {
    const request = new Request('http://localhost/');
    const mockRateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: true }),
    };
    await checkRateLimit(request, mockRateLimiter);
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: 'no-ip:/' });
  });

  it('keeps two header-less requests to different paths in different buckets', async () => {
    const mockRateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: true }),
    };
    await checkRateLimit(new Request('http://localhost/oidc/authorize'), mockRateLimiter);
    await checkRateLimit(new Request('http://localhost/about'), mockRateLimiter);

    expect(mockRateLimiter.limit).toHaveBeenNthCalledWith(1, { key: 'no-ip:/oidc/authorize' });
    expect(mockRateLimiter.limit).toHaveBeenNthCalledWith(2, { key: 'no-ip:/about' });
  });

  // An empty header value is as unattributable as an absent one.
  it('treats an empty cf-connecting-ip as absent', async () => {
    const mockRateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: true }),
    };
    await checkRateLimit(
      new Request('http://localhost/', { headers: { 'cf-connecting-ip': '' } }),
      mockRateLimiter,
    );

    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: 'no-ip:/' });
  });

  // The 429 is a bare document on purpose: `src/worker.ts` is what puts the
  // security headers on it, in the same place it headers the block and the 503.
  it('returns the 429 without security headers, leaving them to the worker', async () => {
    const mockRateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: false }),
    };
    const result = await checkRateLimit(new Request('http://localhost/'), mockRateLimiter);

    expect(result?.headers.get('Content-Security-Policy')).toBeNull();
    expect(result?.headers.get('Content-Type')).toBe('text/html; charset=UTF-8');
  });

  // The path is attacker-controlled and the IP is not, so an IP-keyed request
  // must count the same bucket whatever path it asks for — otherwise a client
  // gets a fresh budget per URL and the limit means nothing.
  it('ignores the path when a client IP is present', async () => {
    const request = new Request('http://localhost/api/widgets', {
      headers: { 'cf-connecting-ip': '10.0.0.1' },
    });
    const mockRateLimiter = {
      limit: vi.fn().mockResolvedValue({ success: true }),
    };
    await checkRateLimit(request, mockRateLimiter);
    expect(mockRateLimiter.limit).toHaveBeenCalledWith({ key: '10.0.0.1' });
  });
});
