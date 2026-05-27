import { describe, it, expect } from 'vite-plus/test';
import { app } from '../src/app';

describe('dev/apex/src/app.ts', () => {
  describe('buildApexTitle', () => {
    it('returns base title without pageName', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('<title>UMAXICA (dev) - Apex</title>');
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
    it('renders health page with brand name and timestamp', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('UMAXICA');
      expect(body).toContain('<strong>Status:</strong> OK');
      expect(body).toContain('Timestamp:');
      expect(body).toContain('umaxica.dev');
    });
  });

  describe('GET /', () => {
    it('redirects to DEV_CORE_URL with 301', async () => {
      const res = await app.request('/');
      expect(res.status).toBe(301);
      expect(res.headers.get('location')).toBe('https://umaxica.dev/');
    });

    it('redirects to default DEV_CORE_URL', async () => {
      const res = await app.request('/');
      expect(res.status).toBe(301);
      expect(res.headers.get('location')).toBe('https://umaxica.dev/');
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
