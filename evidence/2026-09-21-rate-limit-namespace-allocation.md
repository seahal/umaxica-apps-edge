# Rate-limit namespace isolation (ADR 022)

Date: 2026-09-21. Local working tree only. No GitHub, Cloudflare, or
production write. No production rate-limit probe.

## Before

Committed production `RATE_LIMITER` ids were the ADR 010 shared series
(`1001`/`1002`/`1003`/`1004`/`1005` and matching environment prefixes).
`app` apex/core and all twelve `{app,com,org}/{docs,help,info,news}` units
shared `1001`. Cloudflare counts those ids as one account-wide counter.

Jump in `umaxica-apps-edge-jump` used `JUMP_RATE_LIMITER` `1006` on Wrangler
port `8787`. Historical Jump id `999` is recorded in ADR 010 and is retired.

## Rule implemented

General `RATE_LIMITER` production id is `<dev-port><region>`. Region suffix
`00` Global, `01` USA reserved inactive, `81` Japan. Non-production prefixes
`2`/`3`/`4`/`5`. Ports come from each unit's `package.json` `scripts.dev
--port`. `AUTH_RATE_LIMITER` stays on the existing X10N series (60/60).
Budgets stay `RATE_LIMITER` 2000/60.

## Production RATE_LIMITER ids observed

```text
com/apex  510100    org/apex  530100    app/apex  540100
com/info  510300    org/info  530300    app/info  540300
com/core  510581    org/core  530581    app/core  540581
com/docs  510600    org/docs  530600    app/docs  540600
com/news  510700    org/news  530700    app/news  540700
com/help  510800    org/help  530800    app/help  540800
net/apex  520100    net/jump  520900    dev/apex  550100
```

Japan Core `AUTH_RATE_LIMITER` production ids remain `1101` `1102` `1103`.

No `namespace_id` ending in `01` is present among six-digit RATE_LIMITER ids.
`510501`, `530501`, and `540501` are absent from every `wrangler.jsonc`.

## Verification

- `pnpm run check:static` — pass (format, lint, lint:types, generated types,
  typecheck, knip, `check-workers: OK (20 workers validated)`, architecture,
  syncpack, cspell 2730 files / 0 issues).
- `pnpm run test` — pass, including `test/rate-limit-namespace-allocation.test.ts`
  (5) and repository invariants (635).
- Sibling Jump `wrangler.jsonc` read by `check-workers.mjs`; production
  `JUMP_RATE_LIMITER` is `520900` at 600/60.

## Not verified

Cloudflare account listing of every Worker on the account. Uniqueness is
enforced for this repository plus the known Jump allocation, not for unknown
third Workers. `pnpm run test:api` and `pnpm run test:e2e` were not run:
namespace identity is configuration, not request behaviour. Production was not
deployed.
