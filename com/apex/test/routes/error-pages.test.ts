import { describe, expect, it, vi } from 'vitest';
import app from '../../src/index';

describe('404 error page', () => {
  it('returns 404 text content', async () => {
    const res = await app.request('/nonexistent-path', {}, {});

    expect(res.status).toBe(404);
    await expect(res.text()).resolves.toBe('Not Found');
  });

  it('includes CSP header', async () => {
    const res = await app.request('/nonexistent-path', {}, {});

    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
  });
});

describe('400 error page', () => {
  it('returns 400 text content', async () => {
    const isoSpy = vi.spyOn(Date.prototype, 'toISOString').mockImplementation(() => {
      throw new Error('test error');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await app.request('/health', {}, {});

    expect(res.status).toBe(400);
    await expect(res.text()).resolves.toBe('Bad Request');

    isoSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
