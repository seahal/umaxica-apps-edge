import { requestFromOrgApp } from './utils/request';

describe('GET /about', () => {
  it('returns the ORG about HTML document with key metadata', async () => {
    const response = await requestFromOrgApp('/about');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');

    const body = await response.text();
    expect(body).toContain('<title>About | UMAXICA (org) - Apex</title>');
    expect(body).toContain(
      '<meta name="description" content="umaxica.org is the apex domain of the UMAXICA platform. Services and content are available on dedicated subdomains"',
    );
    expect(body).toContain('<link rel="canonical" href="https://umaxica.org/about"');
    expect(body).toContain('<meta name="robots" content="index,follow"');
    expect(body).toContain('About this site.');
    expect(body).toContain('https://umaxica.org');
    expect(body).toContain('https://umaxica.app');
  });

  it('uses BRAND_NAME from env in the page title', async () => {
    const response = await requestFromOrgApp('/about', {}, { BRAND_NAME: 'UMAXCA' });
    const body = await response.text();
    expect(body).toContain('<title>About | UMAXICA (org) - Apex</title>');
  });

  it('applies security headers to the about response', async () => {
    const response = await requestFromOrgApp('/about');

    expect(response.headers.get('strict-transport-security')).toContain('max-age=31536000');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(response.headers.get('permissions-policy')).toContain('accelerometer=()');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });
});
