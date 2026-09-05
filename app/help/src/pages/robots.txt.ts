import type { APIRoute } from 'astro';

import { CANONICAL_ORIGIN } from '../lib/canonical';

/*
 * Ported from `src/routes/robots[.]txt.ts`. Prerendered — the canonical origin
 * is a build-time constant.
 */
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(`User-Agent: *\nAllow: /\n\nSitemap: ${CANONICAL_ORIGIN}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain' },
  });
