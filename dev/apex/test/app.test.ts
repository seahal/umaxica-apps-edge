import { app, fetch } from '../src/app';

describe('dev/apex/src/app.ts', () => {
  it('exports a named fetch handler for Vercel', () => {
    expect(fetch).toBeTypeOf('function');
  });

  describe('buildApexTitle', () => {
    it('returns health status title for health page', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('<title>Health status | UMAXICA (dev) - Apex</title>');
    });

    it('returns title with pageName when /about is requested', async () => {
      const res = await app.request('/about');
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('<title>About | UMAXICA (dev) - Apex</title>');
    });
  });

  describe('detectLanguage', () => {
    it('detects Japanese from query parameter', async () => {
      const res = await app.request('/about?lang=ja');
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('このサイトについて');
    });

    it('detects Japanese from accept-language header', async () => {
      const res = await app.request('/about', {
        headers: { 'accept-language': 'ja-JP,en-US;q=0.9' },
      });
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('このサイトについて');
    });

    it('defaults to English for unknown language', async () => {
      const res = await app.request('/about', {
        headers: { 'accept-language': 'fr-FR;q=0.9' },
      });
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('About this site');
    });
  });

  describe('buildPageShell', () => {
    it('renders Japanese content', async () => {
      const res = await app.request('/about?lang=ja');
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('html lang="ja"');
      expect(body).toContain('本ドメイン');
    });

    it('renders English content', async () => {
      const res = await app.request('/about');
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('html lang="en"');
      expect(body).toContain('public-facing');
    });
  });

  describe('buildHealthPageHtml', () => {
    it('renders health page with five health fields', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('UMAXICA');
      expect(body).toContain('<h1 style="margin: 0 0 1rem;">status</h1>');
      expect(body).toContain('<dt>status</dt>');
      expect(body).toContain('<dd>OK</dd>');
      expect(body).toContain('<dt>service</dt>');
      expect(body).toContain('<dd>dev</dd>');
      expect(body).toContain('<dt>version</dt>');
      expect(body).toContain('<dd>null</dd>');
      expect(body).toContain('<dt>edge</dt>');
      expect(body).toContain('<dd>vercel</dd>');
      expect(body).toContain('<dt>time</dt>');
    });

    it('renders health JSON with null version when no Vercel commit is available', async () => {
      delete process.env.VERCEL_GIT_COMMIT_SHA;

      const res = await app.request('/health.json');

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        status: 'OK',
        service: 'dev',
        version: null,
        edge: 'vercel',
        time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      });
    });
  });

  describe('GET /', () => {
    it('redirects to configured DEV_CORE_URL with 301', async () => {
      process.env.DEV_CORE_URL = 'https://example.com/';
      const res = await app.request('/');
      expect(res.status).toBe(301);
      expect(res.headers.get('location')).toBe('https://example.com/');
      delete process.env.DEV_CORE_URL;
    });

    it('redirects to default DEV_CORE_URL', async () => {
      const res = await app.request('/');
      expect(res.status).toBe(301);
      expect(res.headers.get('location')).toBe('https://www.umaxica.dev/');
    });
  });

  describe('GET /about', () => {
    it('includes copyright year', async () => {
      const res = await app.request('/about');
      expect(res.status).toBe(200);
      const body = await res.text();
      const year = new Date().getUTCFullYear();
      expect(body).toContain(`&copy; ${year}`);
    });

    it('includes links to other domains', async () => {
      const res = await app.request('/about');
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('umaxica.app');
      expect(body).toContain('umaxica.com');
      expect(body).toContain('umaxica.org');
    });
  });
});
