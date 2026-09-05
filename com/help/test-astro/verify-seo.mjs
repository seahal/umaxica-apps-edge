/*
 * JS-disabled indexable-content check for the Astro build (plan §6b).
 *
 * Reads the built static HTML in `dist/astro/client/**` — the exact bytes a
 * crawler or a JS-disabled browser receives — and asserts, structurally (no
 * per-unit copy hardcoded, so this file is byte-identical across all twelve
 * frames), that every public page carries its title, description, canonical,
 * hreflang, <h1>, body copy and internal navigation in the initial HTML, with
 * no `client:only` island and no inline `<script>`.
 *
 * Run: `pnpm --dir <unit> run astro:verify`
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const clientDir = fileURLToPath(new URL('../dist/astro/client/', import.meta.url));
let failures = 0;
const fail = (f, msg) => {
  failures += 1;
  console.error(`  x  ${f}: ${msg}`);
};
const pass = (f, msg) => console.log(`  ok ${f}: ${msg}`);

function read(rel) {
  const p = clientDir + rel;
  if (!existsSync(p)) {
    fail(rel, 'file not built');
    return null;
  }
  return readFileSync(p, 'utf8');
}

// Brand/frame/tld are recovered from the built canonical URL, not hardcoded.
const home = read('ja/index.html');
const brandMatch = home?.match(/<title>[^<]+ [\u2014] (UMAXICA \((APP|COM|ORG)\))<\/title>/u);
const canonMatch = home?.match(
  /<link rel="canonical" href="(https:\/\/[a-z]+-jp\.umaxica\.(app|com|org))\/ja\/">/u,
);
const origin = canonMatch?.[1];
if (brandMatch && origin) pass('setup', `brand ${brandMatch[1]}, origin ${origin}`);
else fail('setup', 'could not recover brand/origin from ja/index.html');
const brandSuffix = brandMatch?.[1] ?? 'UMAXICA (APP)';

// Every locale-prefixed content page: initial HTML must stand alone for indexing.
const CONTENT_PAGES = [];
for (const lang of ['ja', 'en']) {
  for (const sub of ['', 'about/']) {
    CONTENT_PAGES.push({
      file: `${lang}/${sub}index.html`,
      lang,
      canonical: `${origin}/${lang}/${sub}`,
    });
  }
}

for (const page of CONTENT_PAGES) {
  const html = read(page.file);
  if (html === null) continue;
  const f = page.file;

  if ((html.match(/<title[ >]/gu) ?? []).length === 1) pass(f, 'exactly one <title>');
  else fail(f, 'expected exactly one <title>');

  if (
    new RegExp(`<title>[^<]+ [\\u2014] ${brandSuffix.replace(/[()]/gu, '\\$&')}</title>`, 'u').test(
      html,
    )
  ) {
    pass(f, 'title suffix + EM DASH');
  } else fail(f, `title missing " \u2014 ${brandSuffix}"`);

  if (/<meta name="description" content="[^"]+"/u.test(html)) pass(f, 'meta description');
  else fail(f, 'no meta description');

  if (html.includes(`<link rel="canonical" href="${page.canonical}">`))
    pass(f, 'canonical (trailing slash)');
  else fail(f, `canonical != ${page.canonical}`);

  for (const hl of ['ja', 'en', 'x-default']) {
    if (new RegExp(`<link rel="alternate" hreflang="${hl}" href="${origin}/`, 'u').test(html))
      pass(f, `hreflang ${hl}`);
    else fail(f, `hreflang ${hl} missing`);
  }

  if (new RegExp(`<html lang="${page.lang}"`, 'u').test(html))
    pass(f, `<html lang="${page.lang}">`);
  else fail(f, `<html lang> != ${page.lang}`);

  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/u);
  if (h1 && h1[1].trim().length > 3) pass(f, `<h1> present ("${h1[1].trim().slice(0, 24)}...")`);
  else fail(f, '<h1> missing or empty');

  const bodyText = html
    .replace(/<[^>]+>/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (bodyText.length > 120) pass(f, `body copy present (${bodyText.length} chars)`);
  else fail(f, 'body copy too thin');

  if (new RegExp(`href="/${page.lang}/(about/)?"`, 'u').test(html)) pass(f, 'internal nav links');
  else fail(f, 'no internal nav links');

  if (/<img\b/u.test(html) && /<img\b(?![^>]*\balt=)/u.test(html)) fail(f, '<img> without alt');
  else pass(f, 'no <img> without alt');

  if (/<script(?![^>]*\bsrc=)[^>]*>[^<]/u.test(html)) fail(f, 'inline <script> with content');
  else pass(f, 'no inline <script>');

  if (/client:only/u.test(html) || /astro-island/u.test(html))
    fail(f, 'island / client:only on SEO page');
  else pass(f, 'no island / client:only');
}

// Machine surfaces: shape, not indexability.
const robots = read('robots.txt');
if (robots && robots.includes('Sitemap:') && robots.includes('User-Agent:'))
  pass('robots.txt', 'points at sitemap');
else fail('robots.txt', 'missing Sitemap: or User-Agent:');

const sitemap = read('sitemap.xml');
if (
  sitemap &&
  /<urlset/u.test(sitemap) &&
  sitemap.includes('/ja/about/') &&
  sitemap.includes('/en/about/') &&
  sitemap.includes('hreflang="en"')
) {
  pass('sitemap.xml', 'all locales + all public pages + alternates');
} else fail('sitemap.xml', 'not widened to ja/en x all pages');

const manifest = read('manifest.webmanifest');
try {
  const m = JSON.parse(manifest ?? '{}');
  if (m.name && m.start_url && m.display && Array.isArray(m.icons) && m.icons.length > 0)
    pass('manifest.webmanifest', 'installable keys present');
  else fail('manifest.webmanifest', 'missing installable keys');
} catch {
  fail('manifest.webmanifest', 'not valid JSON');
}

// `/health.json` is apex-only. Content frames answer liveness on `/health`.
if (existsSync(clientDir + 'health.json'))
  fail('health.json', 'must not be prerendered on a content frame');

// The service worker precaches `/offline` and `/offline/` — whichever spelling the host serves as 2xx.
const serviceWorker = read('service-worker.js');
if (serviceWorker && serviceWorker.includes("'/offline'") && serviceWorker.includes("'/offline/'"))
  pass('service-worker.js', 'precaches /offline and /offline/');
else fail('service-worker.js', 'OFFLINE_URLS missing');

// 404 + offline: single-locale ja, one conforming <title>, no inline script.
for (const file of ['404.html', 'offline/index.html']) {
  const html = read(file);
  if (html === null) continue;
  const titleOk =
    (html.match(/<title[ >]/gu) ?? []).length === 1 &&
    new RegExp(`[\\u2014] ${brandSuffix.replace(/[()]/gu, '\\$&')}</title>`, 'u').test(html);
  if (titleOk) pass(file, 'one conforming <title>');
  else fail(file, 'title contract');
  if (/<html lang="ja"/u.test(html)) pass(file, '<html lang="ja">');
  else fail(file, 'lang != ja');
  if (/<script(?![^>]*\bsrc=)[^>]*>[^<]/u.test(html)) fail(file, 'inline <script>');
  else pass(file, 'no inline <script>');
}

// Nothing under dist/astro/client should carry an inline module script.
for (const lang of ['ja', 'en']) {
  for (const entry of readdirSync(clientDir + lang, { withFileTypes: true })) {
    const rel = entry.isDirectory() ? `${lang}/${entry.name}/index.html` : `${lang}/${entry.name}`;
    if (!rel.endsWith('.html')) continue;
    const html = read(rel);
    if (html && /<script(?![^>]*\bsrc=)[^>]*>[^<]/u.test(html)) fail(rel, 'inline <script>');
  }
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
