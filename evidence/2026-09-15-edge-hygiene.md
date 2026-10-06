# Edge stale metadata and static hygiene verification

Date: 2026-09-15

## Scope

This follow-up closes two repository-local failures exposed after the Paraglide
work:

- 64 tracked `.astro` metadata files remained in the twelve public units after
  the Astro surfaces had been deleted. No active source referenced them, and the
  public matrix already required TanStack Start with no Astro configuration or
  dependency.
- The twelve public `uncovered-components.test.tsx` fixtures used
  `document.body.append`, which selected the Cloudflare Workers `Body` overload
  under `tsc` instead of the DOM node overload.

The timeout state in the twelve public request handlers and three Core workers
was also stored through a mutable object so type-aware Oxlint could model the
callback mutation without a suppression. Four root/tool files were formatted by
Oxfmt. These edits do not change an HTTP response, Rails transport, auth
boundary or browser behavior.

## TDD and checks

Before removal, the new public matrix assertion detected the stale `.astro`
directory in `app/info`; after removal the focused matrix suite passed 42/42.
The typecheck red case was the reported `document.body.append` error. After
the `appendChild` replacement, all 20 unit typechecks passed.

The following checks passed after the changes:

- `pnpm run format:check`
- `pnpm run lint:types`
- `pnpm -r --workspace-concurrency=1 run typecheck`
- `pnpm run check`
- `pnpm exec vitest run --dir test`
- `git diff --check`

The root check was run with the local server permission available to the
environment. It completed the 20 unit static checks, unit tests and root
invariants successfully. Existing owner-dirty files remained unstaged.
