import app from '../src/index';

describe('Net Hono app', () => {
  it('renders health check', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    const body = await res.text();
    expect(body).toContain('<h1>status</h1>');
    expect(body).toContain('<dt>status</dt>');
    expect(body).toContain('<dd>OK</dd>');
    expect(body).toContain('<dt>service</dt>');
    expect(body).toContain('<dd>net</dd>');
    expect(body).toContain('<dt>version</dt>');
    expect(body).toContain('<dd>null</dd>');
    expect(body).toContain('<dt>edge</dt>');
    expect(body).toContain('<dd>cloudflare</dd>');
    expect(body).toContain('<dt>time</dt>');
    expect(body).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(body).not.toContain('<header');
  });

  it('renders health JSON', async () => {
    const res = await app.request('/health.json');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: 'OK',
      service: 'net',
      version: null,
      edge: 'cloudflare',
      time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    });
  });

  it('redirects root to about', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('/about');
  });

  it('renders about page', async () => {
    const res = await app.request('/about');
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('About');
    expect(body).not.toContain('このサイトについて');
    expect(body).toContain('<title>About | UMAXICA (net) - Apex</title>');
    expect(body).toContain(
      '<meta name="description" content="umaxica.net is the apex domain of the UMAXICA platform. Services and content are available on dedicated subdomains"',
    );
    expect(body).toContain('<link rel="canonical" href="https://umaxica.net/about"');
    expect(body).toContain('<meta name="robots" content="index,follow"');
  });

  it('renders about page in Japanese when Accept-Language prefers ja', async () => {
    const res = await app.request('/about', {
      headers: { 'Accept-Language': 'ja' },
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('このサイトについて');
    expect(body).not.toContain('About this site.');
  });

  it('renders footer with current UTC year', async () => {
    const res = await app.request('/about');
    const body = await res.text();
    const currentYear = new Date().getUTCFullYear();
    expect(body).toContain(`© ${currentYear} UMAXICA`);
  });

  it('renders about page with brand name from env', async () => {
    const res = await app.request('/about', {}, { BRAND_NAME: 'UMAXCA' });
    const body = await res.text();
    expect(body).toContain('<title>About | UMAXICA (net) - Apex</title>');
    expect(body).toContain('UMAXCA');
  });

  it('applies security headers', async () => {
    const res = await app.request('/');
    expect(res.headers.get('Strict-Transport-Security')).toBeTruthy();
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });
});
