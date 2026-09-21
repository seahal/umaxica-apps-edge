# Edge parallel implementation final verification

Date: 2026-09-15

## Scope and review result

The active local branch is `develop`; the current implementation record head is
`37f76d96`. The active code and operations wording head is `0084cafa`, and the
functional implementation head before those documentation-only follow-ups was
`6e26c49e`. The independent slices cover the five Hono apex workers, three
TanStack Core workers and twelve TanStack public content cells. The Rails
Preference contract was audited read-only at the requested SHA. P3b, the
public `lx` URL/SEO integration and authentication-dependent shell, remains
NO-GO because the published URL contract is not approved. P3d, the
Paraglide generation boundary and Core request isolation, is complete.

The final review was performed by the implementing agent; no separate review
agent was available. The review kept the public API client, Core API client and
Core Rails-owned transparent relay as separate contracts. It also checked that
the owner-unknown changes in `AGENTS.md`, `package.json`,
`pnpm-workspace.yaml`, `pnpm-lock.yaml` and the twelve public `wrangler.jsonc`
files were never staged.

## Commands actually run

| Command                                                                  | Result                                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile` and isolated frozen lockfile validation | PASS; the Paraglide dependency set was resolved while the owner-dirty dependency files remained unstaged                       |
| `pnpm -r --workspace-concurrency=1 run test`                             | PASS: all 20 units; apex 107 or 88 per unit, Core app/com 432 and org 439, public 369 per unit                                 |
| `pnpm exec vitest run --dir test`                                        | PASS: 18 root invariant files, 626 passed and 1 skipped                                                                        |
| each unit `test:api`                                                     | PASS: all 20 local Hurl runners; dedicated local servers only                                                                  |
| each unit `test:e2e` sequentially                                        | PASS: all 20 units, 239 Chromium cases                                                                                         |
| `pnpm -r --workspace-concurrency=1 run build`                            | PASS: all 20 production Vite builds; Wrangler emitted only the known read-only log-path warning                                |
| `pnpm run check:workers` and `check:generated`                           | PASS: all 20 workers/types validated                                                                                           |
| `pnpm run check:architecture`                                            | PASS: 29 modules / 51 dependencies                                                                                             |
| `pnpm run check:deps`, `knip`, `check:spelling`                          | PASS                                                                                                                           |
| changed-file Oxfmt, Oxlint, type-aware Oxlint and pre-commit hooks       | PASS                                                                                                                           |
| per-unit typecheck                                                       | PASS for all 20 units after the Workers/DOM fixture overload fix                                                               |
| `pnpm run check`                                                         | PASS: 20 unit static checks, unit tests and root invariants                                                                    |
| per-unit `check:size` after build (旧設定での監査)                       | apex PASS at 48.46–48.56 kB gzip / 52 kB; Core FAIL at 129.82/129, 129.83/129 and 132.97/129; public FAIL at 122.65–122.69/112 |
| `git diff --check`                                                       | PASS                                                                                                                           |

The first sandbox attempts to run local servers and parallel browser tests hit
machine bind/process restrictions. Dedicated sequential local runs completed
the same API and browser suites successfully; they did not use Rails,
production bindings or deployed endpoints. The existing public bundle was
already about 120.66–120.68 kB gzip against the 112 kB budget before P3d; the
current result at that audit was about 122.65–122.69 kB. The later continuation
review explicitly approved a 150 kB ceiling for all fifteen TanStack Start
units while retaining Apex's 52 kB ceiling; that change is recorded in
`evidence/2026-09-17-tanstack-size-budget.md`.

The earlier root `check` failure came from 64 tracked stale `.astro` metadata
files and the public fixture overload; both were removed or corrected in the
hygiene follow-up. The active code and operations documentation then received
the documentation-only Astro wording cleanup in `0084cafa`; its root invariant
and format checks passed. The size result is recorded as a performance
follow-up. No skipped test, suppression or threshold reduction was used to make
the checks green.

## Commits and remaining verification

The implementation commits are `4929730c`, `5bc6538c`, `eca6a58b`,
`963377c3`, `f92e2c8e`, `8fc13a12`, `9b78df1e`, `88a2f907`, `f8fadf08`,
`0f83b4d6`, `86404e2e`, `d9c32ce2`, `84d6f22f`, `197b5e8b`, `6e26c49e`,
`0084cafa`, `b15f0ae8` and `f4d94584`, with the
stage-specific evidence files in this directory. The plan, ADR and this
record were updated after the P3d verification in a separate documentation
commit. The current owner-unknown worktree changes are the root `AGENTS.md`,
`package.json`, twelve public `wrangler.jsonc` files, `pnpm-workspace.yaml` and
`pnpm-lock.yaml`; they remain unstaged and uncommitted. A current-head rerun is
recorded in `evidence/2026-09-17-edge-final-audit.md`.

Production Cloudflare bindings, real workerd/VPC behavior, live Rails response
schemas, Rails request-ID adoption, Rails authentication E2E, existing browser
Hono service-worker retirement, SEO publication policy and deployment were not
performed. The production binding fail-fast follow-up remains an existing
issue without an invented issue number. No Rails code, Rails runtime, remote
GitHub state or Cloudflare deployment was changed.
