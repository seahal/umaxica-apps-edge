# Plan: Fifteen-App Cloudflare/OpenNext Readiness Audit (audit only — no fixes)

## Context

The user requested a documentation-driven audit of fifteen expected Next.js apps
(info/core/help/news/docs × app/com/org) covering: Cloudflare Workers/OpenNext deployment
readiness, Workers VPC readiness toward a Rails private origin (12 read surfaces with
`{info,help,news,docs}.{app,com,org}.localhost` Host contract), drift analysis, and an ordered
remediation plan. **No implementation, no upgrades, no config rewrites.** The deliverable is the
16-section report defined in the request.

User decisions (confirmed): audit the **working tree as-is**; report the three info apps as
**NOT CREATED**.

## Ground truth already established (read-only reconnaissance, complete)

- pnpm 10.29.3 + Vite+ (`vp`); 13 workspaces in `pnpm-workspace.yaml` (no info apps; `app/info`,
  `com/info`, `org/info` are empty untracked dirs). Catalog pins: next 16.2.6, react 19.2.6,
  @opennextjs/cloudflare ^1.19.11, wrangler ^4.93.0 (root devDep wrangler ^4.110.0 — drift).
- **Working tree is mid-refactor**: all 9 docs/help/news apps have `next.config.ts`,
  `open-next.config.ts`, `wrangler.jsonc`, `src/**` **deleted (uncommitted)**; only
  `package.json` + `.dev.vars.example` remain. A stash "backup before restoring develop from
  accidental main merge" exists. These 9 apps are currently NOT buildable/deployable.
- 3 core apps intact and nearly identical: OpenNext adapter scripts, wrangler.jsonc
  (`main: .open-next/worker.js`, compat date 2026-05-13, `nodejs_compat` +
  `global_fetch_strictly_public`, ASSETS/IMAGES/REVISION/self-service/ratelimit bindings,
  env.development/production blocks), Sentry, Playwright, custom image loader,
  `initOpenNextCloudflareForDev()`.
- dev/acme is an intentional Vercel app (16th surface; report it, don't Cloudflare-audit it).
- **Zero VPC config anywhere** (`vpc_services`/`service_id` absent). Rails access today:
  `app/core/src/app/(page)/rails-health/` fetches `process.env.RAILS_API_URL` + `/edge/v0/health`
  with 2s AbortSignal timeout. No middleware, no `runtime='edge'`, no server actions, no
  next-on-pages/Pages legacy anywhere.
- CI (`.github/workflows/integration.yaml`, Node 24): audit/outdated/knip/gitleaks/oxfmt/oxlint/
  typecheck/test:cov + a `build-vite` matrix referencing **nonexistent targets** (app/apex,
  com/apex, net/apex, org/apex, dev/status). No OpenNext build or workerd preview in CI. No
  deploy job. No lefthook.yml despite CLAUDE.md claiming pre-commit hooks. `.open-next` NOT
  gitignored (stale-output deploy risk). Root `type` script filters exclude the core apps.

## Execution plan (requires exiting plan mode — builds/installs write to disk)

### Step 1 — Documentation evidence (WebFetch, primary sources only)
Fetch and note exact titles/sections for version-sensitive conclusions against the installed
stack (Next 16.2.6 / React 19.2.6 / @opennextjs/cloudflare 1.19.x / Wrangler 4.x):
1. nextjs.org — Next 16 docs: supported versions, Node requirement, caching semantics
   (fetch/revalidate/ISR/dynamic APIs), middleware→proxy rename status, images, upgrade guide
   from 16.2 to current.
2. developers.cloudflare.com — "Next.js on Workers" guide (adapter, build/preview/deploy
   commands, wrangler requirements); Workers Node.js compatibility (`nodejs_compat`, compat-date
   behavior, v2); Workers Assets; **Workers VPC / VPC Services** (`vpc_services` wrangler schema,
   binding `.fetch()` semantics, absolute-URL/Host behavior, local-dev story); Workers limits.
3. opennext.js.org — Cloudflare adapter: supported Next versions (does 1.19.x support Next 16?),
   required wrangler config (`main`, assets, `nodejs_compat`, minimum compatibility_date),
   `open-next.config.ts`, caching (incremental/tag/R2), image optimization, unsupported features.
4. Spot-check github.com/opennextjs releases for the installed 1.19.11 vs current.

### Step 2 — Static audit matrices (read-only; mostly done, fill gaps)
- Read git HEAD versions of one deleted docs/help/news config family (`git show HEAD:app/docs/wrangler.jsonc` etc.) to document what the 9 gutted apps *had* — needed for drift analysis and remediation plan — while judging working-tree state as NOT DEPLOYABLE.
- Read the 9 `.dev.vars.example` files (names only) + core `env` vars for the environment/secret
  inventory (Phase 13). Check for `NEXT_PUBLIC_*` misuse and the Rails hostname contract
  (search for `*.{app,com,org}.localhost` — expected absent).
- Core-specific pass (Phase 10): read `{app,com,org}/core/src` for auth/session/OIDC/cookie
  logic (shared/cookie*, consentState), caching of any personalized routes, health/api/image
  route handlers; confirm no BFF/OIDC exists yet or document what does.
- Cache/ISR pass (Phase 11): grep cores for `revalidate`, `revalidateTag`, `force-dynamic`,
  `unstable_cache`, `"use cache"`; note `defineCloudflareConfig({})` means **no incremental/tag
  cache configured** — judge against docs whether that's adequate for these apps.
- Runtime-compat pass (Phase 8): grep app source + `shared/` for `node:` imports, fs writes,
  sockets, module-scope I/O clients; classify each hit by call path (runtime/build/test-only).
  Sentry (`@sentry/nextjs` 10.x) on Workers needs a doc check.

### Step 3 — Executable verification (Phase 15; smallest sufficient command set)
Run from repo root with pnpm/vp only, no --force, no lockfile mutation:
1. `pnpm install --frozen-lockfile` (validate reproducibility).
2. `vp run type` (note: script excludes cores — run cores' `type` via filters too, and record the
   gap as a finding). `vp lint` (check mode), `vp test run`.
3. Per intact Cloudflare app (app/core, com/core, org/core):
   `vp run --filter <ws> build` (OpenNext build). If build succeeds, attempt non-interactive
   workerd smoke: `opennextjs-cloudflare preview` backgrounded + `curl /health`, or
   `wrangler dev --local` equivalent per the docs from Step 1; kill after probe.
4. Attempt one gutted app's build (e.g. app/docs) to record the exact failure class
   (expected: SOURCE FAILURE — configs deleted).
5. dev/acme: `next build` only (Vercel target).
Classify every failure per the mandated taxonomy. No deploys, no secrets, no compat-date changes.

### Step 4 — Write the final report
Produce exactly the 16 required sections, including:
- 15-row readiness matrix (info×3 = NOT CREATED/UNKNOWN; docs/help/news×9 = judged on working
  tree = BROKEN/mid-refactor with HEAD context noted; core×3 = judged on build+preview evidence).
- 12-row VPC readiness table with expected Rails Hosts (`docs.app.localhost` etc.) — expected
  outcome: all `CLIENT LAYER MISSING` + no `vpc_services` bindings; core's `RAILS_API_URL`
  pattern documented as the only existing Rails client.
- Drift quantification (catalog vs pinned-version families, wrangler ^4.93 vs ^4.110, @types/node
  25 vs 26, CI ghost targets, missing lefthook vs CLAUDE.md claims, `.open-next` gitignore gap).
- Ordered remediation slices with acceptance gates (restore-or-rebuild decision for the 9 gutted
  apps first, then normalization, then VPC bindings), explicitly keeping Core separate from the
  read surfaces.
Deliver the report as the final message (and optionally as a markdown file via SendUserFile).

## Verification of the audit itself
- Every version-sensitive claim cites a fetched primary doc (title + section).
- Matrix rows = exactly 15; failures carry the mandated classification labels.
- No file outside scratchpad/plans modified; git status unchanged except untracked build outputs
  from sanctioned builds (`.next`, `.open-next` — noted, not committed).
