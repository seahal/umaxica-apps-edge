# ADR 027: Reintroduce the app/com/org apex deployment units

## Status: Accepted 2026-10-14 — repository change only; Cloudflare cutover pending

Supersedes [ADR 024](024-retire-app-com-org-apex-units.md) Decisions 1, 2, 3
and 5. ADR 024's body, its Outcome and
`evidence/2026-10-01-app-com-org-apex-retirement.md` stay as history.

## Context

ADR 024 removed `app/apex`, `com/apex` and `org/apex` because the future
Experience surface (`xper`, a Rails surface) was planned to own
`https://umaxica.{app,com,org}`. That plan has changed: Rails/Experience is no
longer going to own the three apex hostnames. With no owner, the bare apexes
have no Edge answer at all, so the Edge Hono units come back.

What ADR 024 recorded about external state is still the last verified fact:
on 2026-10-01 the three hostnames were Public Hostnames on the Edge-owned
development Tunnel, routed to the Experience origin, and the account held no
`umaxica-apps-edge-{app,com,org}-apex` Worker, custom domain, zone route or
Access application for them. That state has not been re-read for this record.

## Decision

1. `app/apex`, `com/apex` and `org/apex` return as **standalone Hono deployment
   units**, one per brand, with no imports between them. Each owns its own
   `.oxlintrc.json`, `.oxfmtrc.json`, `tsconfig.json`, Vitest config, `knip.jsonc`,
   tests and `wrangler.jsonc`, as every unit does.
2. **The base is the current `dev/apex`, not the pre-retirement code.** Each unit
   is the working `dev/apex` (security headers, production Host policy with 421,
   CSRF, body size limit, `Content-Encoding` rejection, request id, timeouts,
   structured logging, rate limit, i18n, error boundaries, static assets, ADR 017
   health and revision APIs), plus the brand-specific delta that `3077f584` held
   over `dev/apex`: `src/root-redirect.ts` and its test, brand strings, `/about`
   copy and canonical, host allowlist and dev/inspector port. Nothing else from
   `3077f584` is restored — in particular not `/health.json` or `/health.html`
   (ADR 017 already replaced them) and not the service worker.
3. **Routes.** `GET /` redirects to `https://jp.umaxica.<tld>/` or, for `?ri=us`
   (case-insensitive), `https://us.umaxica.<tld>/`. Any other `ri` falls back to
   `jp`. `Location` is chosen from a fixed allowlist; no request value (query,
   `Host`, `X-Forwarded-Host`) reaches it. `GET /about` is the brand's page with
   canonical `https://umaxica.<tld>/about`.
4. **302, not the old 301.** A 301 is cached by browsers without bound. These
   hostnames have changed owner once already (ADR 024) and could change their
   regional target again; a permanent redirect would keep sending cached clients
   to the old target. Moving to 301 later is a one-line change once the target
   is settled; undoing a deployed 301 is not possible.
5. **Rate limiter.** The ADR 022 production ids `540100` (app), `510100` (com) and
   `530100` (org), and their `2`/`3` tier prefixes, are **reactivated for the same
   units**, not reassigned. ADR 024 marked them "retired, not reusable" so that a
   leftover counter would never be shared with a _different_ surface. Here the
   surface is the same unit, with the same budget (2000/60), so sharing a counter
   with its own predecessor is harmless. Further, the retirement evidence records
   that the ADR 022 ids had never been applied to any `wrangler.jsonc` at
   retirement (the units still used `1001`/`1002`/`1003`), and the account held no
   apex Worker afterward, so no binding on these ids is known to have existed.
   Any other id would break the `<port><region>` rule `tools/check-workers.mjs`
   enforces. Budgets and the checker are unchanged.
6. **The deployment graph includes them again**: pnpm workspace and lockfile,
   `tools/workers-manifest.json` `standalone`, Compose services and ports
   (`5101`, `5301`, `5401`), Dev Container forwards, CI matrices,
   `scripts/deploy-edge-preview`, `scripts/check-local`,
   `scripts/check-apex-domains`, and the connectivity-acceptance tunnel surfaces.
   Twenty deployment units. `test/apex-units.test.ts` replaces
   `test/retired-apex-units.test.ts` and requires each unit to appear exactly
   once on each of those edges, with each apex host allowed by exactly one unit.
7. **`dev/apex` and `net/apex` are unchanged.**

## Not decided here — Cloudflare ownership

This record changes the repository only. Every `wrangler.jsonc` keeps
`"routes": []` at the top level and in every environment, so no deploy can claim
a hostname. Serving `umaxica.{app,com,org}` from these Workers is a separate
operator change, done after explicit approval:

1. Confirm the current owner of each hostname (Tunnel Public Hostname, Access
   application, Worker custom domain or route, DNS) — there must be one.
2. Remove the Tunnel Public Hostname (and any Access application) first, then
   add the Worker custom domain — in that order, per ADR 008.
3. Verify with `scripts/check-apex-domains`; until step 2 it reports FAIL for
   the three hosts, which is the expected pre-cutover state.

Rollback of the repository change is reverting the commit that carries this
record. Rollback of a completed cutover is the reverse of step 2.

## Consequences

- Until the cutover, the three units run locally and in CI only. They are not
  public, and nothing in this record claims they are.
- `tunnel` / `tunnel:apex` connectivity modes now include the three apexes and
  will fail for them while the Tunnel routes those hostnames elsewhere.
