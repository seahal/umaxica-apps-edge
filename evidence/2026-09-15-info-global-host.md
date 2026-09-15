# Info global host boundary — 2026-09-15

## Scope

P3c aligns the three `info` publishing cells with the already recorded public
host table. `info.umaxica.app`, `info.umaxica.com` and `info.umaxica.org` are
global hosts without a `jp`/`us` host label. Both shared canonical origin slots
therefore resolve to the cell's global host. The nine `docs`, `help` and `news`
cells keep their existing regional origins, and no locale, authentication or
SEO URL policy was changed.

The info dev, VPC dev and build scripts no longer pass the unused
`PUBLIC_REGION`. The private Rails origin and transport boundary are unchanged.

## TDD record

- Red: `pnpm exec vitest run test/publishing-cells.test.ts` failed for the
  three info cells because the invariant still expected `info-jp` and
  `info-us`; the info cell/canonical tests also failed against the old origins.
- Green: the invariant passed with 42 tests, and the representative info
  focused suite (`cell`, `canonical-region`, `publishing-host-policy` and
  `standard-metadata`) passed 12 tests.
- The three info Hurl runners each passed 8 files and 59 requests, including
  canonical and hreflang metadata on the global host.

## Verification

- `pnpm exec oxlint --type-aware --report-unused-disable-directives ...` was
  run sequentially over the changed implementation, test and Vite files in
  all 12 public cells: PASS.
- `pnpm exec oxfmt --check ...` over the changed TypeScript files: PASS.
- `pnpm run check:workers`: PASS, all 20 workers validated.
- `pnpm run check:generated`: PASS; Wrangler type output was up to date. The
  local read-only Wrangler log path emitted EROFS warnings.
- `pnpm run test`: all 20 unit suites passed. Root invariants remained at 623
  passed, 1 skipped and 1 `depcruise` spawn `EPERM`, the baseline failure.
- `pnpm run build`: PASS for all 20 production Vite builds.
- `pnpm run check:size`: the known public bundle budget failure remained at
  about 120.66 kB gzip against the 112 kB limit; no budget was changed.
- `pnpm -r --workspace-concurrency=1 run typecheck`: stopped at the existing
  `app/docs/test/uncovered-components.test.tsx:22` type error. No P3c error was
  reported before the recursive first failure.
- `git diff --check`: PASS.

No Rails code or runtime, production binding, Cloudflare deployment or remote
GitHub write was used. The first parallel typed-lint attempt hit the machine's
thread limit; rerunning the same changed-file checks one unit at a time passed.
