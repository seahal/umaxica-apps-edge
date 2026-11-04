# Development-time Workers VPC path: local workerd → dev VPC Service → dev Tunnel → dev Rails

## Status

**Config work is done and green** (`format:check`, `lint:check`, `typecheck`,
156 test files / 1024 tests, `check-workers: OK (19 workers validated)`).
Recorded in `adr/006-development-workers-vpc-transport.md`.

**What remains is the one thing static checks cannot answer: whether a request
actually reaches Rails.** The development connector has now been restarted, so
that check can be run — see Verification. It needs a build and a local server,
which is why it has not been run yet.

Note the plan below was written before two facts were established, and the
implementation followed the facts rather than the plan:

- The single VPC Service `019f5fe0-…` is on the **development** tunnel
  (`1d501e9a-…`), not a production one. So no new dev service was created; the
  existing one moved from `env.production` to `env.preview`.
- No production tunnel or VPC Service exists, so `env.production` now declares
  no binding and fails closed.

## Context

Edge must reach Rails without Rails having a public origin. `adr/005-rails-edge-workers-vpc-connection.md`
(untracked, status _Completed_) settled this for production — a `vpc_services` binding declared in
`env.production` only — but routed **development** through a _public_ Access-protected hostname
(`https://core-jp.umaxica.app` + service token) instead.

That development transport has three problems:

1. **It is not production parity.** Production goes Worker → VPC binding → tunnel → Rails. Development goes
   Node → public HTTPS → Access → tunnel → Rails. The two share only the last hop. Every Cloudflare-specific
   failure mode on the production path — missing binding, wrong `service_id`, VPC service pointed at the wrong
   host/port, `global_fetch_strictly_public` interactions — is invisible until deploy.
2. **It rests on a factual error.** ADR 005 §1 claims "A VPC binding is a Workers-runtime facility; locally the
   Edge is a Node process in a container, so there is no runtime to grant it." This is wrong.
   `app/core/next.config.ts` already calls `initOpenNextCloudflareForDev()`, and `opennextjs-cloudflare preview`
   runs the app in local **workerd**. `remote: true` runs the app locally while proxying the binding to the real
   Cloudflare resource. Cloudflare documents this as the supported way to use VPC in local development.
3. **It is unverified.** ADR 005 states plainly: "Not verified end to end. No request has been made to Rails over
   either transport from this repository."

Intended outcome: a **third, opt-in** development tier that exercises the real production-shaped path against a
**separate** development VPC Service and development Tunnel, while leaving the credential-free `pnpm dev` loop
exactly as it is today.

### Decisions taken (from the user, this session)

| Question                                             | Answer                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Account-wide `Workers Scripts: Edit` on dev machines | Accepted **only** for an opt-in `preview:vpc` script                        |
| Rails side                                           | Local Podman Rails **and a development tunnel already exist**               |
| Workflow shape                                       | Three tiers: `dev` / `preview` / `preview:vpc`                              |
| Separation                                           | Separate dev VPC Service + separate dev Tunnel, **same Cloudflare account** |

---

## 1. Current configuration (as found)

**Versions** — `next` ^16.3.0, `@opennextjs/cloudflare` ^1.19.11, `wrangler` catalog ^4.93.0 (root pins ^4.118.0 —
a real skew, see Risks). All from `pnpm-workspace.yaml` `catalog:`.

**Frames** — 15 Rails-backed OpenNext apps (`{app,com,org}/{core,docs,news,help,info}`), 4 Hono `*/apex` workers
(no Rails at all, by ADR 005 §2), `dev/acme` on Vercel.

**Rails transport** — `*/src/lib/rails-client.ts` ×15, identical but for `RAILS_FRAME_PREFIX`.
`getRailsClient()` resolves with **no branch on environment name**:

1. `env.UMAXICA_APPS_EDGE_CF_WORKERS_VPC` present → VPC transport, origin `http://core.app.localhost:3000`
2. else `RAILS_ORIGIN` + `RAILS_ACCESS_CLIENT_ID` + `RAILS_ACCESS_CLIENT_SECRET` all present → Access transport
3. else `null` → `checkRailsHealth` reports `not-configured` (fail closed)

**This resolution order is the reason the plan below needs no application-code change at all.**

**Bindings** — `vpc_services` appears only in `env.production` of the 15 `wrangler.jsonc`, all with
`service_id: 019f5fe0-287f-7040-9f2f-036cb5b21df7`, `remote: true`. Enforced by
`tools/check-workers.mjs:163-181` and `test/rails-connection-invariants.test.ts`.

**Scripts** — `*/core`: `dev` = `next dev --port 54xx`; `preview` = `opennextjs-cloudflare build --env development
&& opennextjs-cloudflare preview --env development`. `preview` today therefore runs workerd with **local**
bindings and no VPC binding.

**Podman** — `compose.yaml` (project `umaxica-apps-edge`) has services `core` + `postgres`, **no `networks:` key**,
**no cloudflared**. `test/compose-tunnel-invariants.test.ts` fails the build if `cloudflared` /
`compose.custom.yaml` / `CLOUDFLARED_TOKEN` reappear.

**Secrets** — `.gitignore` ignores `.env`, `.env.development.local`, `.dev.vars*` with 15 hand-written
`!*/.dev.vars.example` negations. `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` pass through `compose.yaml`.
`wrangler login` state persists in the `wrangler-config` named volume.

---

## 2. Cloudflare specification relied upon

- **VPC Services** — schema is `{ binding, service_id, remote }`; a service is `{type: http, http_port,
  https_port, host: { hostname, resolver_network: { tunnel_id, resolver_ips } } }`. "`remote: true` … allows
  access to the VPC Service during local development."
  <https://developers.cloudflare.com/workers-vpc/configuration/vpc-services/>
- **Workers VPC overview** — "Connect a Cloudflare Tunnel to your infrastructure, register each target as a VPC
  Service, and use the binding API from your Worker." <https://developers.cloudflare.com/workers-vpc/>
- **Get started** — no Access application or service token is involved in the VPC path.
  <https://developers.cloudflare.com/workers-vpc/get-started/>
- **Local development / remote bindings** — `remote: true` keeps your code on your machine and routes only the
  binding to the real resource; `wrangler dev --remote` (uploads the whole Worker) is legacy and cannot mix
  local and remote. <https://developers.cloudflare.com/workers/development-testing/>
- **Remote bindings architecture** — workerd runs locally; a remote-proxy client/server pair carries the binding
  call; auth uses Wrangler's existing OAuth connection.
  <https://blog.cloudflare.com/connecting-to-production-the-architecture-of-remote-bindings/>
- **Narrow permissions are not yet supported** — remote bindings need account-wide Workers Scripts write today.
  <https://github.com/cloudflare/workers-sdk/issues/10091>
- **Wrangler environments** — "bindings and environment variables are non-inheritable, and must be specified per
  environment". <https://developers.cloudflare.com/workers/wrangler/environments/>
- **OpenNext** — `preview` "builds your app and serves it locally … in the Workers runtime";
  `initOpenNextCloudflareForDev()` gives `next dev` access to bindings.
  <https://opennext.js.org/cloudflare/get-started>, <https://opennext.js.org/cloudflare/bindings>

---

## 3. Misconceptions and hazards in the current design

| #   | Where                                                                | Issue                                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | `adr/005` §1, `tools/check-workers.mjs:154-160`                      | "no runtime to grant it" — false. `preview` runs workerd; `remote: true` exists exactly for this. The comment block in `check-workers.mjs` states the same error and must be rewritten, not just relaxed.                                           |
| B   | `adr/005` §1                                                         | Conflates "remote bindings need a write-scoped credential" (true, and a fair reason to keep it **off by default**) with "development cannot use the binding" (false).                                                                               |
| C   | `adr/005` §1 + `docs/operations/cloudflare-tunnel-development.md:25` | The development Access transport reaches **the same Rails as production**, through the same tunnel. This is the _opposite_ of the separation now required — today a dev Edge can already hit production Rails.                                      |
| D   | `docs/operations/cloudflare-tunnel-development.md:9-15`              | "One connector" is a rule about connectors **on one tunnel**. It does not forbid a second, _separate_ development tunnel — which is what the accepted design uses. Reading it as a ban on all additional tunnels would block this work incorrectly. |
| E   | `adr/005` §5                                                         | `global_fetch_strictly_public` does **not** cover the Access hostname (it is public). Correct as written; keep the invariant test that closes it.                                                                                                   |
| F   | Every `wrangler.jsonc`                                               | `observability.enabled: false` with `logs.enabled: true` nested inside — observability is off everywhere. Unrelated to this plan, but it will make tunnel/VPC failures harder to diagnose. Flagging, not fixing here.                               |

---

## 4. Recommended architecture

```
DEVELOPMENT — opt-in, `pnpm preview:vpc`

  browser ──▶ http://127.0.0.1:5402
                    │
        ┌───────────┴────────────── your machine ──────────────┐
        │  opennextjs-cloudflare preview --env preview          │
        │      → local workerd  (real Workers runtime)          │
        │      → env.UMAXICA_APPS_EDGE_CF_WORKERS_VPC           │
        │         { service_id: <DEV>, remote: true }           │
        │      → wrangler remote-binding proxy client           │
        └───────────┬───────────────────────────────────────────┘
                    │  (wrangler OAuth / CLOUDFLARE_API_TOKEN)
                    ▼
        Cloudflare ── DEV VPC Service <DEV service_id>
                    │      host core.app.localhost:3000
                    ▼
        DEVELOPMENT Tunnel  <dev tunnel_id>
                    ▼
        cloudflared connector in the **Rails** Compose project
                    ▼
        development Rails container  :3000
```

```
PRODUCTION — unchanged

  browser ──▶ umaxica.{app,com,org}
                    ▼
        deployed Worker  (env.production)
                    ▼
        env.UMAXICA_APPS_EDGE_CF_WORKERS_VPC
           { service_id: 019f5fe0-…, remote: true }
                    ▼
        PRODUCTION VPC Service
                    ▼
        PRODUCTION Tunnel
                    ▼
        production Rails (AWS)
```

**Mechanism: a fourth wrangler environment, `preview`.** Bindings are non-inheritable between wrangler
environments, so declaring the dev VPC binding in `env.preview` — and nowhere else — makes the separation
structural rather than procedural:

| wrangler env  | `vpc_services`                    | Command                    | Cloudflare credential |
| ------------- | --------------------------------- | -------------------------- | --------------------- |
| `development` | **none**                          | `pnpm dev`, `pnpm preview` | **none**              |
| `preview`     | dev `service_id`, `remote: true`  | `pnpm preview:vpc`         | required              |
| `test`        | none                              | vitest                     | none                  |
| `production`  | prod `service_id`, `remote: true` | `pnpm deploy`              | required              |

This is preferred over passing `--local` / `--remote` flags to one shared env: the flag form leaves the
production `service_id` textually reachable from a development command, whereas the env form means the dev
command's config **never names the production service**. That is priority #1 satisfied by construction, and it
is statically assertable.

`getRailsClient()` needs **no change** — `env.preview` supplies a binding, so branch 1 fires, exactly as in
production.

---

## 5. Production parity

**Identical** — Workers runtime (workerd), `compatibility_date` / `compatibility_flags`, OpenNext build output,
the `vpc_services` binding shape and its `remote: true`, `env.<BINDING>.fetch()` call path, the VPC-service →
tunnel → Rails hops, `RAILS_VPC_ORIGIN` (`http://core.app.localhost:3000`), `RAILS_FRAME_PREFIX`, the 5 s
timeout, header stripping, and the `getRailsClient()` resolution order.

**Different** — and this list is the honest cost:

| Aspect                                            | Development                                      | Production                                  |
| ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| Where the binding call originates                 | your machine, via the remote-binding proxy       | Cloudflare's edge                           |
| Extra network hops                                | machine → Cloudflare → tunnel; adds real latency | edge → tunnel                               |
| Auth for the binding itself                       | your OAuth/API token gates the proxy session     | none — the deployed Worker owns the binding |
| Colo / `placement.mode: smart`                    | not exercised                                    | exercised                                   |
| Rate limiting, `WORKER_SELF_REFERENCE`, ISR/cache | local simulation                                 | real                                        |
| Assets, custom domain, Access at the browser edge | absent                                           | present                                     |
| Rails                                             | local Podman container                           | AWS                                         |

Full parity is **not** achievable and should not be claimed. What this buys is the class of bug the Access
transport structurally cannot catch: a wrong `service_id`, a VPC service pointed at the wrong host/port, a
binding that does not exist, a tunnel that is down, and any workerd-vs-Node runtime difference in the request
path.

---

## 6. Environment separation

Separate, with the boundary enforced by tests:

| Item                      | Development                                | Production                         | Separated?                                |
| ------------------------- | ------------------------------------------ | ---------------------------------- | ----------------------------------------- |
| Tunnel + credentials      | dev tunnel (exists, Rails repo)            | prod tunnel                        | **yes**                                   |
| VPC Service               | new dev `service_id`                       | `019f5fe0-…`                       | **yes**                                   |
| Binding declaration       | `env.preview` only                         | `env.production` only              | **yes**, non-inheritable                  |
| Worker                    | never deployed                             | `umaxica-apps-edge-*-*-production` | **yes**                                   |
| Rails                     | local Podman                               | AWS                                | **yes**                                   |
| Secrets                   | none in repo; wrangler OAuth per developer | CI token                           | **yes**                                   |
| Cloudflare account / zone | **shared**                                 | shared                             | no — deliberate, not worth the admin cost |
| Public hostname           | none — dev stays `127.0.0.1`               | real                               | **yes**                                   |

**Retire the Access transport?** Not in this change. Keep branch 2 of `getRailsClient()` so a developer without a
Cloudflare credential still has a way to reach Rails — but **only once the Rails-side dev Access application
points at development Rails**. Hazard C above means that today, using it points development at _production_
Rails. Until that is fixed, `.env.development.local` must not be populated with the production origin. This is a
Rails/Cloudflare-dashboard action, flagged for the user, not something this repo can fix.

---

## 7. Podman

**No shared Podman network is needed for this plan.** The chain is
local workerd → Cloudflare → dev tunnel → dev Rails. The Edge container never resolves or dials the Rails
container.

The only place a shared network is legitimately required is
`cloudflared connector → Rails container` — and that connector lives in the **Rails** Compose project, so both
sides are already in the same project network there. Nothing changes in `compose.yaml` or
`.devcontainer/compose.override.yml`, and `test/compose-tunnel-invariants.test.ts` keeps passing untouched.

The separate "unified connector" idea in `docs/operations/cloudflare-tunnel-development.md:92-138` (exposing
_local Edge surfaces_ on real hostnames) is a different problem — browser → Edge, not Edge → Rails — and stays
out of scope.

---

## 8. Cloudflare Access

| Path                                          | Access needed?                                                                                                                                                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| browser → deployed Edge (production)          | **Yes** where a surface must be staff-only — this is Access's actual job. Unchanged.                                                                                                                                                                     |
| Edge → Rails over the VPC binding             | **No.** The trust boundary is the VPC Service plus the tunnel. Cloudflare's Workers VPC docs describe no Access application or service token in this path. Adding one would be redundant and would put a shared secret back into a design that has none. |
| Edge → Rails over the legacy Access transport | Yes — because that path is a _public_ hostname and Access is the only thing gating it. That is the fallback, not the target.                                                                                                                             |
| browser → local dev surfaces                  | No — they stay on `127.0.0.1`.                                                                                                                                                                                                                           |

So: Access belongs at the **browser → Edge** ingress. Workers VPC is the **Edge → private origin** egress. They
are not alternatives and neither substitutes for the other.

---

## 9. Development workflow

| Command            | Runtime                            | Bindings                    | Rails                                 | Cloudflare credential | Use for                                                      |
| ------------------ | ---------------------------------- | --------------------------- | ------------------------------------- | --------------------- | ------------------------------------------------------------ |
| `pnpm dev`         | Node (`next dev`)                  | local sim                   | `not-configured` (or Access fallback) | none                  | UI / component work, HMR                                     |
| `pnpm preview`     | local workerd, `--env development` | local sim                   | `not-configured`                      | none                  | catching workerd-vs-Node bugs without any Cloudflare account |
| `pnpm preview:vpc` | local workerd, `--env preview`     | **dev VPC, `remote: true`** | real dev Rails                        | **required**          | Cloudflare integration, before any deploy touching Rails     |
| `pnpm deploy`      | Cloudflare, `--env production`     | prod VPC                    | prod Rails                            | required              | production                                                   |

The default loop keeps ADR 005's best property: **`pnpm dev` and `pnpm preview` need no Cloudflare credential at
all.** Only the explicitly-named `:vpc` script does.

---

## 10. Test strategy

All static/local. **Nothing in CI touches a production Cloudflare resource.**

Extend `test/rails-connection-invariants.test.ts` (it already parses all 15 `wrangler.jsonc`):

1. Every frame's `env.preview.vpc_services` declares `UMAXICA_APPS_EDGE_CF_WORKERS_VPC` exactly once, with
   `remote: true`.
2. All 15 dev `service_id`s are identical to each other.
3. **`devServiceId !== prodServiceId`** — the single assertion that makes priority #1 mechanical.
4. `env.development` and `env.test` still declare no `vpc_services`; top level still declares none.
5. No `wrangler.jsonc` contains `RAILS_ORIGIN` or either token name (existing assertion, keep).

Extend `tools/check-workers.mjs` to enforce 1/3/4 from the parsed config, and **rewrite the incorrect comment
block at lines 154-160**.

Existing per-frame unit tests (`*/test/lib/rails-client.test.ts`) already cover: binding present → VPC transport;
partial Access config ignored; nothing configured → `null`; `unreachable` on timeout; `http-error` carries status
only. Add one case per frame — **fake `Fetcher` that rejects** (tunnel down) resolves to `unreachable`, distinct
from `not-configured` (binding absent) and from `http-error` 302→HTML (an Access login page on the fallback
path). That triple distinction is what a human currently has to eyeball.

**Not automated in CI:** actual reachability of the dev VPC Service. It needs a live tunnel and a personal
credential. Provide it as a documented manual gate instead —
`curl -s 127.0.0.1:5406/rails-health | jq .rails.kind` after `pnpm preview:vpc`, expecting `ok`. No Playwright:
the endpoints are JSON/SSR and Vitest plus that curl cover them.

---

## 11. Prerequisites the user must supply

- The **dev VPC Service does not exist yet** — only `019f5fe0-…` (production) does. Creating it is a Cloudflare
  dashboard/API action that cannot be done from this repository. Needed before any config edit lands:
  the dev `service_id`, and the dev `tunnel_id` it should bind to.
- Confirm the dev tunnel exposes development Rails at **`core.app.localhost:3000`**, i.e. the same host/port
  label the production VPC service uses. If it differs, `RAILS_VPC_ORIGIN` becomes environment-dependent and the
  cross-copy equality assertion in `rails-connection-invariants.test.ts` has to change shape.

---

## 12. Minimal implementation (no code written yet)

| File(s)                                                         | Change                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{app,com,org}/{core,docs,news,help,info}/wrangler.jsonc` (×15) | Add an `env.preview` block mirroring `env.development` (same vars, own ratelimit namespace) **plus** `vpc_services: [{ binding: "UMAXICA_APPS_EDGE_CF_WORKERS_VPC", service_id: "<DEV_ID>", remote: true }]`. Leave `env.development` / `env.test` / top level untouched. |
| same ×15 `package.json`                                         | Add `"preview:vpc": "opennextjs-cloudflare build --env preview && opennextjs-cloudflare preview --env preview"`. Leave `dev` / `preview` / `deploy` unchanged.                                                                                                            |
| root `package.json`                                             | Add a `preview:vpc` fan-out mirroring the existing `dev` filter list.                                                                                                                                                                                                     |
| `*/cloudflare-env.d.ts` (×15)                                   | Regenerate via `pnpm --filter <ws> run cf-typegen`; adds `'preview'` to the `CLOUDFLARE_ENV` union and a `Cloudflare.PreviewEnv`. Generated — do not hand-edit.                                                                                                           |
| `tools/workers-manifest.json`                                   | Add `"vpcPreviewEnv": "preview"` and record the dev `service_id` alongside the binding name.                                                                                                                                                                              |
| `tools/check-workers.mjs`                                       | Rewrite the `:154-160` comment (it currently asserts a falsehood); enforce binding present in `env.preview`, absent in `development`/`test`/top level, and dev `service_id` ≠ prod `service_id`.                                                                          |
| `test/rails-connection-invariants.test.ts`                      | Add assertions 1–4 from §10.                                                                                                                                                                                                                                              |
| `*/test/lib/rails-client.test.ts` (×15)                         | Add the rejecting-`Fetcher` → `unreachable` case.                                                                                                                                                                                                                         |
| `adr/006-development-workers-vpc-transport.md`                  | **New.** Amends ADR 005 §1: correct the runtime claim, record the three-tier workflow, the `env.preview` mechanism, and the dev/prod service split. Do not rewrite ADR 005 — amend it, as this repo does.                                                                 |
| `docs/operations/cloudflare-tunnel-development.md`              | Add a `preview:vpc` section and the token scopes (Workers Scripts: Edit + Connectivity: Read); correct line 167's implication that a VPC binding can never be used locally; note that "one connector" constrains connectors per tunnel, not the number of tunnels.        |

**Not changing:** any `src/lib/rails-client.ts`, any `src/lib/rails-health.ts`, `compose.yaml`,
`.devcontainer/*`, `.gitignore`, the four `*/apex` workers, and every `env.production` block.

## Verification

1. `pnpm run test` — new invariants pass; existing `compose-tunnel-invariants` untouched and green.
2. `node tools/check-workers.mjs` — reports OK for 19 workers.
3. `pnpm run typecheck` after `cf-typegen` regeneration.
4. `pnpm --filter app-core run preview` → `curl -s 127.0.0.1:5402/rails-health` → expect
   `kind: not-configured` (proves the credential-free tier still has no binding).
5. `wrangler login`, then `pnpm --filter app-docs run preview:vpc` →
   `curl -s 127.0.0.1:5406/rails-health | jq .rails.kind` → expect `ok`.
6. Stop the dev cloudflared connector, repeat step 5 → expect `unreachable`, **not** `not-configured`. This is the
   single check that proves the request really traversed the tunnel.

### Current state of verification

Steps 1–3 are **done and green**. Steps 4–6 have not been run — they need a
build and a local server. The connector has now been restarted, so they can be.

Use `app/docs` (port 5406), not a `core` frame: the content frames expose
`/rails-health` as a JSON Route Handler, while `core` renders HTML there, so
piping a `core` port through `jq` returns markup.

How to read the result:

| Result                                      | Meaning                                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `ok`                                        | Full chain worked: workerd → Cloudflare → VPC Service → tunnel → Rails                       |
| `unreachable`                               | Binding resolved, far end silent — connector down, or Rails not on `core.app.localhost:3000` |
| `not-configured`                            | Binding absent — wrong `--env`, or the config edit did not take                              |
| `http-error`                                | Rails answered non-2xx. Transport fine; Rails is not                                         |
| `remote session could not be authenticated` | Credential lacks `Workers Scripts: Edit`                                                     |

Step 6 is not optional. A green step 5 alone does not prove the network works —
only the `ok` → `unreachable` transition distinguishes a live tunnel from a
binding that was never exercised.
