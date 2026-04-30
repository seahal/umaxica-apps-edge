import { describe, expect, it } from 'vite-plus/test';
import { buildHealthErrorHtml } from '../html/fallback-pages';

describe('fallback-pages', () => {
  describe('buildHealthErrorHtml', () => {
    it('generates error HTML with brand name', () => {
      const html = buildHealthErrorHtml('UMAXICA', '2024-01-01T00:00:00Z');
      expect(html).toContain('UMAXICA');
      expect(html).toContain('status: error');
      expect(html).toContain('2024-01-01T00:00:00Z');
    });

    it('generates HTML with proper structure', () => {
      const html = buildHealthErrorHtml('TestBrand', '2024-01-01T00:00:00Z');
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('<html lang="ja">');
      expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    });
  });
});
