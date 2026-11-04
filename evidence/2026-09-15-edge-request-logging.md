# Edge request ID and completion logging

## Scope

P2c added the request identity and completion log boundary to the fifteen
TanStack Start units and connected it to the already existing apex and Core
Rails hop emitters. This record covers the code in commit `86404e2e`.

Each TanStack unit keeps a local copy of `src/lib/request-log.ts`, preserving
the standalone deployment-unit boundary. The Worker entry generates a
`crypto.randomUUID()` value, ignores an incoming `X-Request-ID`, returns the
generated value in the response header, and passes it only to the permitted
server-side Rails client request. Production request isolation is provided by
the existing server-only async-local store; no request value is held in a
module-global variable.

The `edge_request` record contains only the closed fields `service`,
`environment`, normalized `method`, fixed `route`, final `status`,
`duration_ms`, `outcome` and the generated `request_id`. Core's transparent
Rails relay uses its `rails_dispatch` record as its one completion event and
includes the same request ID and final Edge status, so the relay does not emit
a duplicate generic completion record. Apex keeps its existing structured
logger contract.

## Verification

- The new request-log suite passed in all twelve public cells (50 tests per
  cell).
- Complete public unit suites passed in all twelve cells (359 tests per cell).
- Complete Core suites passed in `app/core` and `com/core` (419 tests each) and
  `org/core` (426 tests).
- Representative combined suites passed with 83 tests in `app/info` and 161
  tests in `app/core`.
- Request-handler and Rails-client tests cover generated response IDs, ignored
  external IDs, forwarding only the generated ID, final status logging,
  unexpected-error logging and the no-secret log contract. Route labels are
  reduced before logging, so arbitrary path, query, headers, body and raw
  exception text are not emitted.
- The 129-file staged change passed the pre-commit lint, format and spelling
  hooks. The per-unit changed-file Oxfmt/Oxlint checks also passed.

The verification used local fixtures, fake bindings and local test drivers. No
Rails code, live Rails runtime, Cloudflare deployment or remote GitHub action
was used, and Rails adoption of the generated ID remains unverified.
