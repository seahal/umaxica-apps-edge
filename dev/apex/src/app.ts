import { Hono } from 'hono';
import type { Context } from 'hono';

const BRAND_NAME = process.env.BRAND_NAME ?? 'UMAXICA';
const TITLE_BRAND_NAME = 'UMAXICA';
const DOMAIN = 'dev';
const SITE_URL = 'umaxica.dev';
const DEFAULT_LANGUAGE = 'en';

function buildApexTitle(pageName?: string): string {
  const baseTitle = `${TITLE_BRAND_NAME} (${DOMAIN}) - Apex`;
  return pageName ? `${pageName} | ${baseTitle}` : baseTitle;
}

function detectLanguage(c: Context): 'ja' | 'en' {
  const language =
    c.req.query('lang') ?? c.req.header('accept-language')?.split(',')[0]?.split('-')[0];
  return language === 'ja' ? 'ja' : 'en';
}

function buildPageShell(options: {
  lang: 'ja' | 'en';
  title: string;
  description: string;
  canonical: string;
  robots: string;
  body: string;
}): string {
  const { lang, title, description, canonical, robots, body } = options;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="${robots}">
</head>
<body style="font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6;">
  ${body}
</body>
</html>`;
}

function buildHealthPageHtml(brandName: string, timestampIso: string): string {
  return `<!doctype html>
<html lang="${DEFAULT_LANGUAGE}">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${buildApexTitle()}</title>
    <meta name="robots" content="noindex, nofollow" />
  </head>
  <body style="font-family: system-ui, sans-serif; margin: 0; padding: 2rem; line-height: 1.6;">
    <main style="max-width: 720px; margin: 0 auto;">
      <h1 style="margin: 0 0 1rem;">${brandName}</h1>
      <p><strong>Status:</strong> OK</p>
      <p><strong>Timestamp:</strong> ${timestampIso}</p>
      <p><strong>Domain:</strong> ${SITE_URL}</p>
    </main>
  </body>
</html>`;
}

const app = new Hono();

app.get('/health', (_c) => {
  const timestampIso = new Date().toISOString();
  const html = buildHealthPageHtml(BRAND_NAME, timestampIso);

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
});

app.get('/about', (c) => {
  const lang = detectLanguage(c);
  const isJapanese = lang === 'ja';
  const title = isJapanese ? 'このサイトについて' : 'About';
  const description = isJapanese ? `${SITE_URL} について` : `About ${SITE_URL}`;
  const canonical = `https://${SITE_URL}/about`;
  const body = isJapanese
    ? `
  <h1>このサイトについて</h1>
  <p>本ドメイン（<strong>${SITE_URL}</strong>）は、一般向けのウェブサイトとして運用いたしておりません。</p>
  <p>他のドメインもご訪問ください: <a href="https://umaxica.app">umaxica.app</a>、 <a href="https://umaxica.com">umaxica.com</a>、 <a href="https://umaxica.org">umaxica.org</a>。</p>
  <footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ddd; color: #666; font-size: 0.9rem;">
    <p>&copy; ${new Date().getUTCFullYear()} ${BRAND_NAME}</p>
  </footer>
`
    : `
  <h1>About this site.</h1>
  <p>This domain (<strong>${SITE_URL}</strong>) is not operated as a public-facing website.</p>
  <p>You may also visit our other domains: <a href="https://umaxica.app">umaxica.app</a>, <a href="https://umaxica.com">umaxica.com</a>, <a href="https://umaxica.org">umaxica.org</a>.</p>
  <footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ddd; color: #666; font-size: 0.9rem;">
    <p>&copy; ${new Date().getUTCFullYear()} ${BRAND_NAME}</p>
  </footer>
`;

  const html = buildPageShell({
    lang,
    title: buildApexTitle(title),
    description,
    canonical,
    robots: 'index,follow',
    body,
  });

  return c.html(html);
});

app.get('/', (c) => {
  const redirectUrl = process.env.DEV_CORE_URL ?? 'https://umaxica.dev/';
  return c.redirect(redirectUrl, 301);
});

export { app };
