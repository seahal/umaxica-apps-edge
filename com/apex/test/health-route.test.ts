import { requestFromComApp } from './utils/request';

describe('GET /health', () => {
  it('returns the COM health HTML document', async () => {
    const response = await requestFromComApp('/health');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');

    const body = await response.text();
    expect(body).toContain('<title>UMAXICA | Health status</title>');
    expect(body).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(body).toContain('<h1>status</h1>');
    expect(body).toContain('<dt>status</dt>');
    expect(body).toContain('<dd>OK</dd>');
    expect(body).toContain('<dt>service</dt>');
    expect(body).toContain('<dd>com</dd>');
    expect(body).toContain('<dt>version</dt>');
    expect(body).toContain('<dd>null</dd>');
    expect(body).toContain('<dt>edge</dt>');
    expect(body).toContain('<dd>cloudflare</dd>');
    expect(body).toContain('<dt>time</dt>');
    expect(body).not.toContain('<header');
  });

  it('uses BRAND_NAME from env in the health page title', async () => {
    const response = await requestFromComApp('/health', {}, { BRAND_NAME: 'UMAXCA' });
    const body = await response.text();
    expect(body).toContain('<title>UMAXCA | Health status</title>');
  });

  it('returns the COM health JSON document', async () => {
    const response = await requestFromComApp('/health.json');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({
      status: 'OK',
      service: 'com',
      version: null,
      edge: 'cloudflare',
      time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    });
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
