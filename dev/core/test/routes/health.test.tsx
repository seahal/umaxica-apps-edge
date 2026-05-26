import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { GET } from '../../src/app/health/route';

describe('dev/core health route', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns OK JSON status with expected content', async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(json).toEqual({
      status: 'ok',
      timestamp: '2024-01-01T00:00:00.000Z',
      version: {
        id: undefined,
        tag: undefined,
      },
    });
  });

  it('returns error JSON status when Date.toISOString throws', async () => {
    vi.spyOn(Date.prototype, 'toISOString').mockImplementationOnce(() => {
      throw new Error('Date error');
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json).toEqual({
      status: 'error',
      timestamp: expect.any(String),
    });
  });
});
