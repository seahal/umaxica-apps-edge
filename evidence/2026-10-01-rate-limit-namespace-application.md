# 2026-10-01 — ADR 022 RATE_LIMITER namespaces applied to wrangler configs

ADR 022 records "Accepted and implemented — 2026-09-21". In practice no
`*/wrangler.jsonc` carried its ids: every unit still declared the ADR 010 `X00N`
series, so `check:workers` and
`test/rate-limit-namespace-allocation.test.ts` failed on a clean HEAD (c7f2e5ae).

The owner explicitly authorized the change on 2026-10-01.

## Contract (ADR 022)

The id is `<env-prefix><dev-port><region>`.

- Environment prefix: production none, development `2`, test `3`, vpc `4`, local `5`.
- Region `00` for apex/info/docs/news/help; `81` for core (Japan).
- Only the `RATE_LIMITER` binding changes. `AUTH_RATE_LIMITER` keeps the ADR 010
  `X10N` series.

## Change

There were 78 `namespace_id` values in 17 units. Each old id was unique inside its own
file, which was checked before replacement. The mapping was taken from the
`tools/check-workers.mjs` expected values. Examples:

| unit / tier          | old  | new     |
| -------------------- | ---- | ------- |
| app/core production  | 1001 | 540581  |
| com/core local       | 5002 | 5510581 |
| org/docs vpc         | 4001 | 4530600 |
| app/info test        | 3001 | 3540300 |
| net/apex production  | 1004 | 520100  |
| dev/apex development | 2005 | 2550100 |

Before this change, every content cell shared `1001` / `2001` / … with `app/core`. That
was exactly the cross-FQDN counter coupling ADR 022 removed.

## Results

- `node tools/check-workers.mjs`: `OK (17 workers validated)`
- `vitest run test/rate-limit-namespace-allocation.test.ts`: 5/5 pass
- `pnpm run check`: exit 0
- `pnpm run test:api`: 17 units, 0 failed files

## Operational effect

On the next deploy of each Worker its counters start fresh under the new ids.
The old ids stay retired (ADR 022) and must not be reused.
