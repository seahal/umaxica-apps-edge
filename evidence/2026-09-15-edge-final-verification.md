# Edge parallel implementation final verification

Date: 2026-09-15

## Scope and review result

The active local branch is `develop`; the current implementation head is
`197b5e8b`. The independent slices cover the five Hono apex workers, three
TanStack Core workers and twelve TanStack public content cells. The Rails
Preference contract was audited read-only at the requested SHA. P3b, the
public `lx` URL/SEO integration and authentication-dependent shell, remains
NO-GO because the published URL contract is not approved. P3d, the
Paraglide generation boundary and Core request isolation, is complete.

The final review was performed by the implementing agent; no separate review
agent was available. The review kept the public API client, Core API client and
Core Rails-owned transparent relay as separate contracts. It also checked that
the owner-unknown changes in `AGENTS.md`, `pnpm-workspace.yaml`,
`pnpm-lock.yaml` and the twelve public `wrangler.jsonc` files were never staged.

## Commands actually run

| Command                                                                  | Result                                                                                                                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile` and isolated frozen lockfile validation | PASS; the Paraglide dependency set was resolved while the owner-dirty dependency files remained unstaged                                         |
| `pnpm -r --workspace-concurrency=1 run test`                             | PASS: all 20 units; apex 107 or 88 per unit, Core app/com 432 and org 439, public 369 per unit                                                   |
| `pnpm exec vitest run --dir test`                                        | PASS: 18 root invariant files, 626 passed and 1 skipped                                                                                          |
| each unit `test:api`                                                     | PASS: all 20 local Hurl runners; dedicated local servers only                                                                                    |
| each unit `test:e2e` sequentially                                        | PASS: all 20 units, 239 Chromium cases                                                                                                           |
| `pnpm -r --workspace-concurrency=1 run build`                            | PASS: all 20 production Vite builds; Wrangler emitted only the known read-only log-path warning                                                  |
| `pnpm run check:workers` and `check:generated`                           | PASS: all 20 workers/types validated                                                                                                             |
| `pnpm run check:architecture`                                            | PASS: 29 modules / 51 dependencies                                                                                                               |
| `pnpm run check:deps`, `knip`, `check:spelling`                          | PASS                                                                                                                                             |
| changed-file Oxfmt, Oxlint, type-aware Oxlint and P3d pre-commit hook    | PASS                                                                                                                                             |
| per-unit typecheck                                                       | PASS for five apex and three Core units; public 12 remain blocked by the existing `test/uncovered-components.test.tsx(22,24)` fixture type error |
| `pnpm run check`                                                         | FAIL at existing generated `.astro` format diagnostics in app/docs; the root command stops there                                                 |
| per-unit `check:size` after build                                        | apex PASS at 48.46–48.56 kB gzip / 52 kB; Core FAIL at 129.82/129, 129.83/129 and 132.97/129; public FAIL at 122.65–122.69/112                   |
| `git diff --check`                                                       | PASS                                                                                                                                             |

The first sandbox attempts to run local servers and parallel browser tests hit
machine bind/process restrictions. Dedicated sequential local runs completed
the same API and browser suites successfully; they did not use Rails,
production bindings or deployed endpoints. The existing public bundle was
already about 120.66–120.68 kB gzip against the 112 kB budget before P3d; the
current result is about 122.65–122.69 kB. No budget was raised.

The root `check` failure and the public fixture typecheck failure match the
baseline. The size result is recorded as a performance follow-up. No skipped
test, suppression, threshold reduction or generated-file cleanup was used to
make these results green.

## Commits and remaining verification

The implementation commits are `4929730c`, `5bc6538c`, `eca6a58b`,
`963377c3`, `f92e2c8e`, `8fc13a12`, `9b78df1e`, `88a2f907`, `f8fadf08`,
`0f83b4d6`, `86404e2e`, `d9c32ce2`, `84d6f22f` and `197b5e8b`, with the
stage-specific evidence files in this directory. The plan, ADR and this
record were updated after the P3d verification in a separate documentation
commit.

Production Cloudflare bindings, real workerd/VPC behavior, live Rails response
schemas, Rails request-ID adoption, Rails authentication E2E, existing browser
Hono service-worker retirement, SEO publication policy and deployment were not
performed. The production binding fail-fast follow-up remains an existing
issue without an invented issue number. No Rails code, Rails runtime, remote
GitHub state or Cloudflare deployment was changed.
