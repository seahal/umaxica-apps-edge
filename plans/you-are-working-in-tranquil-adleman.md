# Core VPC Slice: app/core, com/core, org/core → Rails via Workers VPC

## Context

The three Next.js Core apps (`app/core`, `com/core`, `org/core`) run on Cloudflare Workers via OpenNext and need to reach their corresponding Rails Core surfaces (`core.app.localhost`, `core.com.localhost`, `core.org.localhost`) through a private Workers VPC Service, instead of a public Access-protected URL. Today only `app/core` has a Rails integration at all — a `rails-health` page that reads `process.env.RAILS_API_URL`, an undeclared, untyped env var with no `vpc_services` binding anywhere in the repo. This is the first Workers VPC integration slice; Docs/Help/News/Info stay untouched.

**Corrections to the original task brief, established during investigation (do not act on the stale premises):**
- Working tree is **clean** — `git status` shows nothing to commit. The described "uncommitted deletions under nine read-surface apps" do not currently exist. No destructive/restoring action is needed or will be taken regardless.
- `org/core`'s `@/i18n/*` imports are **not missing** — `src/i18n/config.ts` and `src/i18n/dictionaries.ts`/`.json` exist and resolve correctly via the `@/*` path alias. No fix needed there.
- The real Phase-2 blocker is structural, not a handful of type errors: **none of the three Core apps has a `typecheck` script**, and root `pnpm typecheck` explicitly excludes all three `*-core` packages by filter list. This must be fixed by adding scripts/filters, not by chasing phantom errors.
- `shared/cloudflare/image.ts` itself has no discovered type error; the one unsafe spot is a deliberately-suppressed `(env.IMAGES as any)` cast in each app's `src/app/api/image/route.ts`, already lint-suppressed. Leave as-is (out of scope — Phase 2 is about turning typecheck *on*, not fixing pre-existing suppressions).
- Local Cloudflare/wrangler session is **unauthenticated** (`wrangler whoami` fails, no `~/.wrangler` credentials). This blocks: inspecting the account for an existing VPC Service, creating one, generating a real `service_id`, and all live deployment/preview acceptance (Phases 3, 11, and the live parts of Phase 9/10). These will be reported as `BLOCKED EXTERNALLY` with the exact unblocking step (`wrangler login` / provide an API token), not faked.
- No `.dev.vars` files exist in any of the three Core apps (siblings like `app/docs` have `.dev.vars.example`; Core doesn't).

## Documentation findings (current, sourced)

- **`vpc_services` wrangler schema:** `{ binding, service_id, remote }` (remote defaults to `false`). Source: developers.cloudflare.com/workers-vpc/configuration/vpc-services/.
- **fetch() semantics:** `env.RAILS.fetch(absoluteUrl, init)` — Fetcher-style binding. Routing goes to the VPC Service's pre-registered target (tunnel + hostname `core` + port 3000); the absolute URL you pass controls the outgoing Host header/SNI, not the routing destination. This matches the task's "hostname passed to fetch() becomes the HTTP Host" contract.
- **`remote: true` / local dev:** plain `wrangler dev` cannot emulate a VPC Service at all. You need either `"remote": true` on the binding (Cloudflare remote-bindings proxying) or `wrangler dev --remote`. There is no fully-local fake. → Local dev behavior for Phase 7 will document this and use a **development-only, fail-closed fallback**, never shipped to production.
- **Creating a VPC Service:** `wrangler vpc service create <name> --type http --tunnel-id <ID> --hostname core` (port comes from the tunnel's ingress config, not a create flag we invent). Requires an authenticated session — currently blocked.
- **OpenNext binding access:** `import { getCloudflareContext } from "@opennextjs/cloudflare"`; sync `const { env } = getCloudflareContext()` for route handlers/server components (request time); `await getCloudflareContext({ async: true })` only needed for SSG. `app/core`'s existing `health/route.ts` already uses the sync form — reuse that pattern for the Rails client and rails-health page (server component, not SSG, so sync form is correct).
- Regenerate types via each app's existing `cf-typegen` script (`wrangler types --env-interface CloudflareEnv ./cloudflare-env.d.ts`).

## VPC Service (Phase 3)

**Confirmed with user:** exactly one shared VPC Service exists conceptually (tunnel → target hostname `core` → HTTP port 3000, account `umaxica-apps-edge`), but each app binds it under its own binding name rather than the brief's generic `RAILS`:

| App | Binding name |
| --- | --- |
| app/core | `VPC_SERVICE_APP_CORE` |
| com/core | `VPC_SERVICE_COM_CORE` |
| org/core | `VPC_SERVICE_ORG_CORE` |

The actual `service_id` UUID is still unknown (Cloudflare/wrangler is unauthenticated in this environment — see above). Per user direction, the binding stanza will be wired into all three `wrangler.jsonc` files now, with `service_id` set to a clearly-non-functional, obviously-a-placeholder marker (`"REPLACE_WITH_REAL_VPC_SERVICE_ID"`), called out loudly in the final report as the one manual step blocking a fully-live Gate 2/3. Type generation (Phase 5) will be attempted against this placeholder and any resulting types explicitly labeled "unverified against a real service." Once a human supplies the real ID (via `wrangler vpc service create umaxica-core-rails --type http --tunnel-id <TUNNEL_ID> --hostname core` or an existing one), it's a one-line swap per file.

## Implementation plan

### Phase 2 — Enable typecheck for Core (do first, it's the real gate)
- Add `"typecheck": "tsgo --noEmit"` to `app/core/package.json`, `com/core/package.json`, `org/core/package.json` (matching `app/docs`'s existing script).
- Add `--filter umaxica-apps-edge-app-core --filter umaxica-apps-edge-com-core --filter umaxica-apps-edge-org-core` to the root `typecheck` script in `/home/edge/workspace/package.json`.
- Run `pnpm run typecheck` scoped to these three, capture the **red** state first (expected: likely passes already since `next build`/tsc already type-checks them implicitly, but must be proven, not assumed).
- Do NOT touch the nine read-surface apps' filters or `shared/cloudflare/image.ts` unless typecheck actually fails there.

### Phase 4 — VPC binding
Add to each `wrangler.jsonc`, under both `env.development` and `env.production` (matching where `vars`/`services`/`ratelimits` already live per-env in these configs). Binding name is per-app (see Phase 3 table); example for `app/core`:
```jsonc
"vpc_services": [
  { "binding": "VPC_SERVICE_APP_CORE", "service_id": "REPLACE_WITH_REAL_VPC_SERVICE_ID", "remote": true }
]
```
(`com/core` → `VPC_SERVICE_COM_CORE`, `org/core` → `VPC_SERVICE_ORG_CORE`, same placeholder `service_id` in all three since it's one shared service.) `remote: true` per documented requirement (no local VPC emulation exists otherwise).

### Phase 5 — Regenerate types
Run each app's `cf-typegen` script. Verify `cloudflare-env.d.ts` gains a binding entry (`VPC_SERVICE_APP_CORE`, etc. — capture literal generated type name, don't assume it's `Fetcher`). Since `service_id` is a placeholder, label any resulting types "unverified against a real service" rather than claiming Gate 3 PASS outright.

### Phase 6 — Shared server-only Rails client
New file: `shared/cloudflare/rails-client.ts` (mirrors `shared/cloudflare/image.ts`'s existing pattern of a plain, framework-agnostic TS module reused via relative import — reuse over inventing a new per-app abstraction). Exports a factory:
```ts
createRailsClient(binding: Fetcher, hostname: 'core.app.localhost' | 'core.com.localhost' | 'core.org.localhost')
```
Each app passes its own binding (`env.VPC_SERVICE_APP_CORE`, `env.VPC_SERVICE_COM_CORE`, `env.VPC_SERVICE_ORG_CORE`) into the shared factory — the factory itself is binding-name-agnostic, only the caller wiring differs per app.
returning `{ fetch(path: string, init?) }` that:
- rejects absolute URLs / protocol-relative paths / `..` traversal, accepts only a leading-`/` relative path
- builds `https://<fixed-hostname><path>` (hostname is fixed per caller, not parameterizable by request data)
- calls `env.RAILS.fetch(url, { ...init, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(N) })`
- strips/never forwards `cookie`/`authorization`/`cf-access-*` headers even if present on `init`
- returns a typed result discriminating ok / http-error / network-error, mirroring the existing `RailsHealthResult` union style in `app/core`'s `rails-health.tsx`
- has `'server-only'` import at the top

Each app gets a thin wrapper (`app/core/src/lib/rails-client.ts` etc., or reuse `getJitWorkspaceUrl`-style per-app lib dir) that calls `createRailsClient(getCloudflareContext().env.VPC_SERVICE_APP_CORE, 'core.app.localhost')` (binding name and hostname both fixed per app) — this is the only place the literal hostname and binding are set, satisfying "callers cannot change the origin."

### Phase 8 — Tests first
`shared/test/rails-client.test.ts` (or per-app `test/` dirs per repo convention — confirm during implementation) using a fake `Fetcher`-shaped object (`{ fetch: vi.fn() }`) covering the 12 listed behaviors: fixed hostname per app, no override, relative-path joining, malformed-path rejection, timeout signal present, no cookie/auth forwarding, non-2xx handling, success handling, `cache: 'no-store'`. Write tests, run red, implement client, run green.

### Phase 7 — Migrate rails-health, extend to com/org
- `app/core/(page)/rails-health/rails-health.tsx`: replace `loadRailsHealthResult(process.env.RAILS_API_URL)` call path with the new VPC-backed client for the Cloudflare/production path. Determine dev fallback: since `wrangler dev` can't emulate VPC locally without `--remote`, keep a **development-only** direct-fetch fallback gated on `process.env.NODE_ENV === 'development'` (fails closed — returns `not-configured` in any other env), documented inline as temporary until `wrangler dev --remote` is the standard workflow.
- Add equivalent minimal `rails-health` route/page to `com/core` and `org/core`, reusing the existing `RailsHealthView`/result-union pattern (relocate the presentational pieces to `shared/` only if trivial; otherwise duplicate the thin page per existing per-app structure, consistent with how `health/route.ts` is already duplicated 3x).
- Response surface stays bounded (reachable/unreachable/status-class only) — already true of the existing union type.

### Phases 9–11 — Verification
- Typecheck/unit tests/OpenNext build/workerd preview: run for real, all three apps, capture actual output — no shortcutting to "should pass by analogy."
- `/health` transport check and root `/` surface check over live VPC: mark `BLOCKED EXTERNALLY` (no Cloudflare auth, no real service_id, no tunnel/Podman reachable from this environment) with the precise unblocking steps, rather than fabricating results.
- Final report follows the exact template in the task brief (sections 1–9, Gate 1–9 statuses, three-row matrix).

## Files to change
- `app/core/package.json`, `com/core/package.json`, `org/core/package.json` — add `typecheck` script
- `/home/edge/workspace/package.json` — extend root `typecheck` filter list
- `app/core/wrangler.jsonc`, `com/core/wrangler.jsonc`, `org/core/wrangler.jsonc` — add `vpc_services`
- `app/core/cloudflare-env.d.ts`, `com/core/cloudflare-env.d.ts`, `org/core/cloudflare-env.d.ts` — regenerated
- New: `shared/cloudflare/rails-client.ts`, its test file
- `app/core/src/app/(page)/rails-health/rails-health.tsx` (+ possibly `page.tsx`) — migrate to VPC client
- New: `com/core/src/app/(page)/rails-health/*`, `org/core/src/app/(page)/rails-health/*`
- Explicitly untouched: all `docs`/`help`/`news`/`info` paths, Rails repo (none exists here), lockfile/deps (no upgrades)

## Verification
- `pnpm --filter umaxica-apps-edge-app-core --filter umaxica-apps-edge-com-core --filter umaxica-apps-edge-org-core run typecheck`
- `pnpm exec vitest run` (new rails-client tests) — red then green
- `pnpm --filter <each> run build` (OpenNext) and `pnpm --filter <each> run preview` (workerd boot), hitting `/health` and `/rails-health`
- `git status` before and after — diff must touch only the files listed above
- Live VPC calls: attempt, else mark `BLOCKED EXTERNALLY` with the exact command a human needs to run (`wrangler login`, then `wrangler vpc service create ...`, then re-run this task)

## Post-implementation: stale deploy diagnosis (current sub-task)

**Context:** All work above landed in commits `c90a062` ("added cloudflare worker vpc settings") and `a4c16cc` (the `force-dynamic` fix for the SSG prerender bug found via the user's CI log — `getCloudflareContext()` sync form isn't valid during static generation, fixed by opting `/rails-health` out of prerendering on all three apps). Working tree is clean; both commits are confirmed present with the expected file sets (verified via `git show --stat`).

The user then deployed and reported:
- `app/core` `/rails-health` shows the **old** message "Rails API URL is not configured / Set RAILS_API_URL to point at the Rails container or host port" — this exact string only exists in the pre-VPC implementation (confirmed via `grep -rn RAILS_API_URL` across app/com/org `src/` returning zero matches in the current source tree). This proves the live app/core Worker is running a build from **before** this task's changes.
- `com/core` and `org/core` `/rails-health` return **404** — also consistent with a pre-task deploy, since those apps had no `rails-health` route at all before this slice.

**Diagnosis:** the deployment the user ran served a stale/cached build artifact (or ran before commit `c90a062`/`a4c16cc` were picked up), not the current source. This is not a defect in the current code — it's a deploy-freshness issue. Likely causes to check with the user: (a) `deploy:promote` (`wrangler versions deploy --yes`) was used, which promotes an already-uploaded version rather than building fresh; (b) the CI build cache (`Restoring from build output cache` seen in the earlier log) served a cached `.next`/`.open-next` output older than the fix; (c) the deploy ran against a commit older than `a4c16cc`.

**Next steps (to execute once out of plan mode):**
1. Ask the user how they trigger deploy (their CI vs. local `pnpm run deploy`) and whether it was run after commit `a4c16cc`.
2. Cannot verify or re-trigger deploy from this sandbox — Cloudflare/wrangler here is unauthenticated (confirmed earlier: `wrangler whoami` fails, no `~/.wrangler` credentials), so `pnpm run deploy` will fail locally the same way `pnpm run build` did before authentication. Any real deploy must run in the user's authenticated environment (their CI or an authenticated local machine).
3. Recommend the user force a clean rebuild (bypass build cache) and redeploy from HEAD (`a4c16cc`), for all three apps, then re-check `/rails-health` on each — expect: app/core shows the new bounded VPC-based view ("Rails health is reachable/unreachable/..." or "Rails VPC binding is not configured" if the placeholder-adjacent binding isn't resolving), com/core and org/core no longer 404 and show their own bounded views.
4. If still stale after a forced clean rebuild from HEAD, escalate to inspecting the CI pipeline's checkout ref / cache key rather than the application code, since the source is confirmed correct.

No code changes are anticipated for this sub-task — it is a deploy/cache verification, not an implementation fix.

**Update — redeploy confirmed fresh:** user re-checked and app/core's `/rails-health` now shows the new bounded view:
> Rails is unreachable / Request failed before a response arrived. / internal error; reference = 305ad952514e45edb4e5376add822397

This confirms:
- The stale-deploy theory was correct — a subsequent redeploy now serves the current code (`a4c16cc`). Gate 5 (OpenNext build/deploy) is now genuinely live and working for app/core.
- `checkRailsHealth` → `getRailsClient()` → `createRailsClient(...).fetch()` chain is executing for real against the live `VPC_SERVICE_APP_CORE` binding and reaching Cloudflare's edge (the "unreachable" branch with a Cloudflare-style `internal error; reference = <id>` message is the binding's `fetch()` throwing — this is a Cloudflare-side error surfaced through our `catch` block exactly as designed, not an app bug).
- This `internal error; reference = ...` string is characteristic of a Cloudflare Workers runtime-level failure (not an HTTP error from Rails itself, which would hit the `http-error` branch instead). Most likely causes, all external to this repo: the Tunnel isn't actually connected/routing to the `core` target yet, the Podman Rails container isn't up/listening on port 3000, or the VPC Service's tunnel/hostname/port wiring doesn't yet match reality. None of these are fixable from application code.

**Still open:** whether com/core and org/core also now show their own bounded views (no update from the user on those yet) — worth confirming.

**Recommended next step:** treat this as Gate 6/7 = `BLOCKED EXTERNALLY`, evidenced by a real "unreachable" result with a Cloudflare reference ID (rather than "unauthenticated, couldn't even try"), and point the user at checking the Cloudflare Tunnel connector status / Podman container health for the `core` target — that reference ID is the thing to hand to Cloudflare dashboard logs or `cloudflared tunnel` diagnostics if they want to dig further. No repo-side action indicated.

**Update — confirmed by user:** all three apps (app/com/org) now show bounded results (not 404) — deploy is fresh everywhere. However, the user clarified the real root cause of the "unreachable" result: the Rails health path this repo targets (`/edge/v0/health`) **no longer exists** on the Rails side. The correct current path is `/health/liveness.json` (confirmed reachable by the user at `https://side-jp.umaxica.app/health/liveness.json` as a public-endpoint sanity check). The user explicitly confirmed: only the **path** needs to change — the private VPC target hostname per app (`core.app.localhost` / `core.com.localhost` / `core.org.localhost`) stays exactly as designed; nothing about the VPC/binding/hostname architecture changes.

## Fix: update Rails health check path

**Single change point:** `shared/cloudflare/rails-health.ts` has one constant:
```ts
const RAILS_HEALTH_PATH = '/edge/v0/health';
```
Change to:
```ts
const RAILS_HEALTH_PATH = '/health/liveness.json';
```
This is the only place the health path is defined — all three apps' `rails-health/page.tsx` call `checkRailsHealth(getRailsClient())`, which internally calls `client.fetch(RAILS_HEALTH_PATH)`. No other file references `/edge/v0/health` (confirmed via grep — the only remaining occurrence after this task's earlier migration is this one constant; the old `RAILS_API_URL`-based implementation that also used this path was already fully replaced).

No test currently asserts the literal path value (`rails-health.test.ts` uses a fake `RailsClient` and never inspects what path `checkRailsHealth` passes to `client.fetch`), so this is a safe one-line change with no red/green cycle needed for the constant itself — existing tests continue to pass unchanged. Will re-run the full test suite and typecheck after the edit to confirm.

**Out of scope / unchanged:** VPC binding names, `service_id`, `remote: true`, per-app hostnames, wrangler.jsonc, rails-client.ts core logic — none of this needs to change.
