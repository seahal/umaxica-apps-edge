# Public 404 boundary — 2026-09-15

## Scope

This record covers the public content client in all twelve cells:
`{app,com,org}/{docs,help,info,news}`. It does not change Rails or claim that
the Rails reference SHA was available in this workspace.

## Decision and implementation

- The existing client has two fixed endpoint shapes: the collection
  `/api/v0/entries` and the detail `/api/v0/entries/{public_id}`.
- A detail 404 confirms that the requested Entry is absent and stays the
  public `not-found` result, which the page turns into HTTP 404.
- A collection 404 does not identify an absent page or Entry. It stays an
  `upstream-error` with upstream status 404 and reaches the existing public
  mapping as HTTP 502.
- No Rails error field, route, or response body was invented. Existing schema,
  status mapping, and private-origin protections remain unchanged.

## TDD and verification

- The focused suite was changed to prove both sides of the boundary: detail
  404 is `not-found`, collection 404 is `upstream-error`; the page view test
  additionally verifies collection 404 becomes `{ kind: 'error', status: 502 }`.
- `pnpm exec vitest run test/lib/rails-entries.test.ts test/lib/publishing-api.test.ts test/lib/publishing-data.test.ts --maxWorkers=1`
  passed 3 files and 59 tests in each of the twelve cells.
- The shared `rails-entries.ts`, `publishing-data.test.ts`, and related test
  copies were hash-checked across all twelve cells. Targeted Oxfmt and
  type-aware Oxlint were already green for the changed public files.

The Rails fixed reference files and live endpoint behavior remain unverified;
this is a local fixture boundary test only.
