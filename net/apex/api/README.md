# HTTP contract tests

`pnpm run test:api` runs every `.hurl` file in this directory against a running
server with [Hurl](https://hurl.dev).

```sh
pnpm run test:api                      # starts a server, runs the suite, stops it
pnpm run dev &&  pnpm run test:api     # or reuse one you already have
```

`api/run.mjs` owns the server. Hurl is a standalone binary with no equivalent of
Playwright's `webServer` block, so something has to put a server in front of it,
and leaving that to the reader makes `pnpm run test:api` mean different things
in different terminals — which is the one thing a contract suite cannot afford.

It is deliberately **not** a third owner of process lifecycle. It probes the
port first and reuses whatever is already answering, exactly as
`playwright.config.ts` does with `reuseExistingServer`; it only starts a server
when nothing does, and then it stops the whole process group it started. Running
`pnpm run dev` in another terminal therefore behaves as it always did.

Set `EDGE_API_BASE` to run these files against a preview deployment. Nothing is
started or stopped in that case — a remote target is not ours to manage — and a
target that does not answer is an error rather than a reason to fall back to
localhost.

The runner is duplicated per unit rather than shared from the repository root,
for the same reason every unit owns its `vitest.config.ts`: a suite that only
runs from the root is not extractable. `test/deployment-unit-boundaries.test.ts`
enforces that.

## What belongs here

The three test layers in this repository are split by responsibility, not by
capability:

| layer           | tool       | answers                                      |
| --------------- | ---------- | -------------------------------------------- |
| `pnpm test`     | Vitest     | did the internal logic break?                |
| `pnpm test:api` | Hurl       | did the HTTP contract break?                 |
| `pnpm test:e2e` | Playwright | did the user's path through a browser break? |

A file here asserts what an HTTP client can observe and nothing it cannot:
status, headers, body structure, and the semantic values inside the body. It
does not import from `src/`. In particular it does not call `app.request()` —
Hono's in-process request helper is a component-level tool, and using it here
would erase the boundary this directory exists to draw.

The reverse also holds: a Vitest file may still use `app.request()` when the
thing under test is **not** reachable over HTTP — a route that throws, an
injected `RATE_LIMITER` binding, a `console` line. There `app.request()` is the
driver and the assertion is elsewhere. When the assertion is on the response
itself, it belongs in this directory.

## Why a real client finds things `app.request()` cannot

`app.request()` builds a bare `Request` and returns a bare `Response`. There is
no connection, no cookie jar, and no state between calls, so every call looks
like a first-ever visit.

`i18n.hurl` exists because of that. Hono's `languageDetector` reads an explicit
`language` cookie before `Accept-Language`, while its cache is disabled so the
request does not create or refresh that cookie. The in-process test still has
no cookie jar, so this file sends each language input explicitly.

Hurl keeps one cookie jar **per file**. The language cases use explicit cookie
headers so their inputs remain visible and independent of requests elsewhere.

## Conventions

- `{{base}}` is supplied by the `test:api` script (`--variable base=…`) rather
  than hardcoded, so the same files can run against a preview deployment.
- Assert in depth — status, then headers, then body structure, then the values
  that carry meaning. A file full of bare `HTTP 200` checks costs a CI job and
  proves that the process is up.
- Prefer asking the server over restating it: `ui-shell-contract.hurl` checks
  the shell's links by requesting them, not by comparing them to a list that has
  to be kept in step by hand.
