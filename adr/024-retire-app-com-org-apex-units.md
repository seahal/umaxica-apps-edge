# ADR 024: Retire the app/com/org apex deployment units

## Status: Accepted 2026-10-01 — code cutover done; external Cloudflare cutover pending

## Context

The future Experience surface (internal code `xper`) will be the authority at
`https://umaxica.app`, `https://umaxica.com` and `https://umaxica.org`. Until
now those apex hostnames belonged to three Edge Hono Workers: `app/apex`,
`com/apex` and `org/apex`. Two owners for one hostname cannot coexist. This
record is Phase 0 of the Experience migration: it removes the Edge owner.
Experience itself (Rails surface, credentials, API) is Phases 1–3 and is not
part of this change.

## Decision

1. `app/apex`, `com/apex` and `org/apex` are **retired as deployment units**.
   Their directories and every repository contract that names them are removed:
   pnpm workspace and lockfile importers, `tools/workers-manifest.json`,
   Compose services and ports (5101, 5301, 5401), Dev Container forwards, CI
   matrices, `scripts/deploy-edge-preview`, `scripts/check-local`,
   `scripts/check-apex-domains`, connectivity-acceptance surfaces, and rate-limit
   namespace allocations (`510100`, `530100`, `540100`, retired and not reusable).
2. **No successor is put in their place.** There is no 301-compatibility Worker,
   no 410 Worker, no catch-all, no proxy to `net/apex` or `dev/apex`, and no
   deprecated workspace. The apex hostnames are vacated on purpose.
3. **Nothing they did is ported.** These behaviours are retired with the units:
   the region-aware `/` 301 (`umaxica.<tld>/?ri=jp` → `jp.umaxica.<tld>`),
   `/about`, `/health`, `/health.html`, `/health.json`, `/revision`, `/offline`,
   Hono ETag, language detection, `theme` cookie reflection, CSRF middleware,
   security headers, the Cloudflare Rate Limiter binding, structured logging,
   the 404/error boundary, static assets, favicon, manifest, robots, sitemap,
   the service worker and its offline cache. Whatever the Experience authority
   needs is redesigned in its own boundary (Rails, CloudFront, AWS WAF, …).
4. **`dev/apex` and `net/apex` are retained** unchanged, still Hono on Workers,
   still standalone (not extracted into a shared package). Root dependencies
   they consume (Hono, `@hono/structured-logger`, Vite, Tailwind, Hurl,
   Playwright, size-limit) stay.
5. A repository invariant (`test/retired-apex-units.test.ts`) fails if any of the
   three units returns to the deployment graph, not just if a directory reappears.

This is a deployment-unit retirement, **not a framework migration**.
[ADR 011](011-apex-workers-stay-hono.md) is not reversed: its decision still holds
for `dev/apex` and `net/apex`. The difference is that app/com/org no longer have
an Edge apex unit at all. ADRs 003, 008, 011, 012, 014 and 022 carry a
"superseded for app/com/org apex only" pointer here; their bodies are history and
are unchanged.

## Service worker

The retired apexes registered a service worker with scope `/`. A browser that
installed it keeps it after the origin stops serving it, and that scope will
cover the future Experience origin, including `/api/v0/experience`. Deleting the
source here stops new installs. It does not unregister existing ones. The first
Experience deployment on each apex must handle the leftover worker, for example
by serving a replacement `sw.js` that unregisters itself, or by sending
`Clear-Site-Data: "storage"` from a navigation response. That is a Phase 1
requirement.

## External state — not changed by this record

Removing the units from the repository does **not** free the hostnames in
Cloudflare. According to the operations docs, at retirement each of
`umaxica.app`, `umaxica.com` and `umaxica.org` was a **Public Hostname on the
Edge-owned development Tunnel** (ADR 014), routed to `core:5401`, `core:5101` and
`core:5301`, and behind a **Cloudflare Access application**. The Worker custom
domains had already been removed (`"routes": []`). The deployed Worker scripts
`umaxica-apps-edge-{app,com,org}-apex` (and any `-development` / `-test`
variants) may still exist in the account without a route.

A hostname counts as freed only after an operator has removed those objects and
checked that nothing serves it. Until then the state is "code cutover complete,
external Cloudflare cutover pending".

## Outcome

Code cutover implemented 2026-10-01. External Cloudflare cutover not performed by
this change. See `evidence/2026-10-01-app-com-org-apex-retirement.md`.
