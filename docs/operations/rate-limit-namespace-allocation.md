# Rate-limit namespace allocation

Normative table of Cloudflare Workers Rate Limiting `namespace_id` values for
UMAXICA Edge and Jump. Why the scheme exists is in
[`adr/022-rate-limit-namespace-allocation.md`](../../adr/022-rate-limit-namespace-allocation.md).
This page records what is assigned today.

A counter is keyed on (`namespace_id`, key) and is scoped to the Cloudflare
**account**, not to a Worker, a repository, or a `wrangler.jsonc` file. Two
bindings that share an id share the counter. Every active id on the account
must therefore be unique.

Machine enforcement for this repository is `pnpm run check:workers`
(`tools/check-workers.mjs`), using the formula in
`tools/lib/rate-limit-namespaces.mjs`. Development ports are **not** copied
here or into that module: they come from each unit's `package.json`
`scripts.dev --port`.

## Format

Production general `RATE_LIMITER` ids:

```text
<dev-port><region>
```

`region` is always two digits. The development port is four digits
(`<tld><surface>`).

Non-production environments prefix that six-digit id. The region suffix stays
the last two digits:

| prefix | environment |
| ------ | ----------- |
| (none) | production  |
| `2`    | development |
| `3`    | test        |
| `4`    | vpc         |
| `5`    | local       |

Prefix `1` is unused for general `RATE_LIMITER` so production stays six digits.
Do not invent an environment that the deployment unit does not already declare.

Example, `app/docs` Global:

```text
production  = 540600
development = 2540600
test        = 3540600
vpc         = 4540600
local       = 5540600
```

Example, `app/core` Japan (no `vpc` tier on Core):

```text
production  = 540581
development = 2540581
test        = 3540581
local       = 5540581
```

## TLD code

Existing development-port thousands:

| code | family |
| ---- | ------ |
| `51` | com    |
| `52` | net    |
| `53` | org    |
| `54` | app    |
| `55` | dev    |

## Surface code

Existing development-port tens. Unused numbers are not free to reassign.

| code | surface |
| ---- | ------- |
| `01` | apex    |
| `03` | info    |
| `05` | core    |
| `06` | docs    |
| `07` | news    |
| `08` | help    |
| `09` | jump    |

Jump is `umaxica-apps-edge-jump`, not a workspace in this repository.

## Region suffix registry

| suffix | region        | status                                  |
| ------ | ------------- | --------------------------------------- |
| `00`   | Global        | required for global surfaces            |
| `01`   | United States | reserved; no Core binding is configured |
| `81`   | Japan         | required for the active Core            |

## Allowed combinations

Global surfaces (`apex`, `info`, `docs`, `news`, `help`, `jump`) use suffix
`00` only.

`core` is region-scoped:

| combination | status                        |
| ----------- | ----------------------------- |
| core + `00` | invalid                       |
| core + `01` | USA, reserved, not configured |
| core + `81` | Japan, active                 |

Do not add a USA Core `RATE_LIMITER` until that deployment exists. Documented
reserved values, absent from every `wrangler.jsonc`:

```text
com/core USA = 510501
org/core USA = 530501
app/core USA = 540501
```

## Production RATE_LIMITER allocation

```text
com/apex  = 510100
com/info  = 510300
com/core  = 510581
com/docs  = 510600
com/news  = 510700
com/help  = 510800

net/apex  = 520100
net/jump  = 520900

org/apex  = 530100
org/info  = 530300
org/core  = 530581
org/docs  = 530600
org/news  = 530700
org/help  = 530800

app/apex  = 540100
app/info  = 540300
app/core  = 540581
app/docs  = 540600
app/news  = 540700
app/help  = 540800

dev/apex  = 550100
```

Budgets are unchanged by this allocation:

| binding             | limit | period | where                      |
| ------------------- | ----- | ------ | -------------------------- |
| `RATE_LIMITER`      | 2000  | 60     | every Edge deployment unit |
| `JUMP_RATE_LIMITER` | 600   | 60     | `umaxica-apps-edge-jump`   |

`all/busy` has no limiter and receives no namespace. `tools/vpc-probe` is never
deployed and has no limiter.

## Jump

`https://jump.umaxica.net` is the net/jump Global surface:

```text
52 + 09 + 00 = 520900
```

The Cloudflare development server for that Worker listens on port `5209`.

Historical Jump ids `999` and `1006` are retired. They are not active
allocations and must not be reused.

## AUTH_RATE_LIMITER

Out of this scheme. Cores keep ADR 010's X10N series, 60 requests / 60 seconds,
`/oidc/*` and `/sign/out` only, consulted in addition to `RATE_LIMITER`.

| brand | production | development | test   | local  |
| ----- | ---------- | ----------- | ------ | ------ |
| app   | `1101`     | `2101`      | `3101` | `5101` |
| com   | `1102`     | `2102`      | `3102` | `5102` |
| org   | `1103`     | `2103`      | `3103` | `5103` |

A future region-aware AUTH redesign is a separate ADR, expected if a USA Core
is introduced. Do not assign general `RATE_LIMITER` ids from the X10N series,
and do not treat surface code `09` (jump) as an AUTH port.

## Adding a surface, TLD, or region

1. Pick an unused surface or TLD code. Do not recycle a retired or reserved
   number (`01` USA Core, historical Jump `999`/`1006`, unused `02`/`04`, …).
2. Give the new deployment unit a development port of `<tld><surface>` in its
   own `package.json` `scripts.dev`. That port is the source of the namespace,
   not a second table in this file.
3. Choose the region suffix from the registry. Global surfaces take `00`. Core
   takes an active region (`81` today). Do not configure `01` until a USA Core
   exists.
4. Write `<env-prefix><port><region>` into each environment that unit already
   deploys. Do not add a new `env.*` block just to occupy a prefix.
5. If the Worker lives in another repository, add its production id to
   `tools/lib/rate-limit-namespaces.mjs` (`JUMP` today) so this checker can
   refuse a copy-paste.
6. Update this page and run `pnpm run check:workers`.
