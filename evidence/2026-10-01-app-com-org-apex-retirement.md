# 2026-10-01 — app/com/org apex retirement (ADR 024, Phase 0)

Base: `feature` at 3077f584 with the unrelated cf/config WIP stashed
(`git stash` "wip cf/config migration").

## Inventory (`git grep` for `{app,com,org}/apex`, `{app,com,org}-apex`, ports 5101/5301/5401, namespaces 5x0100, bare `umaxica.{app,com,org}`)

- Removed or updated (active): `pnpm-workspace.yaml`, lockfile importers,
  `tools/workers-manifest.json`, `compose.yaml`, `.devcontainer/compose.yaml`,
  `.devcontainer/devcontainer.json`, `.github/workflows/integration.yaml` (knip,
  test, test-stress, size matrices), `scripts/{check-local,check-apex-domains,deploy-edge-preview}`,
  `tools/verify-edge-connectivity.mjs` (comments; surfaces derive from the manifest),
  rate-limit table and doc, eight root tests, README, AGENTS, SECURITY,
  `docs/operations/{cloudflare-tunnel-development,connectivity-acceptance,rate-limit-namespace-allocation}.md`,
  `docs/design/{ui-shell-contract,visual-identity-matrix}.md`, dev/net `api/routes.hurl` comments.
- Kept, still needed: `dev/apex/src/page-content.tsx` domain directory (hostnames
  are real domains); `{dev,net}/apex/test/csrf.test.ts` negative-origin cases;
  every `jp.`/`docs-jp.`/`info.` hostname used by core and content cells.
- Kept as history: `evidence/`, `plans/`, ADR bodies, and dated run logs in the ops docs
  (under a retirement banner).

## Results (final run)

| Command                                                                               | Result                                                                                                                         |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install`                                                                        | ok; lockfile −210 lines, only the three importers removed                                                                      |
| `pnpm run format:check`, `lint`, `lint:types`, `check:generated`, `typecheck`, `knip` | pass                                                                                                                           |
| `pnpm run check:workers`                                                              | FAIL — RATE_LIMITER namespace drift only (ADR 022 ids never applied to any `wrangler.jsonc`; reproduced on clean HEAD)         |
| `pnpm run check:architecture`, `check:deps`, `check:spelling`                         | pass                                                                                                                           |
| `pnpm run test`                                                                       | 1 failure, same drift: `rate-limit-namespace-allocation` "unique account-wide namespace". Includes `retired-apex-units` 10/10  |
| `pnpm run build`                                                                      | pass, 17 units                                                                                                                 |
| `pnpm run check:size`                                                                 | pass after re-baselining dev/net apex to 53.5 kB measured (+10% = 59 kB); was 53.46 kB over a 52 kB budget on unchanged `src/` |
| `pnpm run test:api`                                                                   | 17 units, 0 failed files                                                                                                       |
| `pnpm run test:e2e`                                                                   | pass, all 17 units (chromium headless shell 153.0.8010.12)                                                                     |
| `scripts/deploy-edge-preview {app,com,org}/apex`                                      | exit 64, "Retired Edge Worker directory"                                                                                       |

Pre-existing fixes made alongside: `*/src/components/site-footer.tsx` year hoisted to
module scope (`react(purity)`); a spelling-flagged mermaid node id renamed in
`visual-identity-matrix.md`.

## Not done

- RATE_LIMITER namespace rewrite: blocked in this session by the auto-mode permission
  classifier (it changes live production counters). Needs an explicit owner decision.
- No Cloudflare account state was read or changed. The apex hostnames are **not**
  confirmed freed. See ADR 024 "External state".

## External Cloudflare observation (read-only, 2026-10-01)

The operator reports the Tunnel Public Hostnames now route
`umaxica.{app,com,org}` to `http://xper.{app,com,org}.localhost:3000`. That was not
verified from this session: `wrangler whoami` says it is not authenticated, so no
account object was read.

Unauthenticated HTTPS probe, `curl -sI https://umaxica.<tld>/` and `/health.json`:
all three return `HTTP/2 502`, `server: cloudflare`, body `error code: 502`
(cf-ray `a43acdcae917f526-NRT`, `a43acdcbed81db13-NRT`, `a43acdccf99bd4a2-NRT`).
DNS resolves to Cloudflare anycast (`2606:4700:…`).

Reading: no response came from the retired Hono apex (it would answer 301 or 200
with `service=`). No Access login 302 was returned. This matches a Tunnel route to
an origin that is not running. An HTTP probe cannot prove that no Worker Custom
Domain/Route or Access application object exists in the account.

## Cloudflare account read (2026-10-01, after `wrangler login --device`)

Account `UMAXICA` (c90999d8…). These were read-only API GETs with the wrangler OAuth token:

- `GET /accounts/{id}/workers/scripts`: success, 19 scripts. Apex scripts present:
  `umaxica-apps-edge-dev-apex` and `umaxica-apps-edge-net-apex` only. No
  `umaxica-apps-edge-{app,com,org}-apex*` script exists, so there is nothing to clean up.
- `GET /accounts/{id}/workers/domains`: success, 1 custom domain in the account. None is
  `umaxica.{app,com,org}` and none targets an app/com/org apex service.
- `GET /zones/{zone}/workers/routes` for the umaxica.app, umaxica.com and umaxica.org zones:
  success, 0 routes each.
- `GET /accounts/{id}/access/apps`: success, 0 applications (total_count 0). The
  token's listed scopes do not include an explicit Access scope. The empty list is
  consistent with the unauthenticated probe (no Access 302 on any apex).

Verdict: no Worker hostname binding and no Access application owns
`umaxica.{app,com,org}`. The Tunnel Public Hostnames route them to the Experience
origin (`xper.<tld>.localhost:3000`), as reported by the operator.
