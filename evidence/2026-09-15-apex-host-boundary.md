# Apex Host boundary — 2026-09-15

## Scope

This record covers the independently implementable P2b-apex slice only:
`app/apex`, `com/apex`, `org/apex`, `net/apex`, and `dev/apex`. It does not claim
that Core, the twelve public frames, TanStack locale work, Rails Preference work,
or production deployment has been completed.

## Contract fixed from the Edge tree

- Each apex `vite.config.ts` has one configured public host: `umaxica.app`,
  `umaxica.com`, `umaxica.org`, `umaxica.net`, or `umaxica.dev`.
- Each `wrangler.jsonc` has `workers_dev: true`, `preview_urls: true`, and a
  unit-specific Worker name. The policy derives the public host and Worker name
  from that unit's existing `BRAND_TLD`; it does not add a second cross-unit
  domain table.
- The policy accepts the exact public host and the matching Worker preview
  hostname shape. It accepts `localhost`, `*.localhost`, loopback IPv4, and
  loopback IPv6 only when `EDGE_ENV` is not `production`. No other internal host
  was found in these five unit configurations, so no additional one was guessed.
- The Worker uses `new URL(request.url).hostname`. `X-Forwarded-Host` is not a
  source of authority. An unknown host returns a fixed 421 response before the
  rate limiter, CSRF, language detection, or route code runs.
- The gate is inside the existing request ID, security-header, and structured
  logger layers. Therefore a rejected response retains `X-Request-Id`, security
  headers, and one final log record with status 421. The fixed body is
  `Misdirected Request`; it contains no host or query detail.
- The existing Hono CSRF origin predicate now reads the same unit-derived
  public/local/preview values. The previous CSRF status contract remains intact.

## TDD and fixes observed

1. The new five `host-policy.test.ts` files initially failed because the policy
   module did not exist. This was the intended red state.
2. After the first gate implementation, existing production CSRF tests received
   421 before Hono CSRF could return 403. The tests were corrected to send a
   production request to the configured public Host, preserving the assertion
   on CSRF rather than weakening the new Host gate.
3. `lint:types` found that the middleware returned a synchronous `Response` on
   one branch. Making the middleware `async` gave Hono one Promise return type.
4. `knip` found an unused re-export of `ApexOriginPolicy`; the type remains
   exported and used by the host policy's origin function, while the redundant
   `csrf.ts` re-export was removed.

## Verification performed

- Vitest: app/com/org apex each `19 files, 104 tests passed`; net/dev each
  `18 files, 85 tests passed`.
- Hurl against self-hosted dedicated localhost servers, run one unit at a time:
  app/com/org each `12 files, 79 requests passed`; net/dev each `12 files,
78 requests passed`. This includes the real HTTP `X-Forwarded-Host` case.
- `format:check`, `lint`, `lint:types`, and `knip`: passed for all five units.
- `typecheck` with each unit's Wrangler-generated bindings: passed for all five
  units. The first sandboxed attempt emitted Wrangler's expected EROFS log-path
  error; the escalated rerun completed successfully. Generated type files remain
  gitignored.
- Production `build` and `check:size`: passed for all five units. Reported
  gzipped Worker sizes were app 47.78 kB, com 47.77 kB, org 47.77 kB, net
  47.88 kB, and dev 47.87 kB, each below the 52 kB limit. The non-escalated
  build output also reported Wrangler's EROFS debug-log warning while exiting 0;
  it did not prevent the artifacts or size checks.
- The first five-way Hurl attempt could not start because concurrent local
  server creation exhausted sandbox resources. The sandboxed sequential retry
  then failed at `listen EPERM`; the authorized escalated, sequential runs
  above are the actual HTTP evidence. No pre-existing server was stopped.

## Review boundary

This was a self-review; no independent agent was available in the session.
The slice was approved only for its Rails-independent apex boundary. Core,
public-frame, TanStack, Rails, Cloudflare, and remote GitHub changes were not
performed.
