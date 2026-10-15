/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { renderToString } from 'hono/jsx/dom/server';

import { SeoHead, getMeta, setMeta, type Meta } from '../src/seo';

/*
 * The seo module in isolation. The throwaway `new Hono()` apps below are a
 * rendering harness, not a server: they exist to drive `SeoHead` with metadata
 * shapes this unit's one page never produces — Open Graph tags, Twitter cards,
 * an explicit canonical, a bare brand-only title. What `/about` actually emits
 * is asserted over real HTTP in `api/routes.hurl`.
 *
 * That split is the reason these stay in Vitest: an input the deployed app has
 * no route for cannot be reached by an HTTP client at all.
 */
describe('seo helpers', () => {
  it('setMeta makes metadata available via getMeta', async () => {
    const app = new Hono();
    const meta: Meta = { pageTitle: 'Pricing', description: 'Plans and pricing' };

    app.get('/meta', (c) => {
      setMeta(c, meta);
      return c.json(getMeta(c));
    });

    const res = await app.request('/meta');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(meta);
  });

  it('SeoHead outputs SEO tags from route metadata', async () => {
    const app = new Hono();

    app.get('/page', (c) => {
      setMeta(c, {
        pageTitle: 'Pricing',
        description: 'Plans and pricing',
        canonical: 'https://umaxica.app/pricing',
        robots: 'index,follow',
        og: {
          title: 'Pricing — UMAXICA (APP)',
          description: 'Plans and pricing',
          type: 'website',
          url: 'https://umaxica.app/pricing',
          image: 'https://umaxica.app/og/pricing.png',
        },
        twitter: {
          site: '@umaxica',
        },
      });

      const html = renderToString(<SeoHead c={c} brand={{ brandName: 'UMAXICA', tld: 'APP' }} />);
      return c.html(html);
    });

    const res = await app.request('/page');
    const body = await res.text();

    expect(body).toContain('<title>Pricing — UMAXICA (APP)</title>');
    expect(body).toContain('<meta name="description" content="Plans and pricing"/>');
    expect(body).toContain('<link rel="canonical" href="https://umaxica.app/pricing"/>');
    expect(body).toContain('<meta name="robots" content="index,follow"/>');
    expect(body).toContain('<meta property="og:title" content="Pricing — UMAXICA (APP)"/>');
    expect(body).toContain('<meta property="og:description" content="Plans and pricing"/>');
    expect(body).toContain('<meta property="og:type" content="website"/>');
    expect(body).toContain('<meta property="og:url" content="https://umaxica.app/pricing"/>');
    expect(body).toContain(
      '<meta property="og:image" content="https://umaxica.app/og/pricing.png"/>',
    );
    expect(body).toContain('<meta name="twitter:card" content="summary_large_image"/>');
    expect(body).toContain('<meta name="twitter:site" content="@umaxica"/>');
  });

  it('title is the bare root title when no pageTitle/defaultPageTitle are present', async () => {
    const app = new Hono();

    app.get('/brand-only', (c) => {
      const html = renderToString(<SeoHead c={c} brand={{ brandName: 'UMAXICA', tld: 'APP' }} />);
      return c.html(html);
    });

    const res = await app.request('/brand-only');
    const body = await res.text();
    expect(body).toContain('<title>UMAXICA (APP)</title>');
  });

  it('uses default metadata and omits blank optional tags', async () => {
    const app = new Hono();

    app.get('/default-meta', (c) => {
      const html = renderToString(
        <SeoHead
          c={c}
          brand={{ brandName: 'UMAXICA', tld: 'APP' }}
          defaultMeta={{
            title: '   ',
            pageTitle: 'Home',
            description: '   ',
            canonical: '   ',
            robots: '   ',
            og: {
              title: '   ',
              description: '   ',
              type: '   ',
              url: '   ',
              image: '   ',
            },
            twitter: {
              card: '   ',
              site: '   ',
            },
          }}
        />,
      );
      return c.html(html);
    });

    const res = await app.request('/default-meta');
    const body = await res.text();

    expect(body).toContain('<title>Home — UMAXICA (APP)</title>');
    expect(body).toContain('<meta name="twitter:card" content="summary_large_image"/>');
    expect(body).not.toContain('name="description"');
    expect(body).not.toContain('rel="canonical"');
    expect(body).not.toContain('name="robots"');
    expect(body).not.toContain('property="og:');
    expect(body).not.toContain('name="twitter:site"');
  });
});
