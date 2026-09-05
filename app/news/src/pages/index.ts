import type { APIRoute } from 'astro';

import { negotiateLocale } from '../i18n';

/*
 * `/` negotiates a language and redirects. There is deliberately no default
 * landing page — the plan calls for "デフォルトはないけど、どっちかにいってもらう".
 *
 * On-demand (not prerendered) so it can read `Accept-Language`. This is one of
 * only two Worker-served routes on this unit (the other is `/health`); every
 * real page is a static file. There is no Astro `i18n` config block, so this
 * endpoint owns `/` → `/ja/` or `/en/` without a framework redirect competing.
 */
export const prerender = false;

export const GET: APIRoute = ({ request, url }) => {
  const locale = negotiateLocale(request.headers.get('accept-language'));
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL(`/${locale}/`, url).href,
      'Cache-Control': 'no-store',
      Vary: 'Accept-Language',
    },
  });
};
