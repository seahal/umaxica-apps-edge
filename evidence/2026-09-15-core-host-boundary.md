# Core Host boundary — 2026-09-15

## Scope

This record covers the independently implementable P2b-core slice only:
`app/core`, `com/core`, and `org/core`. It does not claim that the Rails
passthrough, public frame clients, TanStack locale/CSRF work, Rails Preference
work, or production deployment is complete.

## Implemented boundary

- Each Core derives its public `jp` host from the existing canonical origin, the
  alternate `us` host from that value, and its Worker name from the existing
  wrangler name convention. The existing Vite `allowedHosts` and
  `workers_dev: true` settings remain the configuration evidence.
- The Worker checks `new URL(request.url).hostname` before path classification,
  rate limiting, Rails dispatch, or the application handler. Unknown hosts
  answer fixed 421 text with Edge security headers. `X-Forwarded-Host` is not
  trusted.
- Localhost, loopback, and `*.localhost` are allowed only outside the
  production `EDGE_ENV` tier. The current Core wrangler configs do not declare
  `RAILS_ORIGIN`, so the dispatch boundary reads that future value defensively
  and continues to fail closed when it is absent.

## TDD and fix

The new policy and Worker tests initially exercised the missing policy boundary.
The first type-aware check then exposed that generated `CloudflareEnv` has no
`RAILS_ORIGIN` property while `dispatchToRails` accepted an optional-only object
shape. The dispatcher now reads the optional future binding from `unknown`,
without a type assertion or behavior change to the fail-closed path.

## Verification performed

- Vitest: `app/core`, `com/core`, and `org/core` each passed 23/23 test files;
  346/346 tests each. The focused post-fix Worker/dispatch/Host runs passed
  99/99 tests in each Core.
- Root contract: `pnpm exec vitest run --dir test test/core-dispatch-contract.test.ts`
  passed 45/45 tests.
- Each Core passed `format:check`, `lint`, `lint:types`, `knip`, and Wrangler-backed
  `typecheck`. Wrangler printed its existing inability to create the user-level
  debug log directory in the sandbox, but each command exited successfully and
  type generation plus `tsc --noEmit` completed.
- Each Core's dedicated `pnpm run test:api` passed against its own local dev
  server: 7 Hurl files and 34 requests per Core. The runs used the required
  elevated local execution after the sandboxed app/core runner exited before
  the server answered; no existing server was stopped.
- `git diff --check` passed before staging.

Production custom domains, real workers.dev deployment, Cloudflare bindings,
VPC, and Rails were not used or changed.
