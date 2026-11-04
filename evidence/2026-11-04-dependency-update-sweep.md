# Dependency update sweep

Date: 2026-11-04

Scope: the Claude cloud session branch, starting from `feature` at
`92d845c`, all twenty deployment units. Run with the pinned pnpm 12.11.2
(`pnpm dlx pnpm@12.11.2`) on Node 22.23.4; `devEngines` asks for Node 24.21.0
and only warned.

## Changes

- `pnpm update -r`: in-range bumps to the catalog and lockfile (`d1f6059`).
- `@vitest/coverage-v8` aligned with `vitest`; the incoming `feature` commit had
  bumped only `vitest` to 5.0.5, leaving an unmet exact peer.
- knip 6.44 reported the `cloudflare` entry in every frame's
  `ignoreDependencies` as a stale configuration hint; removed in all fifteen.
- Past catalog ranges (`8c20d3b`): vitest and coverage-v8 5.1.0, oxlint 1.90.0,
  oxfmt ^0.75.0, inlang plugin-m-function-matcher 2.4.1 and plugin-message-format
  4.5.7.
- `@inlang/paraglide-js` 2.27.0 -> 3.0.0 (`1fbabbe`), published
  2026-11-03T01:35Z, older than `minimumReleaseAge` (1440 min). No source change.
- `test/html-title-contract.test.ts` failed `oxfmt --check` before any update;
  reformatted separately (`9758cc7`).

## Verification (after the final commit's tree)

- `pnpm run check`: exit 0.
- `pnpm run build` and `pnpm run check:size`: exit 0 (e.g. app/help 121.68 kB of
  150 kB, app/apex 53.84 kB of 59 kB).
- `pnpm run test:api`: exit 0, 20 units, 957 Hurl files executed, 0 failed.
- `pnpm peers check`: no issues.
- `pnpm outdated -r`: empty.
- `pnpm audit`: 2 high, both on the existing ignore list (`GHSA-jmr9-qjv8-65gv`,
  `GHSA-7pqw-9j4j-h8q3`, `extract-zip@2.0.1` via `@orangeopensource/hurl`).
  Still unfixable: npm lists no extract-zip after 2.0.1 and hurl 8.1.0 pins it.
- `pnpm run test:e2e` was not run.

## Coverage

Before: the three cores failed their 100% per-file thresholds on
`src/lib/client-ip.ts`, `src/lib/core-dispatch.ts` and
`src/lib/rails-body-limit.ts` (app/core: 98.6% statements, 98.85% branches,
97.23% functions, 99.37% lines). The other seventeen units were at 100%.

Fix: tests for the uncovered cancel-failure, non-byte-chunk and
reject-after-ceiling paths, plus IPv6 edge cases; `isIpv6` now finds `::` with
`indexOf` instead of indexing `split` results, removing two unreachable `?? ''`
arms without changing which inputs are accepted.

After: `pnpm --dir <unit> run test:cov` exits 0 in all twenty units, each at
100% statements, branches, functions and lines. `pnpm run check`: exit 0.
