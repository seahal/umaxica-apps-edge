import { PUBLIC_REGION } from 'astro:env/client';

/*
 * This frame's public origin, and the only place it is written.
 *
 * `robots.txt`, `sitemap.xml`, every `<link rel="canonical">` and every
 * hreflang alternate name it, and they must not disagree.
 *
 * Region (jp/us) is a build-time input. `PUBLIC_REGION` — validated by the
 * `env.schema` in `astro.config.mjs` — selects the origin, exactly as the
 * TanStack unit hardcoded a single `CANONICAL_ORIGIN` per unit. One build per
 * region.
 */
const ORIGIN_BY_REGION = {
  jp: 'https://help-jp.umaxica.org',
  us: 'https://help-us.umaxica.org',
} as const;

export const CANONICAL_ORIGIN: string = ORIGIN_BY_REGION[PUBLIC_REGION];
