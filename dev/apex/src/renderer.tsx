/** @jsxImportSource hono/jsx */
import { jsxRenderer } from 'hono/jsx-renderer';

import { styleUrl } from './assets';
import type { ApexEnv } from './create-apex-app';
import { defaultLocale } from './i18n/config';
import { rendererBindings } from './renderer-bindings';
import { SeoHead } from './seo';
import { AppShell } from './shell';

/*
 * The stylesheet is Tailwind's output, compiled from `src/style.css` by Vite
 * and served as a static asset — which Cloudflare matches before the Worker
 * runs, so it costs no invocation and is cached once for every document this
 * unit serves. Its filename carries a content hash, so `public/_headers` can
 * mark it `immutable`; see `assets.ts`.
 *
 * It replaced an inline `<style>` whose sha256 was hand-maintained in the CSP.
 * The hash bought nothing: `style-src` already listed `'self'`, which is what
 * permits this link, so the policy is now strictly `'self'` and one fewer
 * constant has to be kept in step with the stylesheet by hand. The same
 * reasoning is why a hashed filename changes nothing about the policy.
 *
 * `data-theme` is the one thing on this document that varies by request beyond
 * its content: it is absent unless the `theme` cookie forces a scheme, and its
 * absence is what leaves `prefers-color-scheme` in charge. See `theme.ts`.
 */
export const renderer = jsxRenderer<ApexEnv>(({ children }, c) => {
  const { year, brandName, language, theme, brand } = rendererBindings(c);
  return (
    <html lang={defaultLocale} data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <SeoHead c={c} brand={brand} />
        <link rel="stylesheet" href={styleUrl} />
      </head>
      <body class="flex min-h-screen flex-col bg-gray-50 leading-body text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <AppShell brandName={brandName} year={year} language={language}>
          {children}
        </AppShell>
      </body>
    </html>
  );
});
