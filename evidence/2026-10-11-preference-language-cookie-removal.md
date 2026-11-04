# Preference language Cookie removal

Date: 2026-10-11. Repository branch: `feature`.

## Implementation review

- Core (`app`, `com`, `org`) locale resolution accepts URL only: last scalar
  `lx`, lowercase validation, then existing `ja` default. Cookie parsing and
  fallback were removed, including the 429 locale source.
- Removed `src/lib/display-locale.ts` and its dedicated test from each of the
  twelve Docs/Help/Info/News cells. Searches found no production consumers.
- Core still overwrites the internal display locale header and strips Cookie
  before TanStack; application Set-Cookie stripping is unchanged.
- Rails dispatch, route ownership, Paraglide adapters, public routes and SEO
  implementation are unchanged. No replacement persistence or API was added.
- Repository searches covered `LANGUAGE_COOKIE_NAME`, `resolveDisplayLocale`,
  language Cookie descriptions, Cookie-derived locale, the internal locale
  header and raw Cookie reads. Remaining Core Cookie reads are forwarding tests;
  historical ADR/plan fallback descriptions are marked superseded. Existing
  dev/net apex language detectors retain their separate, out-of-scope contract.
- Pre-existing package/configuration and security-document edits were preserved.

## Completed validation

- `pnpm install`: succeeded.
- `pnpm -r --workspace-concurrency=1 run build`: succeeded for all 17 units.
  Initial parallel build failed with EAGAIN and sandbox Wrangler log EROFS;
  sequential retry with permitted filesystem access succeeded. Vite emitted
  CSS sourcemap warnings.
- `pnpm run check:size`: succeeded for all 17 units.
- `git diff --check`: succeeded.
- `RAYON_NUM_THREADS=2 pnpm run check`: exit 0. Format, lint, typed lint,
  generated checks, typecheck, dead code, worker contracts, architecture,
  dependency synchronization, spelling and all unit suites succeeded. Root
  invariant suite: 643 passed, 1 skipped. Initial newly added com Core test
  fixtures used an app hostname and failed host validation; com/org fixtures
  were corrected before this successful final run.
- Core mocked-boundary tests confirmed inbound Cookie removal, all application
  Set-Cookie removal, forged internal locale overwrite, Cookie-independent
  locale (including 429), and unchanged Rails Cookie/CSRF forwarding. The
  mocked handler and Rails fetch expose internal transport unavailable to an
  external HTTP client.
- `pnpm -r --workspace-concurrency=1 run test:api`: exit 0 across all 17
  units, including existing contracts and nonce isolation canaries. New Core
  locale contract files passed in all 3 cores (8 requests each); new public
  Cookie independence files passed in all 12 cells (4 requests each). They
  verified URL/default SSR locale, ignored forged headers, no application
  Set-Cookie, path HTML lang, canonical/hreflang and root Accept-Language
  negotiation with conflicting language Cookies.
- Evidence formatting and spelling checks succeeded; `pnpm run test:repo`
  after adding this record succeeded (643 passed, 1 skipped).
