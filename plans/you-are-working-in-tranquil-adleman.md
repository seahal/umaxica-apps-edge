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
