import { describe, expect, it } from 'vite-plus/test';
import app from '../src/index';

describe('org/jump', () => {
  it('returns OK on root', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('OK');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await app.request('/nonexistent');
    expect(res.status).toBe(404);
  });
});
