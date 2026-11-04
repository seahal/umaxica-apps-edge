# ADR 023: The Edge → Rails proxy trust boundary — canonical client IP, a body ceiling, and an exact logout allow-list

## Status

Accepted — 2026-09-22. Narrows the Rails dispatch half of
[ADR 007](007-shared-fqdn-core-dispatch.md) and
[ADR 018](018-core-rails-direct-internet.md). Changes nothing about the
transport, the ownership model, the cookie boundary, or rate limiting.

## Context

`{app,com,org}/core/src/lib/core-dispatch.ts` relays Rails-owned paths from the
public FQDN to `RAILS_ORIGIN` over the public internet. A review of that relay
found three defense-in-depth gaps. None was reachable as a High or Medium
finding; all three are the kind that becomes one after an unrelated change
elsewhere.

**1. Logout had two spellings and only one owner.** `/sign/out` and
`/sign/out/complete` were Rails-owned; `/sign/out/` and `/sign/out/complete/`
were not, and fell through to the application. The application renders a page —
it cannot clear a Rails session, and per ADR 007 it cannot issue or delete a
cookie at all. A user who reached the trailing-slash URL (a typed URL, a pasted
link, a client-side rewrite) was shown a plausible document while the session
cookie survived.

**2. Client identity crossed the boundary on a deny list.** The relay deleted
`Forwarded`, `X-Real-IP` and `x-forwarded-*` and passed everything else through.
`True-Client-IP`, `Client-IP`, `X-Client-IP`, `CF-Connecting-IPv6` and
`CF-Pseudo-IPv4` were already outside that list, and every one of them is a name
some proxy or Rails middleware honours. A deny list makes correctness a race
between this file and whatever alias the upstream stack learns next.

**3. The Rails branch had no body ceiling.** `worker.ts` deliberately skips
`request-boundary.ts`'s 64 KiB application limit on the Rails branch so mutations
stay a transparent streamed relay. Correct, and it left the Rails surface as the
one path where a client could stream an unbounded body through a Worker into the
Rails origin.

## Decision

### 1. Logout is four exact paths, and nothing else

`RAILS_OWNED_EXACT` gains `/sign/out/` and `/sign/out/complete/`. The set stays
an exact-match allow-list.

Deliberately NOT `startsWith('/sign/out')`. A prefix rule would hand Rails
`/sign/outside` and every future `/sign/out/<anything>` Rails does not serve,
converting an ownership table into a wildcard and making the Edge table a
standing promise about routes only Rails can see. Four literals is the whole fix;
`/sign/outside`, `/sign/out/other` and `/sign/out/complete/extra` stay
application-owned and are asserted as such.

No trailing-slash alias is added for `/.well-known/jwks.json` or
`/csp-violation-report`. Both are canonical URIs consumed by machines, neither is
typed by a human or rewritten by a browser, and an alias for each would be scope
without a reason.

The same four paths are added to `isAuthPath` in `worker.ts` and to the
`sign_out` route class in `rails-dispatch-log.ts` / `request-log.ts`. This is not
a rate-limit policy change: the policy is unchanged, and the alias that could
have reached Rails without counting against `AUTH_RATE_LIMITER` is closed at the
same time as the alias that could reach Rails at all.

### 2. One client-IP authority, canonicalized — not a deny list

`src/lib/client-ip.ts` inverts the contract.

- **Authority.** Cloudflare's `CF-Connecting-IP` is the only header Edge reads a
  client IP from.
- **Validation.** The value must be exactly one IPv4 or IPv6 literal. A
  comma-separated list, a `host:port` pair, a bracketed literal, a zone id, a
  hostname, an ambiguous leading-zero octet, an empty string, a NUL and anything
  carrying a control character are all rejected rather than trimmed into shape.
- **Regeneration.** Every client-identity header — `Forwarded`,
  `X-Forwarded-For`, `X-Real-IP`, `Client-IP`, `X-Client-IP`,
  `X-Cluster-Client-IP`, `True-Client-IP`, `CF-Connecting-IP`,
  `CF-Connecting-IPv6`, `CF-Pseudo-IPv4` — is removed from the outbound request,
  `CF-Connecting-IP` included: it is Edge's input, not Rails'. Rails then
  receives `X-Forwarded-For: <exactly one validated address>`, written by Edge.
  Never appended to an inbound chain; always a replacement.

**No silent fallback.** When there is no validated address, Edge asserts none:
every identity header is removed and no `X-Forwarded-For` is written. There is
deliberately no fallback to another header, to a peer address, or to a
placeholder such as `unknown` or `127.0.0.1`.

The reason is that a fabricated client IP is strictly worse than an absent one.
Rails cannot distinguish a guessed value from a real one, so a fallback would
silently poison `request.remote_ip`, any audit log derived from it, and any
per-IP decision Rails makes — and it would do so most reliably in exactly the
situations where the real value was unavailable.

This is not a rejection, and that is deliberate. The existing Edge ingress
contract already tolerates a missing `CF-Connecting-IP`: `rate-limit.ts` buckets
such a request per-path rather than refusing it, precisely because `vite dev`,
`vite preview` and the Hurl `test:api` harness reach the Worker without
Cloudflare in front. Rejecting here would change that ingress contract, which is
out of scope. The fail-closed behaviour kept instead is the narrower and more
honest one: **Edge declines to make a claim it cannot substantiate.** Rails falls
back to the peer address, which is the truth available to it.

### 3. Rails application code reads `request.remote_ip`

`ActionDispatch::RemoteIp` derives `request.remote_ip` from `X-Forwarded-For`
and the peer address, filtered by `config.action_dispatch.trusted_proxies`. That
is exactly the input this contract produces, so Rails application code must use
`request.remote_ip` and must not read `request.headers["True-Client-IP"]`,
`["X-Real-IP"]`, `["X-Client-IP"]` or any other header as a client-identity
authority. Edge no longer forwards any of them, so such a read now yields `nil`
rather than an attacker-supplied string — but the rule is stated because the
failure mode of reintroducing one is silent.

`trusted_proxies` must not be widened to accommodate this. Edge sends exactly one
address, so `X-Forwarded-For` has no chain for a trust range to walk.

### 4. An 8 MiB hard ceiling on a proxied Rails body

`src/lib/rails-body-limit.ts` sets `MAX_RAILS_REQUEST_BODY = 8 * 1024 * 1024`
(8,388,608 bytes), applied uniformly — no per-endpoint refinement, per YAGNI.

Two mechanisms, because either alone is insufficient:

1. A declared `Content-Length` over the ceiling is refused with **413** before a
   byte is read, and the client's body stream is cancelled rather than drained.
2. Every byte that does flow is counted in flight. Past the ceiling the relayed
   stream is **errored**, not truncated, so the upstream sees a broken request
   body and cannot complete an oversized request as a normal one. Edge answers
   413 whatever Rails replied — including when Rails replied 2xx to the fragment
   it received.

`Content-Length` is therefore the early exit, never the security boundary. An
undeclared body, a chunked body, and a `Content-Length` that lies all land on
mechanism 2.

A `Content-Length` that cannot be believed at all — negative, non-numeric, a
float, a duplicated list, empty — is refused with **400** rather than ignored.
Ignoring a length that cannot be parsed is precisely how an unrestricted proxy gets
reintroduced by accident. A well-formed digit string too large to be a safe
integer is unambiguously over the ceiling and is refused as 413.

**Nothing is buffered.** `request.arrayBuffer()` is not called; memory stays
bounded by one source chunk regardless of upload size. The counter is implemented
as a pull-driven `ReadableStream` over a reader rather than a `TransformStream`
pipe: `pipeThrough` on a half-duplex request body is the construct whose
behaviour differs between workerd and undici, and this relay must behave
identically in production and under Vitest. A `pull` that reads one chunk and
enqueues one chunk has the same semantics in both, and gives the relay
backpressure for free — the client is read only as fast as Rails consumes it.

8 MiB is a provisional value: comfortably above every current Rails surface, low
enough to bound the blast radius of an unbounded upload. It exists to replace
"no limit" with "a limit", not to be tight. It can be lowered once telemetry
shows the real distribution of request sizes; lowering it is a one-constant
change plus the boundary tests that move with it.

## Consequences

- A user who opens `https://jp.umaxica.{app,com,org}/sign/out/` is logged out.
- Rails receives at most one client-identity header, containing at most one
  address, which Edge validated. Spoofing the client IP from the browser now
  requires spoofing `CF-Connecting-IP` upstream of Cloudflare.
- A request body over 8 MiB cannot be processed normally by Rails through this
  relay, whatever it declares about its own size.
- A client that sends a malformed `Content-Length` now gets 400 where it
  previously got a proxied request. This is a behaviour change for malformed
  clients only; well-formed ones are unaffected.
- Two new log outcomes, `request_too_large` and `request_invalid_length`, record
  refusals Edge made itself rather than attributing them to Rails.

## Outcome

Implemented on the `feature` branch for all three Cores, which stay one
implementation:

- `src/lib/client-ip.ts` and `src/lib/rails-body-limit.ts` (new, per-unit copies)
- `src/lib/core-dispatch.ts`, `src/lib/rails-dispatch-log.ts`,
  `src/lib/request-log.ts`, `src/worker.ts`

Covered by `test/lib/rails-client-ip.test.ts`,
`test/lib/rails-body-limit.test.ts` and `test/core-dispatch.test.ts` in each
Core, and by the shared ownership table in `test/core-dispatch-contract.test.ts`.
`docs/development/edge-rails-proxy-trust-boundary.md` is the operational
reference.

The Rails side of §3 is stated as a contract, not verified: the Rails repository
is not checked out alongside this one and this repository contains no Ruby
source. Reconcile `request.remote_ip` usage and
`config.action_dispatch.trusted_proxies` against this ADR from the Rails
repository.
