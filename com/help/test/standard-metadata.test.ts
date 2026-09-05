import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CANONICAL_ORIGIN } from '../src/lib/canonical';
import { handlers } from './utils/handlers';

const host = 'help-jp.umaxica.com';
const unitRoot = resolve(import.meta.dirname, '..');

/*
 * Next generated robots.txt, sitemap.xml and the manifest from its Metadata
 * Route convention, so the old version of this file could call the generator and
 * assert on the object it returned. They are ordinary server routes now, so each
 * is asserted on the response — which is also where the `Content-Type` Next used
 * to infer is now stated explicitly, and therefore worth pinning.
 */
describe('standard metadata', () => {
  it('keeps robots and sitemap on the canonical host', async () => {
    expect(CANONICAL_ORIGIN).toBe(`https://${host}`);

    const robots = await handlers.robots();
    expect(robots.headers.get('content-type')).toContain('text/plain');
    const robotsBody = await robots.text();
    expect(robotsBody).toContain('User-Agent: *');
    expect(robotsBody).toContain('Allow: /');
    expect(robotsBody).toContain(`Sitemap: https://${host}/sitemap.xml`);

    const sitemap = await handlers.sitemap();
    expect(sitemap.headers.get('content-type')).toContain('xml');
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toContain(`<loc>https://${host}/ja/</loc>`);
    expect(sitemapBody).toContain('<changefreq>weekly</changefreq>');
    expect(sitemapBody).toContain('<priority>0.5</priority>');
  });

  it('publishes the minimal manifest and lightweight health response', async () => {
    const manifest = await handlers.manifest();
    expect(manifest.headers.get('content-type')).toContain('application/manifest+json');
    await expect(manifest.json()).resolves.toMatchObject({
      name: 'UMAXICA Help (com)',
      start_url: '/ja/',
      display: 'standalone',
      icons: [expect.objectContaining({ src: '/favicon.ico' })],
    });

    const response = await handlers.health();
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('contains the required browser assets', () => {
    // The favicon moved out of `src/app/` when the App Router convention went
    // away; it is an ordinary static asset now, served by Cloudflare before the
    // Worker runs.
    expect(statSync(resolve(unitRoot, 'public/favicon.ico')).size).toBeGreaterThan(0);
    const worker = readFileSync(resolve(unitRoot, 'public/service-worker.js'), 'utf8');
    expect(worker).toContain("event.request.mode !== 'navigate'");
    expect(worker).toContain('fetch(event.request).catch');
    expect(worker).toContain('cache.add(url)');
  });
});
