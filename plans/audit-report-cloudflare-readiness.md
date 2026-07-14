# Umaxica EDGE — Fifteen-Application Cloudflare/OpenNext Readiness Audit
Date: 2026-07-14 · Branch: `develop` · Audit subject: **working tree as-is** (user-confirmed) · Info apps treated as **NOT CREATED** (user-confirmed)

## 1. Executive Verdict

**The repository is not currently ready to operate fifteen Next.js applications on Cloudflare Workers.** Only the three Core apps are deployable today. Nine read-surface apps (docs/help/news × app/com/org) are gutted by *uncommitted working-tree deletions* — their `next.config.ts`, `open-next.config.ts`, `wrangler.jsonc`, and all source were deleted (git HEAD still has them; a stash "backup before restoring develop from accidental main merge" exists). The three Info apps have never been created (empty untracked directories, absent from `pnpm-workspace.yaml`). **No application has any Workers VPC configuration** — the Rails private-origin integration is entirely future work.

Counts: **READY: 0 · MINOR: 3** (core.app/com/org — READY WITH MINOR CLEANUP) · **UPGRADE REQUIRED: 0 · BROKEN/ARCHITECTURAL: 12** (9 gutted + 3 not created) · **UNKNOWN: 0**.

The good news: the stack that exists is *current*, not stale. Next 16.2.6 (latest is 16.2.10), React 19.2.6, @opennextjs/cloudflare 1.19.11 (latest 1.20.1), Wrangler 4.x, compatibility_date 2026-05-13, `nodejs_compat` everywhere, zero `next-on-pages`/Pages legacy, zero `runtime='edge'`. This is a mid-refactor accident, not decade-drift.

## 2. Repository Topology

- **Package manager**: pnpm 10.29.3 (`packageManager` field); custom registry `npm.flatt.tech`, `engine-strict`, `ignore-scripts=true`. Lockfile `pnpm-lock.yaml` — `pnpm install --frozen-lockfile` passes.
- **Toolchain**: Vite+ (`vp`) wraps everything; tsgo (`@typescript/native-preview`) for types; oxlint/oxfmt via `vite.config.ts` (no `.oxlintrc.json` despite CLAUDE.md claiming one); Vitest (happy-dom, 100% coverage thresholds) at root.
- **Workspaces (13)**: `{app,com,org}/{core,docs,help,news}` + `dev/acme`. **No info workspaces**; `app/info`, `com/info`, `org/info` exist as empty untracked dirs. Versions pinned via **pnpm catalog** (next 16.2.6, react 19.2.6, @opennextjs/cloudflare ^1.19.11, wrangler ^4.93.0) — but the 9 docs/help/news apps pin versions **directly instead of via catalog** (drift vector), and root devDeps pin wrangler **^4.110.0** vs catalog **^4.93.0**.
- **Shared code**: `shared/` (cookie-consent utilities, `shared/cloudflare/image.ts`); `net/` is empty.
- **CI**: single `.github/workflows/integration.yaml` (Node 24): audit, outdated, knip, gitleaks, oxfmt, oxlint, typecheck, test:cov, plus a `build-vite` matrix referencing **five nonexistent targets** (`app/apex`, `com/apex`, `net/apex`, `org/apex`, `dev/status`). **CI contains no OpenNext build, no workerd preview, and no deploy job.** Deployment ownership is manual per-app scripts (`opennextjs-cloudflare deploy` / `upload` + `wrangler versions deploy`).
- **No lefthook.yml** exists, contradicting CLAUDE.md's pre-commit claims. **`.open-next` is NOT in `.gitignore`** (only `.next`/`out` are) — contradicts OpenNext guidance and permits stale-output accidents.
- `dev/acme` is an intentional **Vercel** app (Sentry + @vercel/otel, `vercel deploy --prod`) — reported, not Cloudflare-audited.

## 3. Official Documentation Findings

- **OpenNext "Get Started" (opennext.js.org/cloudflare/get-started)** — requires Wrangler ≥ 3.99, `main: .open-next/worker.js`, compatibility_date ≥ 2024-09-23, flags `nodejs_compat` + `global_fetch_strictly_public`, assets binding `ASSETS` at `.open-next/assets`, `open-next.config.ts` with `defineCloudflareConfig()`, `.open-next` gitignored, no `runtime='edge'`, no `next-on-pages`. → The three Core apps (and HEAD versions of the nine read apps) satisfy every runtime requirement; the repo violates only the `.gitignore` recommendation.
- **OpenNext supported versions (opennext.js.org/cloudflare)** — "All minor and patch versions of Next.js 16 … are supported"; only Node Middleware (15.2+) is unsupported; Worker size 3 MiB free / 10 MiB paid (compressed). → Next 16.2.6 is squarely supported; no app uses Node middleware (no middleware at all).
- **opennextjs-cloudflare releases (GitHub)** — installed 1.19.11 (2026-05-19); latest 1.20.1 (2026-06-26, skew-protection fix). Next 16 support landed in 1.19.x. → adapter is current-minus-one-minor; no migration boundary.
- **Cloudflare "Next.js on Workers" framework guide (developers.cloudflare.com)** — confirms `@opennextjs/cloudflare` as the recommended path and the build/preview/deploy script contract used verbatim by every app here.
- **Workers Node.js compatibility (developers.cloudflare.com/workers/runtime-apis/nodejs)** — `nodejs_compat` needs date ≥ 2024-09-23; fs/net supported, tls partial, child_process/worker_threads are non-functional stubs. → Source grep found **zero `node:` imports** in app code; no risk patterns.
- **Workers VPC (developers.cloudflare.com/workers-vpc)** — beta; configured via `vpc_services: [{binding, service_id, remote: true}]`; accessed via the binding's `fetch()` with an absolute URL. → The repo contains **zero** `vpc_services`/`service_id` occurrences.
- **Next.js releases (nextjs.org / endoflife.date)** — Next 16.2.10 LTS is the sole supported line (16.2.6 installed = patch-level behind); a security release is expected 2026-07-20.

## 4. Fifteen-Application Readiness Matrix

Working-tree judgment. "HEAD ✓" = config existed at git HEAD and matched the current OpenNext contract.

| Application | Next.js | React | OpenNext | Wrangler | Compat date | nodejs_compat | OpenNext build | workerd preview | Deploy config | VPC readiness | Cache readiness | Test readiness | Overall |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| info.app | — | — | — | — | — | — | — | — | none | none | — | — | **BROKEN** (not created) |
| info.com | — | — | — | — | — | — | — | — | none | none | — | — | **BROKEN** (not created) |
| info.org | — | — | — | — | — | — | — | — | none | none | — | — | **BROKEN** (not created) |
| core.app | 16.2.6 | 19.2.6 | 1.19.11 | ^4.93 | 2026-05-13 | ✓ | **PASS** | **PASS (200 / & /health)** | ✓ | n/a (Core) | static-only OK | vitest+playwright, no workerd test | **READY WITH MINOR CLEANUP** |
| core.com | 16.2.6 | 19.2.6 | 1.19.11 | ^4.93 | 2026-05-13 | ✓ | **PASS** | not run (identical config) | ✓ | n/a (Core) | static-only OK | same | **READY WITH MINOR CLEANUP** |
| core.org | 16.2.6 | 19.2.6 | 1.19.11 | ^4.93 | 2026-05-13 | ✓ | **PASS** | not run | ✓ | n/a (Core) | static-only OK | same + **typecheck FAIL** (`@/i18n/*` missing) | **READY WITH MINOR CLEANUP** |
| help.app | pkg.json only | " | " | " | HEAD: 2026-05-13 ✓ | HEAD ✓ | **FAIL** (configs deleted) | — | deleted | CLIENT LAYER MISSING | unknown | none | **BROKEN** (uncommitted deletions) |
| help.com | " | " | " | " | " | " | " | — | deleted | " | " | none | **BROKEN** |
| help.org | " | " | " | " | " | " | " | — | deleted | " | " | none | **BROKEN** |
| news.app | " | " | " | " | " | " | " | — | deleted | " | " | none | **BROKEN** |
| news.com | " | " | " | " | " | " | " | — | deleted | " | " | none | **BROKEN** |
| news.org | " | " | " | " | " | " | " | — | deleted | " | " | none | **BROKEN** |
| docs.app | ^16.2.6 | ^19.2.6 | ^1.19.11 | ^4.93 | HEAD: 2026-05-13 ✓ | HEAD ✓ | **FAIL**: `No open-next.config.ts` (SOURCE FAILURE) | — | deleted | CLIENT LAYER MISSING | unknown | none | **BROKEN** |
| docs.com | " | " | " | " | " | " | (same class) | — | deleted | " | " | none | **BROKEN** |
| docs.org | " | " | " | " | " | " | (same class) | — | deleted | " | " | none | **BROKEN** |

(16th surface: `dev/acme`, Vercel-target, `next build` PASS — out of Cloudflare scope, not silently ignored.)

## 5. Version and Configuration Drift

Quantified: **1** Next.js version family (16.2.6), **1** OpenNext version, **1** compatibility date (2026-05-13), **1** wrangler.jsonc shape (core ≡ HEAD read-apps minus IMAGES-loader/Sentry) — the apps are **several coherent families, not fifteen drifting apps**. Real drift:
1. **Catalog bypass**: 9 read apps pin `next ^16.2.6` etc. directly; cores use `catalog:` (2 version-source mechanisms).
2. **Wrangler range split**: root `^4.110.0` vs catalog `^4.93.0`.
3. `@types/node`: root ^26.1.1 vs catalog ^25.7.0 vs read-apps ^25.9.1 (3 ranges).
4. **Script-set drift**: cores have `start`; read apps have `deploy:promote`+`build:next` variants; root `type` filter **excludes all three cores** (their typecheck never runs in `vp run type` / CI).
5. CI ghost targets (5 nonexistent matrix entries) + CI builds via `vite` not OpenNext.
6. Tooling claims vs reality: no lefthook.yml, no .oxlintrc.json (CLAUDE.md stale).
7. `.open-next` not gitignored.

## 6. Next.js Architecture Findings

All apps: **App Router only, `src/` layout, Server Components default**; no Pages Router, no middleware/proxy file, no server actions, no `runtime='edge'`, no custom server, no MDX, no `output` setting. Cores add: route handlers (`/health`, `/api/image` proxy with `ALLOWED_IMAGE_HOSTS` validation), i18n dictionaries (app/core has `src/i18n`; **org/core imports `@/i18n/*` which does not exist on disk → typecheck failure**), custom image loader (`images.loader: 'custom'` → `src/image-loader.ts`), `experimental.globalNotFound` + `authInterrupts`, `typedRoutes`, styled-components compiler, Sentry (`withSentryConfig`, tunnelRoute `/monitoring`) — webpack-based Sentry options while Next 16 defaults to Turbopack: worth verifying in the upgrade slice. `rails-health` page (app/core only) is the sole Rails consumer. HEAD read-app `next.config.ts` was an empty config + `initOpenNextCloudflareForDev()` — nothing scrutiny-worthy. No removed/renamed Next options detected.

## 7. Cloudflare/OpenNext Findings

- Adapter uniformly `@opennextjs/cloudflare` 1.19.11; **zero legacy `next-on-pages`/Pages artifacts**.
- wrangler.jsonc (cores, and HEAD read apps): meets every current documented requirement — `main: .open-next/worker.js`, assets `ASSETS`/`.open-next/assets`, `nodejs_compat` + `global_fetch_strictly_public`, compat date 2026-05-13 (≫ 2024-09-23 floor), IMAGES binding matching the custom loader, version_metadata, self-reference service binding, smart placement, ratelimit bindings. Classification: **CURRENT** (cores) / **NOT CONFIGURED** (12 others, working tree).
- Scripts: `dev` runs Next under Node.js; `preview` = `opennextjs-cloudflare build && preview` (true workerd path); `deploy`/`deploy:upload` rebuild before deploying — **stale-output deploy is not possible via scripts**, but a manual `wrangler deploy` could ship stale `.open-next` since it's not gitignored.
- Gaps: no routes/custom domains in wrangler (production `NEXT_PUBLIC_APP_URL` claims `https://umaxica.app` etc. — domain attachment must live outside the repo → deployment reproducibility UNKNOWN); observability `enabled: false` at top level; CI never exercises OpenNext or workerd.

## 8. Workers VPC Readiness

**No `vpc_services` binding, no `service_id`, no `*.{app,com,org}.localhost` Rails hostname, and no Rails client abstraction exists anywhere in the repo.** Generated `cloudflare-env.d.ts` types predate any VPC binding. The only Rails fetch in the codebase is core.app's `rails-health` page using public-style `process.env.RAILS_API_URL` (good hygiene: server component, `AbortSignal.timeout(2000)`, no credential forwarding — a reasonable template for the future VPC client). No browser-side private fetches exist (nothing exists at all).

| Application | Expected Rails Host | VPC binding ready | Server-side fetch ready | Public-origin dependency | Boundary violation | Status |
|---|---|---|---|---|---|---|
| info.app | `info.app.localhost` | no | no | no | no | UNKNOWN (app not created) |
| info.com | `info.com.localhost` | no | no | no | no | UNKNOWN (app not created) |
| info.org | `info.org.localhost` | no | no | no | no | UNKNOWN (app not created) |
| help.app | `help.app.localhost` | no | no | no | no | CLIENT LAYER MISSING |
| help.com | `help.com.localhost` | no | no | no | no | CLIENT LAYER MISSING |
| help.org | `help.org.localhost` | no | no | no | no | CLIENT LAYER MISSING |
| news.app | `news.app.localhost` | no | no | no | no | CLIENT LAYER MISSING |
| news.com | `news.com.localhost` | no | no | no | no | CLIENT LAYER MISSING |
| news.org | `news.org.localhost` | no | no | no | no | CLIENT LAYER MISSING |
| docs.app | `docs.app.localhost` | no | no | no | no | CLIENT LAYER MISSING |
| docs.com | `docs.com.localhost` | no | no | no | no | CLIENT LAYER MISSING |
| docs.org | `docs.org.localhost` | no | no | no | no | CLIENT LAYER MISSING |

(Also structurally blocked for the nine existing rows until their app source is restored.)

## 9. Core-Specific Findings

core.app / core.com / core.org are near-identical **today** and contain **no OIDC/RP, no session, no BFF, no cookie-auth logic yet** — only a client-side cookie-consent banner (shared/), health + image-proxy route handlers, and (app only) the rails-health probe. `experimental.authInterrupts` and `server-only`/`client-only` deps signal *intended* auth work. Implications:
- Nothing currently caches authenticated content (nothing is authenticated); health routes correctly send `no-store`.
- The moment OIDC/session lands, Core must NOT adopt any read-surface incremental/tag-cache baseline; keep Core's OpenNext cache config explicitly separate.
- core.org's missing `@/i18n` module is a real defect (typecheck SOURCE FAILURE) that `next build` tolerated only because org/core's build ran without failing on it — verify whether the notifications page is dead code or broken at runtime.
- Rate limiter bindings exist but no code consumes `RATE_LIMITER` yet.

## 10. Cache and ISR Findings

Zero use of `revalidate`, `revalidateTag`, `revalidatePath`, `unstable_cache`, `"use cache"`, `force-static/dynamic`, or cached fetch anywhere. `open-next.config.ts` = `defineCloudflareConfig({})` → **no incremental cache, no tag cache, no R2** — which is *correct* for the current all-static/dynamic-on-demand content. Classification: all existing apps = **Static assets only / No persistent Next cache required**. The intended Rails-backed read surfaces will force a decision (ISR + incremental/tag cache vs. per-request fetch) — decide when the Rails client lands, not before. R2 is not recommended today.

## 11. Runtime Compatibility Risks

Grep + call-path review found **no `node:` imports, no fs/socket/child_process usage, no module-scope I/O clients, no dynamic require, no native addons** in app or shared code. Only findings: (a) `@sentry/nextjs` 10.51 — runs in the Worker bundle; its Cloudflare support should be verified against Sentry/OpenNext docs during the upgrade slice (com/org cores even carry `sentry.edge.config.ts`); (b) the image proxy route fetches arbitrary allowed hosts — under `global_fetch_strictly_public` (already set) private-IP fetch is blocked, good. No blockers.

## 12. Environment and Secret Contract

No secret values found committed (gitleaks also runs in CI). Inventory:
- **Public build-time** (`NEXT_PUBLIC_*`, wrangler vars): `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN` (empty string placeholder — should be set or removed).
- **Public runtime vars** (wrangler): `CLOUDFLARE_ENV`, `NODE_ENV`, `BRAND_NAME`.
- **Server-only runtime**: `RAILS_API_URL` (read in app/core source but **absent from every wrangler `vars` block** — deploy-time gap), `ALLOWED_IMAGE_HOSTS` (same gap), `SENTRY_DSN`.
- **Bindings**: ASSETS, IMAGES, REVISION, WORKER_SELF_REFERENCE, RATE_LIMITER (no KV/R2/D1/DO/VPC).
- **Obsolete/odd**: `.dev.vars.example` files in the 9 read apps contain only `NEXTJS_ENV=development` — misnamed relic (OpenNext expects `NEXTJS_ENV` for env-file selection, fine, but no other vars are modeled); `VERCEL_GIT_*` only in dev/acme (fine).
- No private hostnames exposed via `NEXT_PUBLIC_*`; no Access tokens anywhere; future VPC `service_id`s are IDs, not secrets — keep them in wrangler config.

## 13. Verification Evidence

| Check | Command | Result |
|---|---|---|
| Frozen install | `pnpm install --frozen-lockfile` | **PASS** |
| Typecheck | `vp run type` | **FAIL — 4 tasks** (SOURCE FAILURE: `shared/cloudflare/image.ts` TS18048 ×5; `org/core` `@/i18n/*` TS2307 ×4). Note: filter list omits cores from routine runs |
| Lint | `vp lint` | PASS (no findings) |
| Unit tests | `vp test run` | **PASS — 18 files, 112 tests** |
| OpenNext build core.app | `vp run --filter …app-core build` | **PASS** (`Worker saved in .open-next/worker.js`) |
| OpenNext build core.com / core.org | same pattern | **PASS / PASS** |
| **workerd preview** core.app | `wrangler dev --env development` + fetch | **PASS — HTTP 200 on `/` and `/health`** (actual workerd, not `next start`) |
| OpenNext build docs.app | `opennextjs-cloudflare build` | **FAIL — SOURCE FAILURE**: "No `open-next.config.ts` file was found" (deleted in working tree) |
| Next build dev/acme | `next build` | PASS (Vercel target) |
| Actual deployed Cloudflare evidence | — | **none available in this environment** (no account access attempted) |

## 14. Prioritized Remediation Plan (do not execute now)

**Slice 0 — Resolve the working-tree incident (blocking everything).** Scope: 9 read apps + stash. Decide: restore from HEAD/stash or commit the deletion as an intentional reset. Files: all `D`-status paths. Red: `opennextjs-cloudflare build` fails in all 9. Gate: `git status` clean by decision; if restored, all 9 OpenNext builds pass. Rollback: stash + HEAD retained.

**Slice 1 — Fix typecheck reality.** Scope: `shared/cloudflare/image.ts` TS18048s, org/core `@/i18n`, add cores to the root `type` filter. Gate: `vp run type` green across all workspaces incl. cores. Rollback: per-file.

**Slice 2 — Workspace hygiene.** Add `.open-next` (and `.wrangler`) to `.gitignore`; move the 9 read apps' framework deps onto `catalog:`; reconcile wrangler `^4.93` vs `^4.110` and `@types/node` ranges; delete CI ghost matrix targets; fix or delete CLAUDE.md's lefthook/oxlintrc claims. Gate: `pnpm install --frozen-lockfile` + CI green; single version source per dependency family.

**Slice 3 — Patch-level currency (canary: docs.app).** Next 16.2.6→16.2.10 (security release lands ~2026-07-20 — schedule after it), OpenNext 1.19.11→1.20.x, one app first. Gate: OpenNext build + workerd preview 200 + Playwright smoke on canary; then roll to family, cores last. No major boundaries are crossed (16→16, 1.19→1.20).

**Slice 4 — CI production-runtime gate.** Add an OpenNext-build + `wrangler dev` smoke job per family (the missing "does it run under workerd" test). Red: job doesn't exist. Gate: CI proves workerd boot for every deployable app.

**Slice 5 — Recreate/scaffold Info apps** from the read-surface baseline (docs family template), add to workspace + CI. Gate: three new apps pass the Slice-4 gate.

**Slice 6 — VPC bindings (read surfaces only).** Add `vpc_services: [{binding: e.g. RAILS, service_id, remote: true}]` per app per environment; regenerate `cloudflare-env.d.ts`; model `RAILS_API_URL`/host contract (`docs.app.localhost` etc.) in wrangler vars. Gate: `wrangler types` includes the binding; preview boots; no client code yet. Core is **excluded** until its auth architecture is decided.

**Slice 7 — Rails VPC client layer.** Server-only module patterned on `rails-health.tsx` (absolute URL on the private host, timeout, status handling, no credential forwarding); then per-family caching decision (ISR/tag cache) — separate decision for Core. Gate: read surface renders Rails content under workerd preview against a stubbed/real binding.

Ordering answers: normalize tooling **before** framework bumps (Slices 1–2 first); OpenNext/Wrangler move **with** Next in the same patch slice (no major boundary); do **not** upgrade all fifteen in one change — family-by-family with docs.app as canary; Info/Help/News/Docs **should** share a Cloudflare/OpenNext baseline; Core keeps explicit deltas (Sentry, image loader, i18n, future auth/cache); VPC bindings after apps exist and pass workerd gates (Slice 6), client code last (Slice 7).

## 15. Release Blockers

1. Nine read apps have no configs/source in the working tree (uncommitted deletions) — nothing to deploy.
2. Three Info apps do not exist.
3. `RAILS_API_URL` / `ALLOWED_IMAGE_HOSTS` read in code but defined in no wrangler `vars` — cores deploy with dead features.
4. No VPC Service bindings anywhere — Rails private-origin integration impossible as configured.
5. Typecheck failures (shared image util, org/core i18n) and cores excluded from the `type` script — quality gate is blind exactly where deployable code lives.
6. No CI evidence of OpenNext/workerd — deploys are unverified-by-machine.

## 16. Non-Blockers / Deferred Improvements

Patch bumps (Next 16.2.10, OpenNext 1.20.1, wrangler range unification); `.open-next` gitignore; CI ghost matrix targets; empty `NEXT_PUBLIC_SENTRY_DSN` placeholders; observability `enabled:false` top-level toggle; CLAUDE.md stale tooling claims (lefthook/.oxlintrc); `.dev.vars.example` files that model only `NEXTJS_ENV`; unused `RATE_LIMITER` binding; empty `net/` directory; Sentry-webpack-vs-Turbopack option verification.
