import { styleUrl } from './assets';
import { BRAND_TLD, buildBrandTitle, DEFAULT_BRAND_NAME } from './brand';
import { defaultLocale } from './i18n/config';
import { themeAttributeMarkup, type ThemeAttribute } from './theme';

/*
 * The status, 404 and 429 documents are chrome-free by design (see
 * docs/design/ui-shell-contract.md §15) but no longer unstyled: they link the
 * same compiled stylesheet as every other document this unit serves, which the
 * assets binding answers without invoking the Worker.
 *
 * The three class strings are constants because Tailwind scans this file as
 * plain text — a class name assembled at runtime would not be generated.
 *
 * They carry the same `dark:` variants as the shell, and each document takes
 * `data-theme` from the request for the same reason `renderer.tsx` does: these
 * are separate root documents, so a scheme forced on the page a reader came
 * from does not reach them on its own (`theme.ts`).
 *
 * This module exists so `rate-limit.ts` and `create-apex-app.ts` answer with
 * the SAME document. The 429 used to be a bare `Response('Too Many Requests')`
 * — no title, no `Content-Type`, no `Cache-Control` — which made the one
 * response an attacker can elicit on demand the only unstyled, untitled,
 * cacheable page on the origin. Extracting the helper rather than copying the
 * markup is what keeps that from drifting back apart.
 */
const STATUS_STYLESHEET = `<link rel="stylesheet" href="${styleUrl}">`;
const STATUS_BODY =
  'grid min-h-screen place-content-center gap-3 bg-canvas p-6 text-center text-gray-900 leading-body dark:text-gray-100';
const STATUS_HEADING = 'text-2xl font-semibold leading-heading';

export function statusPage(
  status: number,
  title: string,
  theme: ThemeAttribute,
  locale = defaultLocale,
  linkHref = '/',
  linkLabel = 'トップへ戻る',
) {
  const reloadLabel = locale === 'ja' ? '再読み込み' : 'Reload';
  const reload = status >= 500 ? '<a href="">' + reloadLabel + '</a> · ' : '';
  return new Response(
    `<!doctype html><html lang="${locale}"${themeAttributeMarkup(theme)}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${buildBrandTitle(title, { brandName: DEFAULT_BRAND_NAME, tld: BRAND_TLD })}</title>${STATUS_STYLESHEET}</head><body class="${STATUS_BODY}"><main class="grid gap-3"><h1 class="${STATUS_HEADING}">${title}</h1><p>HTTP ${status}</p><p>${reload}<a class="text-brand" href="${linkHref}">${linkLabel}</a></p></main></body></html>`,
    {
      status,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=UTF-8' },
    },
  );
}

export function notFoundPage(language: string | undefined, theme: ThemeAttribute): Response {
  const locale = language === 'ja' ? 'ja' : 'en';
  return statusPage(
    404,
    locale === 'ja' ? 'ページが見つかりません' : 'Page not found',
    theme,
    locale,
    '/about',
    locale === 'ja' ? 'このURLについて' : 'About this URL',
  );
}

export function errorPage(
  status: number,
  language: string | undefined,
  theme: ThemeAttribute,
): Response {
  const locale = language === 'ja' ? 'ja' : 'en';
  const title =
    status >= 500
      ? locale === 'ja'
        ? '現在、このページを表示できません'
        : 'This page is currently unavailable'
      : locale === 'ja'
        ? 'リクエストを処理できませんでした'
        : 'The request could not be processed';
  return statusPage(
    status,
    title,
    theme,
    locale,
    '/about',
    locale === 'ja' ? 'このURLについて' : 'About this URL',
  );
}
