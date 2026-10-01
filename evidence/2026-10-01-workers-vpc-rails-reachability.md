# 2026-10-01 — Workers VPC → Rails reachability

The check ran against Cloudflare account `UMAXICA` (c90999d8…), with wrangler OAuth from
`wrangler login --device`. The three Cores are out of scope: they reach Rails over
the public internet (ADR 018).

## Binding alone — `pnpm run check:vpc`

All 12 content cells `{app,com,org}/{docs,help,info,news}` passed all three
gates:

- Direct VPC → Rails
- VPC identity: each answered from its own namespace, e.g. `docs/app`
- VPC contract: `status=pass`, all required fields present

## Through the application — `pnpm --dir <cell> run dev:vpc`

Each cell was started alone on the `vpc` tier, which uses the remote VPC binding
(log line `Establishing remote connection...`; request logs carry
`"environment":"vpc"`). Results:

- `GET /health/readinesses` returned `ok` and `200` in all 12 cells.
- `GET /health` returned `200` in all 12 cells.

The first pass started three cells that did not come up. None of these were VPC faults:

- `com/docs`: `RemoteSessionAuthenticationError`. Its cached
  `node_modules/.cache/wrangler/wrangler-account.json` held a different account
  (`a08f0733…`). The cache was deleted and wrangler regenerated it with `c90999d8…`.
- `org/info`, `org/news`: `MiniflareCoreError [ERR_RUNTIME_FAILURE]`. This happened while nine
  earlier `dev:vpc` servers were still running, because the first pass did not stop
  them. With those stopped, they came up.

After the fixes, the re-run passed for all three.

## Not checked / found

- `pnpm run check:preview:vpc` fails before it reaches the network:
  `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`. It invokes a `preview:vpc` script that no unit
  has had since the TanStack Start migration (5a016e10); `dev:vpc` replaced it.
  The checker was not changed.
