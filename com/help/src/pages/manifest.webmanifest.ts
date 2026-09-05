import type { APIRoute } from 'astro';

/*
 * The Web App Manifest. Ported from `src/routes/manifest[.]webmanifest.ts`.
 * `start_url` points at `/ja/` now that the bare `/` is a negotiating redirect.
 */
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: 'UMAXICA Help (com)',
      short_name: 'UMAXICA Help',
      start_url: '/ja/',
      display: 'standalone',
      background_color: '#f9fafb',
      theme_color: '#ffffff',
      icons: [{ src: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' }],
    }),
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
