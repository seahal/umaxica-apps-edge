/*
 * The UMAXICA brand title contract, ported verbatim from `src/lib/title.ts`.
 *
 * The separator is an EM DASH (U+2014) with a single space on each side — not a
 * hyphen, not an EN DASH. `api/title-contract.hurl` and the repository-wide
 * suite match the exact character.
 */
export const BRAND_TITLE = 'UMAXICA (ORG)';

export function brandTitle(pageTitle: string): string {
  return `${pageTitle} — ${BRAND_TITLE}`;
}
