import app from '../src/index';

describe('Net Hono app', () => {
  it('renders health check', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    const body = await res.text();
    expect(body).toContain('<title>UMAXICA</title>');
    expect(body).toContain('<strong>Status:</strong> OK');
    expect(body).toContain('Timestamp');
    expect(body).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(body).not.toContain('<header');
    expect(body).not.toContain('<footer');
  });

  it('renders root page', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('About this site.');
    expect(body).not.toContain('このサイトについて');
    expect(body).toContain('https://umaxica.app');
    expect(body).toContain('https://umaxica.com');
    expect(body).toContain('https://umaxica.org');
    expect(body).toContain('<title>UMAXICA (net) - Apex</title>');
    expect(body).toContain('<link rel="canonical" href="https://umaxica.net/"');
    expect(body).toContain('<meta name="robots" content="index,follow"');
  });

  it('renders root page in Japanese when Accept-Language prefers ja', async () => {
    const res = await app.request('/', {
      headers: { 'Accept-Language': 'ja' },
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('このサイトについて');
    expect(body).not.toContain('About this site.');
  });

  it('renders about page', async () => {
    const res = await app.request('/about');
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('About this site.');
    expect(body).not.toContain('このサイトについて');
    expect(body).toContain('<title>About | UMAXICA (net) - Apex</title>');
    expect(body).toContain(
      '<meta name="description" content="umaxica.net is the apex domain of the UMAXICA platform. Services and content are available on dedicated subdomains"',
    );
    expect(body).toContain('<link rel="canonical" href="https://umaxica.net/about"');
    expect(body).toContain('<meta name="robots" content="index,follow"');
    expect(body).toContain('https://umaxica.app');
    expect(body).toContain('https://umaxica.com');
    expect(body).toContain('https://umaxica.org');
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
    const res = await app.request('/');
    const body = await res.text();
    const currentYear = new Date().getUTCFullYear();
    expect(body).toContain(`© ${currentYear} UMAXICA`);
  });

  it('renders root page with the default brand name', async () => {
    const res = await app.request('/');
    const body = await res.text();
    expect(body).toContain('<title>UMAXICA (net) - Apex</title>');
    expect(body).toContain('UMAXICA');
  });

  it('applies security headers', async () => {
    const res = await app.request('/');
    expect(res.headers.get('Strict-Transport-Security')).toBeTruthy();
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });
});
