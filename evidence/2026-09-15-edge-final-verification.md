# Edge parallel implementation final verification

## Scope and review result

The active local branch is `develop`; the functional implementation was
completed at `86404e2e` and its type-only follow-up is `d9c32ce2`, before the
documentation/evidence commit `bd3d3ec5`. The completed independent slices cover the five Hono
apex workers, three TanStack Core workers and twelve TanStack public content
cells. P3 (Rails Preference contract, Paraglide locale precedence,
authentication-dependent shell and SEO URL policy) remains NO-GO because the
Rails reference implementation is not present in this workspace. No Rails
source or runtime was used.

The final review was performed by the implementing agent; no separate review
agent was available. The review kept the public API client, Core API client and
Core Rails-owned transparent relay as separate contracts. It also checked that
the owner-unknown worktree changes in `pnpm-workspace.yaml`, `pnpm-lock.yaml`,
the twelve public `wrangler.jsonc` files and the unrelated root changes were
not staged.

## Commands actually run

| Command                                           | Result                                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                  | PASS at baseline; no dependency files were changed by this work                                                       |
| `pnpm -r --workspace-concurrency=1 run test`      | PASS: all 20 units; apex 107/107 or 88/88, Core 420/420 or 427/427, public 359/359 each                               |
| `pnpm run test`                                   | Unit fan-out PASS; root invariants 623 passed, 1 skipped, 1 failed on `depcruise` `spawnSync EPERM`                   |
| `pnpm run test:api`                               | PASS: all 20 unit runners and their Hurl files; local servers only                                                    |
| `pnpm -r --workspace-concurrency=1 run test:e2e`  | PASS: all 20 units, 235 Chromium cases                                                                                |
| `pnpm run build`                                  | PASS: all 20 production Vite builds; Wrangler emitted only the known read-only log-path warning                       |
| `pnpm run check:workers`                          | PASS: 20 workers validated                                                                                            |
| `pnpm run check:generated`                        | PASS: all 20 generated type checks                                                                                    |
| `pnpm run check:architecture`                     | PASS: 29 modules / 51 dependencies, no violations                                                                     |
| `pnpm run check:deps`                             | PASS                                                                                                                  |
| `pnpm run knip`                                   | PASS: all 20 units                                                                                                    |
| changed-file Oxfmt/Oxlint/type-aware Oxlint       | PASS                                                                                                                  |
| `pnpm run check:size`                             | FAIL: public bundles 120.66–120.68 kB gzip against the 112 kB limit                                                   |
| `pnpm run check`                                  | FAIL at existing generated `.astro` format diagnostics                                                                |
| `pnpm run lint`                                   | FAIL at the same existing generated `.astro` diagnostics                                                              |
| `pnpm -r --workspace-concurrency=1 run typecheck` | New `request-log` error fixed; then existing `app/docs/test/uncovered-components.test.tsx` type error stopped the run |
| `pnpm run lint:types`                             | FAIL at Wrangler `listen EPERM` in the local environment                                                              |
| `pnpm run check:spelling`                         | FAIL: same 16 existing fixture/tool markers as baseline                                                               |
| `git diff --check`                                | PASS                                                                                                                  |

The first parallel E2E attempt hit a machine process limit and one
`org/news` timing failure. The affected unit was rerun successfully, followed
by the full sequential command above. The bundle budget failure was compared
against an old-source build under the same current dependency tree and
remained; the budget was not raised.

The HTTP, browser and production-build commands above ran against
`86404e2e`. `d9c32ce2` only replaces a repeated `toUpperCase()` expression with
a typed local variable in the fifteen identical log modules; it changes no
runtime branch or output. The complete unit tests and the subsequent typecheck
were rerun after that follow-up.

## Boundaries left for external verification

Production Cloudflare bindings, real workerd/VPC behavior, live Rails response
schemas, Rails request-ID adoption, Rails authentication E2E, existing browser
Hono service-worker retirement, and deployment were not performed. The
production binding fail-fast follow-up remains an existing issue without a
newly invented issue number.
