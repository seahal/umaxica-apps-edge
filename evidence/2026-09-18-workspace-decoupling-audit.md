# Workspace decoupling audit

Scope: the 20 units listed in `pnpm-workspace.yaml`, branch `feature`.

## Method

- Every tracked, non-binary, non-`.md` file under a unit was scanned for `../`
  path tokens, and each was resolved against its own directory: 0 resolve
  outside their unit (root or sibling). `'..'` path-segment joins: all are a
  single `'..'` from `test/` or `api/` to the unit root.
- Bare import specifiers (1450 across the 20 units) compared against each
  unit's own `package.json`: 0 undeclared.
- CSS `@import`/`@plugin`, `wrangler.jsonc` `main`, and `tsconfig.json`
  `types` compared against declared dependencies: 5 violations (below).
- No `workspace:`/`link:`/`file:` specifier or sibling package name in any
  unit manifest. Every unit owns its tsconfig, Vite, Vitest, Playwright, Knip,
  Oxlint, Oxfmt, Wrangler and (frames) inlang config; no `extends` leaves a unit.

## Findings

1. `{app,com,dev,net,org}/apex/tsconfig.json` list `"node"` in `types` (and
   their tests import `node:fs`/`node:path`), but none declared
   `@types/node`; it resolved only through root hoisting. Fixed by adding
   `"@types/node": "catalog:"` to each apex `devDependencies`.
2. `test/deployment-unit-boundaries.test.ts` flagged a relative import only when
   it resolved into ANOTHER unit; `unit -> repo root` passed. It also scanned
   only JS/TS sources. Strengthened (see below).

## Invariants added

- Relative imports must resolve inside their own unit (root now counts).
- Any `../` token in any implementation file (json, jsonc, css, yaml, scripts…)
  must resolve inside its own unit.
- Every `tsconfig.json` `types` entry must be a declared dependency.

Each was probed with a planted violation (`app/core -> ../../tools/shared`,
`org/docs/*.json -> ../../scripts/x.mjs`, `@types/node` removed from
`net/apex`) and failed as expected, then the probe was removed.

## Follow-up: split path construction

Added a check for `resolve(...)` / `join(...)` / `path.x(...)` in files that
import `node:path`. A call is judged only when its first argument is
`import.meta.dirname`, `__dirname` or `process.cwd()` and every other argument
is a string literal; the result is resolved and must stay inside the unit.
Planted probe in `app/core/test/`: 4 escapes flagged (`-> tools`,
`-> app/shared`, `-> app/something`, `-> scripts/x.mjs`); an in-unit call, a
call with a dynamic argument and `[1, 2].join('..')` were not. Probe removed.

## Verification

- Five apex units: `format:check`, `lint`, `lint:types`, `check:generated`,
  `typecheck`, `knip`, `test`, `build`, `check:size`, `test:api` all pass.
- `test:e2e`: first attempt failed identically with and without the change
  because Chromium was not installed. After `pnpm exec playwright install
chromium` (headless shell v1243), `pnpm -C <unit> run test:e2e` passed in all
  20 units: 224 tests, 0 failed.
- Root: `check:architecture`, `check:deps`, `pnpm run check` pass (root
  32 files / 369 tests).
