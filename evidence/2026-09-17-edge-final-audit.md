# Edge final audit at current HEAD

Date: 2026-09-17

## Repository state

The audit ran in `/home/edge/workspace` on branch `develop` at
`37f76d9604bc86b24ec5a13dfab7949f657efb0a`. There is one worktree. No
conflict is present and no file was staged for this audit before this record was
created.

The pre-existing owner-unknown unstaged paths are `AGENTS.md`, `package.json`,
the twelve public `wrangler.jsonc` files, `pnpm-workspace.yaml` and
`pnpm-lock.yaml`. They were preserved and excluded from every stage operation.

## Current verification

- `pnpm run check:static`: PASS.
- `pnpm run test`: PASS. All 20 unit suites passed; apex units reported 107 or
  88 tests, Core units 432/432/439, and each public unit 369 tests. The root
  invariant suite passed 18 files with 626 tests and one intentional skip.
- `pnpm run check`: PASS when run as one authorized process with the required
  Wrangler filesystem and child-process access.
- `pnpm run build`: PASS for all 20 production Vite builds. Wrangler printed
  the known read-only log-path warning; no deployment was attempted.
- `pnpm -r --workspace-concurrency=1 run test:api`: PASS for all 20 dedicated
  local Hurl runners. Apex counts were 79/79/79/78/78, Core counts were 34
  each, and each public unit ran 59 requests.
- `pnpm -r --workspace-concurrency=1 run test:e2e`: PASS for all 20 dedicated
  local Chromium runs, 239 cases total.
- `pnpm run check:size`: FAIL on the existing Core/public budgets. The current
  measurement observed apex at 48.47 kB gzip against 52 kB, the first Core
  failure at 129.82 kB against 129 kB, and public cells at 122.66–122.67 kB
  against 112 kB. The public cells were already 120.66–120.68 kB before the
  Paraglide migration. The budget and threshold were not changed.
- `pnpm run check:deps`, `knip`, `check:spelling`, `check:architecture`,
  `check:workers`, `check:generated`, formatting, lint and typecheck all
  passed as part of the current static check.
- `git diff --check` and the commit-boundary status audit passed; no staged or
  unmerged user/owner changes were found.

The first sandbox attempts to run the aggregate checks produced
`spawn EAGAIN`, native thread creation errors and child-process `EPERM` because the machine
limits parallel Node workers and subprocesses. The aggregate static and test
commands were rerun with reduced contention and the required local access; the
results above are the authoritative results. The expected Rails-unavailable
503 log lines in browser tests were assertions of the local fixture boundary,
not test failures.

## Review and holds

The implementation still keeps the public content client, Core API client and
Core Rails-owned transparent relay as separate contracts. No Rails source,
Rails runtime, database, authentication flow, production binding, Cloudflare
deployment or remote GitHub state was changed.

P3b remains NO-GO for the public `lx` URL/SEO integration, invalid-`lx` URL
normalization, region links and authentication-dependent dashboard routes. The
canonical/hreflang/sitemap policy, live VPC/Rails schema verification, existing
browser Hono service-worker retirement and production binding fail-fast remain
separate follow-up work. These holds are recorded in the plan and ADR; no
unapproved behavior was introduced to make the audit appear complete.

## Subsequent TanStack budget decision

After this audit, the public locale client cleanup was committed as
`b15f0ae8`. The continuation review then approved a 150 kB gzip ceiling for
all fifteen TanStack Start units and retained the Apex 52 kB ceiling. The
fifteen `.size-limit.json` files were updated in `f4d94584`; no Apex limit was
changed. The follow-up measurement passed all twenty units and is recorded in
[`evidence/2026-09-17-tanstack-size-budget.md`](2026-09-17-tanstack-size-budget.md).
