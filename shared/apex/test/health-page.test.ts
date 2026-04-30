import { renderHealthPage } from '../health-page';

describe('health-page', () => {
  const mockEnv = {
    BRAND_NAME: 'TestBrand',
    CF_BEACON: 'test',
  };

  it('renders health page with OK status', () => {
    const response = renderHealthPage(mockEnv as never);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('includes brand name in the page', async () => {
    const response = renderHealthPage(mockEnv as never);
    const body = await response.text();

    expect(body).toContain('TestBrand');
    expect(body).toContain('<strong>Status:</strong> OK');
  });

  it('includes timestamp in the page', async () => {
    const response = renderHealthPage(mockEnv as never);
    const body = await response.text();

    expect(body).toContain('Timestamp:');
  });

  it('returns proper HTML structure', async () => {
    const response = renderHealthPage(mockEnv as never);
    const body = await response.text();

    expect(body).toContain('<!doctype html>');
    expect(body).toContain('<html lang="ja">');
    expect(body).toContain('</html>');
  });

  it('returns 503 error page when rendering fails', () => {
    const originalResponse = globalThis.Response;

    globalThis.Response = class MockResponse extends originalResponse {
      constructor(body?: BodyInit | null, init?: ResponseInit) {
        if (init?.status === 200) {
          throw new Error('Simulated Response error');
        }
        super(body, init);
      }
    } as typeof Response;

    try {
      const response = renderHealthPage(mockEnv as never);
      globalThis.Response = originalResponse;

      expect(response.status).toBe(503);
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    } finally {
      globalThis.Response = originalResponse;
    }
  });

  it('includes error status in error page', async () => {
    const originalResponse = globalThis.Response;
    let callCount = 0;

    globalThis.Response = class MockResponse extends originalResponse {
      constructor(body?: BodyInit | null, init?: ResponseInit) {
        callCount++;
        if (callCount === 1) {
          throw new Error('Simulated Response error');
        }
        super(body, init);
      }
    } as typeof Response;

    try {
      const response = renderHealthPage(mockEnv as never);
      globalThis.Response = originalResponse;
      const body = await response.text();

      expect(response.status).toBe(503);
      expect(body).toContain('status: error');
    } finally {
      globalThis.Response = originalResponse;
    }
  });
});
