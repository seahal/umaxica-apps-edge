# Paraglide locale boundary verification

Date: 2026-09-15

## Scope

Commit `197b5e8b` implements the Rails-independent part of P3d for all fifteen
TanStack Start units. Each unit owns its `project.inlang`, `messages/{ja,en}.json`,
Paraglide Vite configuration and generated output settings. The public twelve
keep the existing `/{lang}/...` URL, canonical, hreflang and sitemap behavior.
The public `lx` URL/SEO integration is still the separately held P3b slice.

The Rails reference was inspected read-only at
`7bee4819ffe2a402c63a04af2a368bfcaf253c0d`. The checked facts are locales
`ja`/`en`, the `language` Cookie name, lowercased supported locale values, and
`lx` as request context. No Rails source, runtime, database or authentication
flow was changed or run.

## Implemented boundary

- All fifteen units use only the `custom-edge-locale` and `baseLocale`
  Paraglide strategies. Cookie, `Accept-Language`, navigator, localStorage and
  path prefix are not new fallback or persistence mechanisms.
- The public twelve use generated messages through the existing path locale
  adapter. Their pure display-locale resolver tests record the Rails value
  contract without connecting `lx` or Cookie selection to public URL rendering.
- The three Core workers validate `lx` or the Rails `language` Cookie before
  removing the incoming Cookie. They pass only a validated request-local
  display-locale header to server-side Paraglide middleware; a forged internal
  header is overwritten. The client reads the validated HTML `lang` and locale
  switching has no Cookie, JWT, DB, localStorage or URL write.

## TDD and verification

The first root title invariant run after the migration produced six failures
because it assumed the deleted local dictionaries and old page-title shape.
The invariant was updated to check the generated catalog and title boundary;
the focused tests then passed. Core tests also cover concurrent `ja` and `en`
requests and verify that the locale does not cross request boundaries.

The following checks were run after the implementation:

- `pnpm -r --workspace-concurrency=1 run test`: all 20 units passed. The
  counts were apex 107 or 88 per unit, Core app/com 432 and org 439, and each
  public unit 369 tests.
- `pnpm exec vitest run --dir test`: 18 root invariant files, 626 passed and
  1 skipped.
- `pnpm -r --workspace-concurrency=1 run build`: all 20 production builds
  passed.
- `pnpm run check:workers`, `check:generated`, `check:architecture`,
  `check:deps`, `knip` and `check:spelling`: passed. Targeted Oxfmt, Oxlint,
  type-aware Oxlint and the commit hook passed for the changed scope.
- Each unit's `test:api` passed against its own dedicated local server. Each
  unit's `test:e2e` passed in sequential Chromium runs: 239 cases total.
  The runs did not use Rails, production bindings or a deployed endpoint.

Known checks that remain separate from this slice are recorded in the final
verification: public unit typecheck still reports the existing
`test/uncovered-components.test.tsx(22,24)` fixture error; root `check` stops
at existing generated `.astro` format diagnostics; and the existing size
budgets remain over limit. The public bundle comparison was about
120.66–120.68 kB gzip before this migration and 122.65–122.69 kB afterward
against the 112 kB limit. No budget was raised.

## Holds

Public `lx` URL migration, invalid-`lx` URL normalization, canonical/hreflang/
sitemap policy, region links, JWT/authentication/dashboard work, live VPC and
Rails response verification, existing browser service-worker retirement, and
production binding fail-fast remain outside this commit. No remote GitHub
write, Cloudflare deployment or Rails change was performed.
