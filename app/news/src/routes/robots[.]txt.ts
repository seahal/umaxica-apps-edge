import { createFileRoute } from '@tanstack/react-router';

import { CANONICAL_ORIGIN } from '../lib/canonical';

/*
 * An ordinary server route. TanStack has no metadata-file convention, so the
 * body is written out here and the `Content-Type` is stated explicitly — with
 * its charset, so no client has to guess the encoding of a file it parses.
 */
export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(`User-Agent: *\nAllow: /\n\nSitemap: ${CANONICAL_ORIGIN}/sitemap.xml\n`, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }),
    },
  },
});
