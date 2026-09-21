# ADR 022: Rate-limit namespaces are per FQDN, with a region suffix

## Status

Accepted and implemented — 2026-09-21.

This decision supersedes the **namespace-sharing allocation** described in
[ADR 010](010-first-touch-rate-limiting.md) (one general `RATE_LIMITER` budget
per brand per tier, encoded as `X001` / `X002` / …). ADR 010's first-touch
placement, the general + AUTH two-limiter construction, the 429 contract, and
the AUTH `X10N` series remain in force.

The current assignment table lives in
[`docs/operations/rate-limit-namespace-allocation.md`](../docs/operations/rate-limit-namespace-allocation.md).

## Context

Cloudflare Rate Limiting counters are keyed on (`namespace_id`, key) and scoped
to the **account**. Two bindings that share a `namespace_id` — even in different
Workers, even in different repositories — share the counter.

ADR 010 used that property on purpose: every unit of a brand at a given tier
declared the same id, so one client IP had one budget across `apex`, `core`,
`docs`, `help`, `info` and `news`. The aim was to stop a client rotating
`docs.` → `help.` → `news.` from multiplying the allowance. That judgement was
correct for a brand that still behaved as one product surface. It is not
treated here as a past mistake.

## Changed architecture

Edge is now split into independent FQDN / deployment units. `apex`, `core`,
`info`, `docs`, `news`, `help`, and Jump have different duties, traffic
profiles, and failure domains.

A shared general `RATE_LIMITER` namespace couples those units at the rate-limit
layer: load on one surface spends the same counter another surface needs. NAT,
proxies, and shared networks already collapse many users onto one IP key, so
the extra cross-FQDN coupling widens the operational failure domain.

## Decision

General `RATE_LIMITER` namespaces are allocated per FQDN / deployment unit.
The production canonical form is:

```text
<dev-port><region>
```

The region suffix registry is:

- `00` — Global
- `01` — United States (reserved; no Core binding is configured)
- `81` — Japan (the only active Core region)

Global surfaces use suffix `00` only:

```text
apex / info / docs / news / help / jump → 00
```

`core` is region-scoped:

```text
core + 00 = invalid
core + 01 = USA, reserved, not configured
core + 81 = Japan, active
```

`510501` / `530501` / `540501` are reserved USA Core values and MUST NOT appear
in any `wrangler.jsonc` until that deployment exists.

Jump is the net/jump Global surface in `umaxica-apps-edge-jump`:

```text
52 + 09 + 00 = 520900
```

Its Cloudflare development port is `5209`. Historical Jump ids `999` and
`1006` are retired and MUST NOT be reused.

Each active FQDN receives its own general `RATE_LIMITER` namespace. Sharing
that binding across deployment units is prohibited unless a later ADR
explicitly authorizes it. This change does not introduce a new shared global
limiter. Cross-FQDN or account-wide abuse control belongs to WAF / Rate
Limiting Rules, or to a future limiter designed for that job.

### Environment is a separate axis

`00` / `01` / `81` are region codes. They are not environment codes.
Non-production traffic MUST NOT share a production namespace.

The environment axis is a prefix on the six-digit port+region id:

| prefix | environment |
| ------ | ----------- |
| (none) | production  |
| `2`    | development |
| `3`    | test        |
| `4`    | vpc         |
| `5`    | local       |

Production carries no prefix, so the public allocation is exactly
`<dev-port><region>` (for example `540600`). Prefix `1` is unused on general
`RATE_LIMITER`. The digits `2` / `3` / `4` / `5` keep ADR 010's environment
numbering. Do not add an `env.*` block that the unit does not already have.

Development ports stay in each unit's `package.json` `scripts.dev --port`. The
checker reads that port; it does not keep a second copy of the port table.

### `AUTH_RATE_LIMITER`

Out of scope. Cores still declare `AUTH_RATE_LIMITER` (60/minute) in addition
to `RATE_LIMITER` on `/oidc/*` and `/sign/out`, as ADR 010 decided. The binding
keeps the existing `X10N` series (`<tier>10<brand-digit>`), the existing paths,
key, and first-touch ordering. A region-aware AUTH redesign, if a USA Core is
introduced, is a later ADR.

### Production `RATE_LIMITER` registry (current)

```text
com/apex  510100
com/info  510300
com/core  510581   # JP only
com/docs  510600
com/news  510700
com/help  510800

net/apex  520100
net/jump  520900   # umaxica-apps-edge-jump

org/apex  530100
org/info  530300
org/core  530581   # JP only
org/docs  530600
org/news  530700
org/help  530800

app/apex  540100
app/info  540300
app/core  540581   # JP only
app/docs  540600
app/news  540700
app/help  540800

dev/apex  550100
```

Budgets stay `RATE_LIMITER` 2000/60 and `JUMP_RATE_LIMITER` 600/60. This
decision isolates namespaces; it does not retune limits.

## Trade-off

A client that walks several FQDNs now receives one general allowance per
surface, so the total general allowance across the brand increases. That is
accepted. The general Worker binding protects and load-sheds each surface.
Cross-FQDN aggregate abuse control is a different layer's job.

## Consequences

- Japan Core traffic is counted separately from the global surfaces of the same
  brand, and a future USA Core can take suffix `01` without renumbering Japan.
- Bindings no longer have to agree on `simple.limit` across units, because they
  no longer share a counter. The 2000/60 page budget and the 60/60 auth budget
  stay as starting points to tune against real traffic.
- `tools/check-workers.mjs` enforces the allocation: unique namespaces across
  the twenty units, their environments, and the known Jump id; global surfaces
  end in `00`; Core ends in `81` and never in `00`; suffix `01` is a failure
  until a USA Core exists; AUTH stays on X10N.

## Outcome

Implemented in every deployment unit's `wrangler.jsonc`, with Jump at
`520900`, the checker in `tools/check-workers.mjs`, the formula in
`tools/lib/rate-limit-namespaces.mjs`, and the assignment table in
`docs/operations/rate-limit-namespace-allocation.md`.
