# ADR 017: Edge self-health machine API

## Status: Implemented

Amends [ADR 016](016-rails-machine-health-api.md) by adding the **Edge**
implementation of the same Health API DTO. Does not change how Edge consumes
Rails health over Workers VPC.

## Context

ADR 016 records Rails' machine-facing Health API:

```text
GET /api/v0/health.json
```

Edge already consumes that document privately (`src/lib/rails-health.ts`) and
maps it onto the operational `text/plain` probes (`GET /health`,
`/health/startups`, `/health/livenesses`, `/health/readinesses`). That consumer
path is not Edge reporting on itself.

Hono apex workers, TanStack Start cores, and Astro content surfaces had no
framework-independent JSON document that said only: this Edge runtime is up.

## Decision

1. Every active Edge deployment unit exposes:

   ```text
   GET /api/v0/health.json
   ```

   The five Hono apex workers, three TanStack Start cores, and twelve Astro
   content surfaces. There is no remaining Next.js unit.

2. The document is Edge-self-only. It does not import or call `rails-client`,
   `rails-health`, Workers VPC, CMS, KV, R2, revision, or any other hop.
   A Rails outage must not change this response.

3. The wire contract is:

   ```http
   HTTP/1.1 200 OK
   Content-Type: application/json; charset=utf-8
   Cache-Control: no-store
   X-Robots-Tag: noindex, nofollow
   ```

   ```json
   {
     "status": "pass",
     "checks": {
       "startup": { "status": "pass" },
       "liveness": { "status": "pass" },
       "readiness": { "status": "pass" }
     }
   }
   ```

   Status vocabulary is `pass` | `warn` | `fail`. The current isolate has no
   extra readiness dependency, so a request that executes the handler returns
   `pass` for all three checks.

4. `/health` remains the operational `text/plain` contract. This JSON API is
   not an alias of `/health` and does not proxy it. `/health.json` at the
   origin root stays a 404 HTML page.

5. Core public FQDNs still treat `/api/v0/*` as Rails-owned except the exact
   path `/api/v0/health.json`, which is Edge-owned (same Host-header table as
   ADR 007 / ADR 009). Rails still publishes its own Health API on the private
   origin; Edge still consumes that privately.

6. Implementations stay per-unit copies. Same wire contract, not one shared
   package.

## Consequences

- Rate limiting skips the exact path on Hono and Core (matching `/health`) and
  on Astro (on-demand only). Language detection on apex workers skips it so it
  does not emit a `language` cookie.
- HTTP acceptance is `api/health-api.hurl` in each unit.

## Outcome

Implemented in this repository. See `docs/development/edge-self-health-api.md`.
