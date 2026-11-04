# Security review

Date: 2026-11-04

Scope: the twenty deployment units at `6ad23cb` (static reading plus local
probes). Rails, the Cloudflare zone/dashboard settings and production traffic
were not available and were not examined.

## What this repository is

Edge only. There is no sign-up, sign-in, password, e-mail verification, session
store, JWT verification, OAuth/OIDC client, API key, database, storage, upload,
e-mail, SMS, LLM or payment code. Identity and authorization live in Rails;
the OAuth flow is still open work (issue #264). Every auth, object-level authorization and
privilege question therefore resolves to "not applicable here" except where
Edge forwards to Rails.

## Entry points (all unauthenticated; no account type exists at the edge)

- Apex (5 units): GET pages, `/` 302 to an allow-listed region, health and
  revision probes. No state-changing route; `hono/csrf` on unsafe methods.
- Cores (3 units): application pages, health/revision, and the Rails relay for
  `/api/v0/*`, `/web/v0/*`, `/edge/v0/*`, `/oidc/*`, the four logout literals,
  `/.well-known/jwks.json`, `/csp-violation-report`. `/health/*` other than the
  three probes answers 404 before Rails.
- Publishing cells (12 units): `/{lang}/`, entries index/pages/detail,
  fixture-backed search, probes. Rails is reached server-side only.

## Verdicts

- Defended: Rails relay ownership is prefix/exact allow-listed, so a `//host`
  path cannot become the outbound origin; inbound `Cookie` stripped and
  outbound `Set-Cookie` removed on application responses; client IP
  regenerated from `CF-Connecting-IP` only; 8 MiB streamed body ceiling; fixed
  error bodies; `redirect: 'manual'`; `global_fetch_strictly_public`.
- Defended: open redirect (apex region allow-list), XSS (React rendering, no
  raw HTML sink; only `JSON.parse` on bounded Rails bodies), CSP with nonces in
  production, HSTS preload, `frame-ancestors 'none'`, no client source maps
  (`dist/client` has 0 `.map` files after `pnpm run build`).
- Defended: rate limiting per unit and per IP (`RATE_LIMITER` 2000/60 s,
  `AUTH_RATE_LIMITER` 60/60 s on auth paths), separate namespace per unit and
  tier. Keys are client IPs, so one client cannot exhaust another's budget.
- Not applicable: all auth/session/token lifecycle, object-level authorization, role checks,
  SQL/NoSQL, uploads, e-mail/SMS/LLM/payment quotas.
- Not verified: Rails behaviour behind the relay; zone WAF/bot settings; CI
  runs on `develop` have failed since 2026-10 (not investigated, not a
  security finding).

## Candidates for further investigation (not reproduced, not issues)

1. Publishing cells pass `public_id` through `encodeURIComponent`, which keeps
   `.`/`..`, and `rails-client.ts` does not reject dot segments. Not reachable:
   probing `app/docs` with `/ja/entries/../`, `%2E%2E`, `.%2e` and `%2e` showed
   URL parsing removes them before routing (`new URL` yields `/ja/` or
   `/ja/entries/`). A dot-segment check would be defence in depth only.
2. Production cores and apex keep `workers_dev: true`, and host/origin policy
   accepts the `*.workers.dev` names. Requests there skip any zone-level
   controls; the Worker's own limits still apply. Impact depends on zone
   settings that were not visible.
3. The apex origin pattern accepts `<name>.<any account>.workers.dev`, so a
   look-alike Worker on another account passes `hono/csrf`. No apex route
   changes state, so nothing is exposed today.
