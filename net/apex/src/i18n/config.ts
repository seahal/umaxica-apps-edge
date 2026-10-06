/**
 * This unit's own language facts.
 *
 * Every deployment unit owns this file outright — it is deliberately not
 * imported from a sibling or a shared package, because a unit that reaches
 * across the boundary cannot be extracted into its own repository
 * (`test/deployment-unit-boundaries.test.ts`).
 *
 * `defaultLocale` is the single source of truth for `<html lang>` on every
 * document this unit emits — the JSX renderer, the health page, the status
 * pages — each of which used to carry its own literal.
 * `locales` is the set the request-level language detector accepts.
 * `test/html-lang-contract.test.tsx` pins that the emitters agree.
 */
export const defaultLocale = 'ja';
export const locales = ['en', 'ja'] as const;
