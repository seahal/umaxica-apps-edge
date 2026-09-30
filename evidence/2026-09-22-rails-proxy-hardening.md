# Rails proxy hardening — logout ownership, client IP canonicalization, 8 MiB body ceiling

Work performed 2026-09-22 on branch `feature`, base commit `9f8da0fa`. Decision
record: `adr/023-rails-proxy-trust-boundary.md`. Operational reference:
`docs/development/edge-rails-proxy-trust-boundary.md`.

Scope was three known Low / defense-in-depth items in the Edge → Rails relay.
Rate limiting was out of scope. No new High or Medium issue was found.

## What changed

Three Cores, kept one implementation (`test/core-dispatch-contract.test.ts`
pins them byte-identical modulo the public hostname).

New per-unit modules: `src/lib/client-ip.ts`, `src/lib/rails-body-limit.ts`.
Modified: `src/lib/core-dispatch.ts`, `src/lib/rails-dispatch-log.ts`,
`src/lib/request-log.ts`, `src/worker.ts`.

1. **Logout ownership.** `RAILS_OWNED_EXACT` gained `/sign/out/` and
   `/sign/out/complete/`. Kept an exact-match allow-list; `/sign/outside`,
   `/sign/out/other`, `/sign/out/complete/extra` and `/sign/out//` verified
   application-owned. No trailing-slash alias added for
   `/.well-known/jwks.json` or `/csp-violation-report`. The same four logout
   paths added to `isAuthPath` and to the `sign_out` route class.
2. **Client IP.** `CF-Connecting-IP` is the sole authority, validated as exactly
   one IPv4/IPv6 literal. Ten client-identity headers removed from the outbound
   request (`CF-Connecting-IP` included); `X-Forwarded-For` regenerated with that
   one value, never appended to. No validated address ⇒ no `X-Forwarded-For`
   written and no fallback.
3. **Body ceiling.** `MAX_RAILS_REQUEST_BODY = 8 * 1024 * 1024`. Declared
   `Content-Length` over the ceiling ⇒ 413 before any byte is read and before the
   origin is read. Bytes counted in flight; past the ceiling the relayed stream
   is errored and Edge answers 413 whatever Rails replied. Malformed
   `Content-Length` ⇒ 400. Nothing buffered; `request.arrayBuffer()` not used.

## Commands run and results

| Command                                  | Result                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm run format:check`                  | pass                                                                                              |
| `pnpm run lint`                          | pass                                                                                              |
| `pnpm run lint:types`                    | pass                                                                                              |
| `pnpm run typecheck`                     | pass                                                                                              |
| `pnpm run knip`                          | pass                                                                                              |
| `pnpm run check:architecture`            | pass                                                                                              |
| `pnpm run check:deps`                    | pass                                                                                              |
| `pnpm run check:spelling`                | fail — 3 unknown-word hits in `docs/design/visual-identity-matrix.md`, pre-existing on `9f8da0fa` |
| `pnpm run check:workers`                 | fail — pre-existing on `9f8da0fa`                                                                 |
| `pnpm run test`                          | 654 passed, 1 failed                                                                              |
| `pnpm --dir {app,com,org}/core run test` | 553 / 553 / 565 passed                                                                            |
| `pnpm run build`                         | pass, all twenty units                                                                            |
| `pnpm run check:size`                    | pass, 121.05–121.07 kB gzipped against a 150 kB budget                                            |
| `pnpm run test:api`                      | **not run** — `hurl` is not installed in this environment                                         |

The one `pnpm run test` failure is
`test/rate-limit-namespace-allocation.test.ts > gives every active RATE_LIMITER a
unique account-wide namespace` (expected `540581`, received `1001`). Confirmed
pre-existing: reproduced on a clean `git stash -u` of this work at `9f8da0fa`.
Unrelated to this change and out of scope (rate limiting).

## Boundary results — 8 MiB threshold

Asserted in `{app,com,org}/core/test/lib/rails-body-limit.test.ts` and
`test/core-dispatch.test.ts`, all passing:

| Declared `Content-Length`                                     | Result                                           |
| ------------------------------------------------------------- | ------------------------------------------------ |
| `0`                                                           | relayed                                          |
| `1`                                                           | relayed                                          |
| `8388607` (limit − 1)                                         | relayed                                          |
| `8388608` (limit)                                             | relayed                                          |
| `8388609` (limit + 1)                                         | 413, body stream cancelled, `fetch` never called |
| `99999999999999999999999`                                     | 413                                              |
| `9223372036854775807`                                         | 413                                              |
| `-1`, `eight`, `1024.5`, `0x100`, `10, 20`, `` (empty), `+10` | 400                                              |
| absent, bodyless request                                      | relayed                                          |

Streaming, with no believable declared length:

- 8,388,608 bytes in 64 KiB chunks — relayed in full, `state.exceeded === false`,
  Rails received exactly 8,388,608 bytes.
- 8,388,609 bytes — relay stream errors with
  `Rails proxy request body exceeded 8 MiB`, `state.exceeded === true`.
- Undeclared 16 MiB body — same.
- `Content-Length: 10` with 8 MiB + 64 KiB behind it — same; Rails' own
  `arrayBuffer()` rejects, and Edge answers 413 even though the mocked Rails
  replied 201.
- `state.bytesRead` bounded by limit + one 64 KiB chunk regardless of upload size.
- `Content-Length: 8388609` against an unconfigured `RAILS_ORIGIN` answers 413,
  not 503 — the ceiling is not conditional on deployment state.

## Hostile IP header results

The adversarial request, asserted in `test/core-dispatch.test.ts`:

```text
CF-Connecting-IP:   203.0.113.10
CF-Connecting-IPv6: 2001:db8::bad
CF-Pseudo-IPv4:     192.0.2.1
Client-IP:          13.14.15.16
Forwarded:          for=1.2.3.4;host=evil.example;proto=http
True-Client-IP:     9.10.11.12
X-Client-IP:        17.18.19.20
X-Forwarded-For:    1.2.3.4
X-Real-IP:          5.6.7.8
```

Rails received `X-Forwarded-For: 203.0.113.10` and nothing else: each of the
other eight names asserted `null` on the outbound request.

`CF-Connecting-IP` equivalence classes, all asserted:

| Input                        | Forwarded as          |
| ---------------------------- | --------------------- |
| `203.0.113.10`               | `203.0.113.10`        |
| `2001:db8::1`                | `2001:db8::1`         |
| `::ffff:203.0.113.10`        | `::ffff:203.0.113.10` |
| `203.0.113.999`              | nothing               |
| `203.0.113.10, 198.51.100.7` | nothing               |
| `` (empty)                   | nothing               |
| `unknown`                    | nothing               |
| header absent                | nothing               |

Also rejected by `parseClientIp`: whitespace-only, NUL, embedded NUL,
space/tab-separated pairs, `203.0.113` (truncated), `203.0.113.10.7`,
`203.0.113.010` (leading zero), `203.0.113.-1`, `203.0.113.10:443`,
`[2001:db8::1]`, `fe80::1%eth0`, `2001::db8::1`, `localhost`, and a CRLF header
injection attempt. `undefined` behaves as an absent header.

With `CF-Connecting-IP` absent and `X-Forwarded-For: 1.2.3.4` supplied by the
caller, the outbound request carried no `X-Forwarded-For` and no `X-Real-IP`.

## app / com / org symmetry

`test/core-dispatch-contract.test.ts` passes, including the byte-identity checks
for `core-dispatch.ts` (modulo hostname), `worker.ts`, `rails-dispatch-log.ts`,
and the per-unit `core-dispatch.test.ts` / `worker.test.ts`. Every new ownership
row is asserted against all three Cores by calling `classifyCorePath`, not by
reading source. `client-ip.ts` and `rails-body-limit.ts` are byte-identical
copies, verified with `diff`; their test files differ only in the brand hostname
and the frame label.

## `request.remote_ip` / proxy header audit

Not verifiable here. This repository contains **0** `.rb` files
(`git ls-files | grep -c '\.rb$'`) and the Rails repository is not checked out
alongside it — the same limitation already recorded at the top of
`core-dispatch.ts` about `config/routes/core.rb`. A repository-wide search for
`remote_ip`, `trusted_proxies` and `ActionDispatch` matched only the two
documents written by this work.

The Rails-side requirements are therefore recorded as a contract in ADR 023 §3
and in the docs page, not verified:

- application code reads `request.remote_ip`, never
  `request.headers["True-Client-IP" | "X-Real-IP" | "X-Client-IP"]`;
- `config.action_dispatch.trusted_proxies` is not widened — Edge sends one
  address, so `X-Forwarded-For` has no chain for a trust range to walk.

Reconcile from the Rails repository.

## Not done

- `pnpm run test:api` was not executed: `hurl` is not installed here. The new
  `api/rails-proxy-boundary.hurl` (three copies) is unexecuted, so its
  assertions about the four logout spellings answering 503 and the near-misses
  not answering 503 are unverified over the wire. The same ownership facts are
  verified in Vitest.
- The 8 MiB ceiling is deliberately not asserted in Hurl. Reaching it needs a
  forged `Content-Length` — which no HTTP client sends, because curl computes the
  header from the body it holds — or an 8 MiB fixture in the repository. Per the
  `AGENTS.md` placement rule, an assertion no HTTP client can produce belongs in
  Vitest.
- A malformed `Content-Length`, and a `Content-Length` conflicting with
  `Transfer-Encoding`, are normally refused by the HTTP server ahead of the
  Worker as request-smuggling vectors; neither workerd nor undici exposes such a
  request to `fetch`. The checks in `rails-body-limit.ts` are a second line,
  tested at the function level and documented as such rather than asserted over
  the wire.
