# Architecture Decision Records (ADR)

This directory contains completed architecture decisions and implementation plans that have been executed.

## Format

Each file follows the naming convention: `NNN-short-title.md`

Files are promoted here from `/plans/` when the corresponding implementation is complete and merged.

Each ADR should end with a `## Outcome` section describing what was implemented and linking the relevant PR(s).

ADR 017 records the Edge self-health machine API (`GET /api/v0/health.json`)
as distinct from Rails health consumption (ADR 016) and from operational
`text/plain` probes.

Some ADRs may record an accepted architecture boundary before implementation.
Those records should state that implementation is deferred in their `## Outcome`
section.

Current boundary records:

- [ADR 016](016-rails-machine-health-api.md) — Rails machine health API
- [ADR 017](017-edge-self-health-api.md) — Edge self-health API
- [ADR 018](018-core-rails-direct-internet.md) — Core direct Internet transport
- [ADR 019](019-edge-parallel-contract-boundaries.md) — Edge boundaries that can ship beside the Rails rewrite
- [ADR 020](020-wrangler-device-login.md) — Wrangler device login
