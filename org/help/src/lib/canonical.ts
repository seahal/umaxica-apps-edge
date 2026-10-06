import { CANONICAL_ORIGINS } from './publishing-cell';

/*
 * This unit's public origin, and the only place it is chosen.
 *
 * `robots.txt`, `sitemap.xml`, every `<link rel="canonical">` and every hreflang
 * alternate name it, and they must not disagree.
 *
 * Regional cells use a build-time `PUBLIC_REGION` input: `vite.config.ts`
 * replaces it with a literal, so one build serves one region. The global info
 * cells keep this shared module's shape but map both origin slots to the same
 * host and do not define a region value. Anything other than `us` — including
 * an unset variable under Vitest — selects `jp` for a regional cell.
 */
export const CANONICAL_ORIGIN: string =
  import.meta.env.PUBLIC_REGION === 'us' ? CANONICAL_ORIGINS.us : CANONICAL_ORIGINS.jp;
