# Public Rails client bounds — 2026-09-15

## Scope

This record covers the P4a public content client slice for all twelve cells:
`{app,com,org}/{docs,help,info,news}`. It does not claim that the three Core
clients, Rails passthrough, TanStack locale/Preference work, production
deployment, or real VPC/Rails integration is complete.

## Contract implemented

- Public Rails fetches use a fixed 2,000 ms `AbortSignal`. The signal is kept
  on successful/error responses and is used during the bounded body read, so a
  slow body after headers remains inside the same limit.
- Response bodies are consumed by a direct `ReadableStream` reader. The reader
  counts raw UTF-8 bytes, decodes with `TextDecoder`, rejects over-limit bodies,
  and starts cancellation without waiting on a potentially pending upstream
  cancellation promise. This avoids the `Response.clone()` tee ownership
  problem identified during the prior Node micro-check.
- Entries accept only `application/json` and identity content encoding, reject
  a declared or streamed body over 1,048,576 bytes, and retain the existing
  runtime schema validator and public status mapping.
- Rails Health retains its existing 65,536-byte JSON boundary and rejects
  unsupported content encoding. A body timeout remains an operational
  unreachable report; public content entry timeouts remain the existing 504
  mapping. No response body, origin, or transport error is exposed to a page.
- The public VPC/local transport remains fail-closed. The slice does not add an
  Internet fallback, retry, JWT/authentication behavior, or Rails modification.

## TDD and verification

1. The new reader tests were run before implementation. Four of six tests
   failed against the old character-count reader: Japanese UTF-8 over-limit,
   byte-boundary behavior, cancellation on an oversized chunk, and an already
   aborted signal. This was the intended red state.
2. After the direct byte reader and signal plumbing were added, the focused
   client/reader suite passed 5 files and 93 tests in each of the twelve cells.
   The complete unit suite then passed 27 files and 290 tests in each cell.
3. The tests cover exact byte boundaries, Japanese text split across chunks,
   no `Content-Length`, invalid length headers, oversized single chunks,
   unsupported media type/encoding, delayed body timeout after headers, and a
   delayed-header client timeout at the fixed 2,000 ms boundary.
4. Targeted `oxfmt --check`, Oxlint, and type-aware Oxlint passed for the seven
   changed shared files in app/info; the same files were copied byte-identically
   to the other eleven cells. The matrix invariant remains the authority for
   that one-implementation/twelve-cell boundary.
5. Unit-wide lint still reports pre-existing generated `.astro/*.d.ts`
   diagnostics. The unit typecheck reaches `tsc` and reports the existing
   `test/uncovered-components.test.tsx` HTMLDivElement mismatch; no changed
   source error remains. These are recorded as failures rather than PASS.

## Review boundary

This is a self-review. The slice is GO because it uses the existing fixed
origin and validator, has local fake-client/stream tests, and does not need
Rails, JWT, a deployment, or another agent's worktree. The remaining Core
transport and production HTTP checks are intentionally deferred to their own
工程 and are not hidden by this record.
