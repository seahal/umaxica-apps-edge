import { requestFromComApp } from './utils/request';

describe('GET /health', () => {
  it('returns the COM health HTML document', async () => {
    const response = await requestFromComApp('/health');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');

    const body = await response.text();
    expect(body).toContain('<title>UMAXICA</title>');
    expect(body).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(body).toContain('<strong>Status:</strong> OK');
    expect(body).toContain('Timestamp:');
    expect(body).not.toContain('<header');
    expect(body).not.toContain('<footer');
  });

  it('uses the default BRAND_NAME in the health page body', async () => {
    const response = await requestFromComApp('/health');
    const body = await response.text();
    expect(body).toContain('UMAXICA');
    expect(body).toContain('<title>UMAXICA</title>');
  });

  it('applies security headers to the health response', async () => {
    const response = await requestFromComApp('/health');

    expect(response.headers.get('strict-transport-security')).toContain('max-age=31536000');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(response.headers.get('permissions-policy')).toContain('accelerometer=()');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });
});
