# ADR 010: Rate limiting happens once, at first touch

## Status: Implemented

## Context

The three Core frames called the rate limiter from two places, against the same
Cloudflare binding:

- `src/worker.ts`, the Workers entry point (ADR 007), on the Rails-owned branch —
  before `dispatchToRails()`
- `src/middleware.ts`, a Next.js middleware with matcher
  `/((?!_next/static|_next/image|favicon.ico).*)`, on everything else

Both resolved to `checkRateLimit(request, env.RATE_LIMITER)` in the same
`src/lib/rate-limit.ts`, so this was one mechanism reached by two routes rather
than two competing mechanisms. `RATE_LIMITER` is Cloudflare's own Rate Limiting
binding, declared per tier in each `wrangler.jsonc` (`ratelimits`, namespace ids
1001/2001/3001/4001 for `app` and so on), keyed on `cf-connecting-ip`.

No request was ever charged twice: `worker.ts` returns on the Rails branch before
`nextWorker.fetch` is called, so the middleware never runs for a Rails-owned path.
The problem was not double counting. It was that a Next-owned request had to boot
the OpenNext middleware runtime to answer a question `worker.ts` — already the
first code the runtime invokes for every request — could answer first, and that
one concern lived in two files with two different trigger conditions.

## Decision

**`worker.ts` checks the limiter once, for both branches.** The Cores'
`src/middleware.ts` is deleted, with its test.

Order inside `worker.ts` is cheapest-first:

1. `classifyCorePath()`
2. BLOCKED → 404 immediately, **without** a limiter call. A blocked path reaches
   no application code either way, so spending a limiter call on it buys nothing
3. exempt path → skip the limiter
4. otherwise → `checkRateLimit()`; a 429 returns here
5. RAILS → `dispatchToRails()`; NEXT → the cookie-stripped `nextWorker.fetch`

The exemption list is carried over verbatim from the matcher the middleware
declared, so nothing changes about which requests are limited:

```ts
function isRateLimitExempt(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico'
  );
}
```

`/_next/static/` and `/favicon.ico` are normally served from the `ASSETS` binding
without invoking the Worker at all, so in practice the load-bearing entry is
`/_next/image`, which is a real Worker route: a page with many images would
otherwise spend its whole budget on its own thumbnails.

### What this does not change

- `src/lib/rate-limit.ts` is untouched, including its hand-written 429 HTML
  document and its per-brand `<title>`. `test/html-title-contract.test.ts`
  imports it directly for the Core 429 guard, and did so before this change too
- The `RATE_LIMITER` binding, its per-tier `namespace_id`s, and the
  `cf-connecting-ip` key
- Every ADR 007 cookie-boundary property. The limiter check sits before the
  branch, and the Cookie-stripping and `Set-Cookie`-stripping code is reached
  exactly as before
- **The twelve content frames keep their `src/middleware.ts`.** They have no
  `worker.ts` — their wrangler `main` is `.open-next/worker` — so middleware is
  the only first-touch hook they have. This is the same asymmetry that already
  exists for `worker.ts` itself, and
  `test/html-title-contract.test.ts` already encoded it: its satellite guard
  filters `/src/middleware.ts` while excluding `/core/`, and asserts the count is
  exactly twelve. That assertion passes unchanged, which is what confirms the
  Cores were never part of that contract

### Rejected: layering application logic on top of the binding

Considered and declined for now: per-route or per-identity limits, burst
allowances, or combining the binding with WAF rules. Cloudflare's own mechanism is
the first choice and is sufficient at present; adding a second layer would mean
maintaining a policy in code that the platform can express in configuration.

## Consequences

- A Next-owned request that is over its limit is now rejected before any Next.js
  or OpenNext code runs, rather than inside the middleware runtime. Strictly
  cheaper and strictly earlier
- One fewer bundled artifact per Core: OpenNext no longer emits a middleware
  function for them
- One call site to read when asking "is this request limited?", instead of two
  files with two trigger conditions
- The Cores and the content frames now differ in where the limiter is called.
  That difference tracks a real structural difference — who owns first touch — and
  is recorded here rather than being left to be rediscovered

## Guardrails

`<brand>/core/test/worker.test.ts` (×3, byte-identical modulo the brand host)
covers: a rate-limited Rails-owned request reaching neither Rails nor Next.js; a
rate-limited Next-owned request reaching Next.js not at all; exactly one limiter
call per request, against the binding from `env`; the three exempt paths reaching
Next.js with no limiter call; and a blocked path 404ing with no limiter call and
no Next.js call.

`test/core-dispatch-contract.test.ts` pins `worker.ts` byte-identical across the
three Cores, so the new exemption helper cannot drift between them.

## Outcome

**Implemented** for `app/core`, `com/core` and `org/core`.
`src/middleware.ts` and `test/middleware.test.ts` are deleted from all three; the
twelve content frames are untouched.

`pnpm run format:check`, `pnpm run lint:check`, `pnpm run typecheck`,
`pnpm run test`, `pnpm run check:workers`, `pnpm run knip` and `pnpm run build`
all pass. Per-Core coverage stays at 100% of statements, branches, functions and
lines against the 99% threshold.

---

## Amendment — 2026-08-29

The decision above still holds — the limiter is consulted once, at whatever code
is first to touch a request — but every mechanism it names has since been
replaced. Recorded here rather than rewritten, so the original reasoning stays
readable.

**The frames left Next.js.** All fifteen build with Vite and TanStack Start
(`adr/013`). There is no `src/middleware.ts` anywhere in the repository and no
OpenNext middleware runtime to boot, so the asymmetry this ADR closed for the
Cores no longer exists to close for anyone else. The twelve satellites call
`checkRateLimit()` as the first statement of `handleRequest` in
`src/request-handler.ts`; the three Cores still call it from `src/worker.ts`.

**The exempt list changed with the bundler.** `/_next/static/` and `/_next/image`
are gone. Cloudflare matches static assets before the Worker runs, so the hashed
bundles never reach this code at all and the satellites need no matcher. The
Cores keep `isRateLimitExempt()` for `/assets/*` and `/favicon.ico`.

**A second budget for the authentication paths.** `AUTH_RATE_LIMITER` (60/minute,
`X10N` namespace series) is consulted by each Core _in addition to_
`RATE_LIMITER` on `/oidc/*` and `/sign/out`. The general budget still bounds a
client's total traffic; this one bounds the part of it that can attempt a
credential (ASVS V2.2.1). This is the "per-route limit" the original decision
deferred, and it was adopted because a budget sized for page views is not
anti-automation on a credential path. It remains the only such layer.

**The apex Workers are in scope, at the same size.** All five call
`checkRateLimit()` from Hono middleware in `create-apex-app.ts`, ahead of CSRF
and behind `apexSecurityHeaders` — so a 429 returned there still unwinds through
the header middleware. They declare 2000/60, the same budget as the frames, for
the reason in the next section.

**One budget per brand per tier, deliberately.** A counter is keyed on
(`namespace_id`, key) and scoped to the Cloudflare ACCOUNT, not to the Worker:
two bindings sharing a `namespace_id`, _even in different Workers_, share the
counter. The scheme here — leading digit the tier, trailing digit the brand —
therefore gives all six Workers of a brand one budget per client IP, and that is
the intent, not an accident of numbering.

The alternative, a namespace per unit, was rejected: it hands every client a
fresh budget per subdomain, so rotating `docs.` → `help.` → `news.` multiplies
the allowance by six. No limit value closes that; only a shared counter does.
The usual objection to sharing — one tenant exhausting another's budget — does
not apply here, because the key is the client IP. A merged budget bounds one
client's own total across the brand rather than letting strangers spend each
other's; the only clients who share a bucket are the ones already sharing an
address, and 2000/minute leaves a NAT'd office ample room.

The price is an invariant: **every binding on a namespace must declare the same
`simple.limit` and `simple.period`.** Cloudflare does not define the behaviour
when two disagree, and the strictest binding would fire against the _combined_
count — so a unit that lowered its own limit would begin rejecting traffic at a
threshold set by its siblings' load, with nothing at runtime to say so. An apex
budget of 600 was written and reverted for exactly this reason. `AUTH_RATE_LIMITER`
sits on its own `X10N` namespace and is held by one Worker per brand, so it is
free to be stricter.

**The brand digit is reserved account-wide, not repository-wide.** The scheme is
`<tier><00|10><brand>`: leading digit the tier (production 1, development 2, test
3, vpc 4, local 5), trailing digit the brand, and the middle pair `10` for the
`AUTH_RATE_LIMITER` series. Because a namespace is an account-scoped identifier
rather than a provisioned resource, the digits have to be allocated for every
Worker on the account — including the ones this repository does not contain:

| id              | binding                              | brand       | where it lives                               |
| --------------- | ------------------------------------ | ----------- | -------------------------------------------- |
| `X001` / `X101` | `RATE_LIMITER` / `AUTH_RATE_LIMITER` | app         | this repository                              |
| `X002` / `X102` | same                                 | com         | this repository                              |
| `X003` / `X103` | same                                 | org         | this repository                              |
| `X004`          | `RATE_LIMITER`                       | net         | this repository                              |
| `X005`          | `RATE_LIMITER`                       | dev         | this repository                              |
| `999`           | `ratelimit`                          | jump        | `umaxica-apps-edge-jump`, a separate project |
| `X006` / `X007` | —                                    | jump / busy | RESERVED, unused today                       |

`umaxica-apps-edge-all-busy` needs no limiter: it answers 503 straight from its
assets binding. `umaxica-apps-edge-jump`, a redirect Worker maintained
elsewhere, holds `999` — outside this scheme's range, so it does not collide,
and it is recorded here so nothing in this repository claims it later. Should
either Worker be renumbered into the scheme, `X006` and `X007` are the slots.

`tools/check-workers.mjs` cannot see any of this: its reach stops at this
repository, and there is no way for it to learn what a Worker in another project
declares. That is exactly why the allocation is written down rather than merely
enforced — the guard covers the twenty units, and this table covers the account.

Two figures worth keeping in view when tuning: 2000/60 is a starting point
against real traffic rather than a measured number, and limits are enforced _per
Cloudflare location_, so a client's effective ceiling is the value times the
number of locations it reaches.

**The no-IP fallback is per-path, not shared.** The key was
`cf-connecting-ip || 'unknown'`, which put every request lacking that header into
one bucket. Cloudflare sets the header on everything it forwards, so this was
unreachable in production — but reachable under `vite dev`, `vite preview`, and
any future path that reaches a Worker without traversing the edge. A shared
bucket is both a bypass (clients sharing a budget are only restricted if they are
the same client) and a denial of service against everyone in it. The key is now
`no-ip:${pathname}`. An unattributable request is still counted; it is just not
counted together with unrelated ones.

**The 429 is one document everywhere.** Each frame answers a branded, titled,
`no-store` HTML document from its own `rate-limit.ts`; each apex answers the same
`statusPage()` its 404 and error boundary use, extracted to `src/status-page.ts`
for that purpose. A 429 is a full document an attacker can elicit on demand, so
it must not be the one page on an origin served untitled, untyped and cacheable.

### Guardrails, restated

- `tools/check-workers.mjs` asserts every one of the twenty deployment units
  declares a `RATE_LIMITER` with a numeric budget at the top level _and_ in each
  required environment; that no `namespace_id` is shared between two tiers or
  between a tier and production; and — across every unit in the manifest — that
  two bindings sharing a `namespace_id` declare the same budget. `ratelimits` is not inherited into `env.*`, and a
  dropped binding is silent at runtime — `checkRateLimit` treats an unbound
  limiter as a pass-through — so configuration is the only place it can be caught.
  `all/busy` and `tools/vpc-probe` are outside the manifest and exempt: the first
  answers 503 from the assets binding, the second is never deployed.
- `test/html-title-contract.test.ts` drives the real `checkRateLimit` for all
  three Cores and all five apex Workers and asserts the title contract on the
  response, plus a source-level check for the twelve satellites.
- Each unit's own `test/rate-limit.test.ts` covers the per-path fallback, the
  empty-header case, and that the 429 carries no security headers of its own.

## Amendment — 2026-10-06

Nothing in this amendment changes a limit, a namespace, a key or a call site.
It records what the binding is _for_, so that the next change to it is made
against a stated position rather than an inferred one.

### What the limiter is

A **coarse-grained, network-origin load-shedding and abuse ceiling.** It bounds
how much traffic one network origin can push through a unit's first touch. It is
not a security guarantee, and it is not a strict attempt counter.

### Who owns what

- **Wrangler configuration owns the budget:** `namespace_id`, `limit` and
  `period`, per tier, in each unit's `wrangler.jsonc`. The allocation scheme is
  ADR 022 and is unchanged.
- **Worker code owns the key semantics:** `rateLimitKey()` in each unit's own
  `rate-limit.ts` decides what one bucket means. Today that is the
  `CF-Connecting-IP` value, verbatim, with the per-path `no-ip:` fallback above.

Those two halves meet at one seam — `checkRateLimit(request, limiter, …)` — and
that seam is what has to survive. A later key policy (an aggregated prefix, an
identity, a composite) replaces `rateLimitKey()`; a later budget replaces three
numbers in configuration. Neither should require touching the other, or any
caller.

### Known limitation, accepted for now

`CF-Connecting-IP` is used as-is. An IPv6 client that rotates addresses inside
its own allocation lands in a different bucket per address, so the ceiling is
looser for such a client than the number suggests. This is known and accepted:
aggregating to a prefix means owning an address parser and a canonicalisation
rule, and tightening before there is production data to tighten against would
be guessing. The same reasoning defers account, device, session and composite
keys, adaptive or burst algorithms, tighter thresholds, and any layering with
WAF rules.

The order is deliberate: collect comparable observability across all seventeen
units first (one policy, enforced by `tools/check-workers.mjs`), then tighten
from what it shows.

### What this binding is not responsible for

Strict counting of authentication attempts — per account, per credential, with
lockout or step-up — is not this binding's job, including for
`AUTH_RATE_LIMITER`. That binding narrows the network-origin ceiling on the
paths that can attempt a credential; it does not know who is being attempted.
Attempt accounting belongs to the system that owns the credential.

### The 429 speaks the unit's existing locale

The 429 document is now `ja`/`en`. Rate limiting did **not** gain a locale
precedence of its own; each family hands the limiter the resolution it already
had:

| Family         | Source of the 429 locale                                                                   |
| -------------- | ------------------------------------------------------------------------------------------ |
| Core           | `resolveDisplayLocale()` — `lx`, then the `language` cookie, then the default              |
| Public content | the `/{lang}/` URL segment; `Accept-Language` on the bare `/`; the default everywhere else |
| Apex           | the unit's one `languageDetector`, now registered ahead of the limiter; English when unset |

In the frames the resolution is a thunk that runs only for a request already
refused. In the apex Workers the detector runs before the limiter, which is
safe at first touch because it is local and bounded — it reads the query string,
one cookie and one header, performs no I/O, and with `caches: false` writes
nothing. Reading the `language` cookie does not move the Core's cookie
boundary: nothing is forwarded, and the application-side cookie strip is
untouched.

### ASVS references

The earlier amendment cites "ASVS V2.2.1". That number is from the ASVS 4 line
and does not name this control in ASVS 5.0. It is left as written above, as a
record of what was cited at the time. The current references, checked against
the OWASP ASVS 5.0.0 text, are:

| ASVS 5.0 | Level | Requirement (abridged)                                                                                         | Where it is met here                                                                                         |
| -------- | ----- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| V2.4.1   | 2     | Anti-automation controls protect against excessive calls leading to denial of service or costly overuse        | `RATE_LIMITER` at first touch, every unit                                                                    |
| V6.1.1   | 1     | Documentation defines how rate limiting and anti-automation defend against credential stuffing and brute force | this record                                                                                                  |
| V6.3.1   | 1     | Controls against credential stuffing and password brute force are implemented as documented                    | `AUTH_RATE_LIMITER` on the Core credential paths, as one layer; attempt accounting is the credential owner's |
