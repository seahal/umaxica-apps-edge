# ADR 016: Edge verifies Rails through the machine-facing Health API

## Status: Implemented

Amends [ADR 009](009-rails-health-entrypoint-and-dispatch-operability.md)
decision 3 (liveness-only `/health/liveness.json`). Does not reopen ADR 009's
merge of `/rails-health` into Edge `/health`, the Host-header dispatch table, or
the public Edge probe representation that later became `text/plain`.

## Context

Rails now publishes two health surfaces with different consumers:

- Operational / Kubernetes probes: `/health`, `/health/startups`,
  `/health/livenesses`, `/health/readinesses` — `text/plain`.
- Machine-facing Health API: `GET /api/v0/health.json` — `application/json`,
  `status` ∈ `{pass, warn, fail}`, with required `checks.startup`,
  `checks.liveness`, `checks.readiness`.

ADR 009 recorded Edge probing `/health/liveness.json` only, because that was the
strictest Rails JSON probe at the time and `/health` was polled often enough that
three requests per check were not worth the tunnel traffic. That path is now an
operational artefact, not the multi-runtime contract. Hono, TanStack Start,
Astro, and non-JS runtimes are expected to share `/api/v0/health.json`.

`/api/v0/revision.json` and `/revision` remain deployment identity. A revision
response is not a health pass; a health pass is not a revision match.

## Decision

1. Every Rails-backed frame verifies Rails over Workers VPC with
   `GET /api/v0/health.json` on that frame's existing `PRIVATE_RAILS_ORIGIN`.
   The path has no frame prefix. Workers VPC topology, the Host header, and the
   one-Service-for-fifteen-frames arrangement do not change.

2. The consumer is `src/lib/rails-health.ts` (`checkRailsHealth`), copied
   byte-identically across the fifteen frames. It validates HTTP status,
   `application/json` (parameters such as `charset=utf-8` allowed), JSON parse,
   required fields, and the `pass`/`warn`/`fail` vocabulary. Additive unknown
   fields and extra checks are ignored. Required-field absence, wrong types,
   unknown status values, media-type mismatch, redirects, and HTTP/status pairing
   errors (`200`+`fail`, `503`+`pass`/`warn`) are `invalid-contract`.

3. Transport outcomes stay distinct from service health:
   `not-configured`, `unreachable` (including Workers VPC `ProxyError:`),
   `http-error`, `invalid-contract`, `pass`, `warn`, `fail`. A `503` JSON
   document with `status=fail` means Rails was reached and is unhealthy, not
   that the hop failed.

4. Edge's public `/health` remains the operational `text/plain` contract
   (ADR 009 as later amended by the Kubernetes-style probe work). The Rails
   Health API body is never proxied, logged, or returned. Callers map
   `pass`/`warn`/`not-configured` to Edge readiness `ok`, and `fail` plus every
   transport/contract failure to Edge readiness `error`. Startup and liveness
   stay isolate-only.

5. Apex workers stay Rails-blind. Kubernetes on the Rails cluster may keep
   hitting Rails operational probes; this record is only the Edge → Workers VPC
   → Rails machine path.

## Consequences

- `RAILS_LIVENESS_PATH` and `checkRailsLiveness` are gone from active code.
- `scripts/check-rails` and `tools/vpc-probe/probe.mjs` target the Health API.
- Public Core FQDNs still block `/health/liveness.json` and siblings — those are
  Rails operational JSON, not Edge's Health API consumer.

## Outcome

Implemented in this repository: fifteen `rails-health.ts` copies, Astro and
TanStack `/health` plus `/health/readinesses` routes, repository invariants in
`test/rails-connection-invariants.test.ts`, and local `scripts/check-rails`.
