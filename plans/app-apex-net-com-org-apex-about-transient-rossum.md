# Restore `dev/apex` (Hono on Vercel) from `umaxica-apps-edge-apex` reference repo

## Context

`umaxica.dev` currently has only `dev/acme` (the Next.js core app on Vercel) — there is no apex-layer
worker handling `/`, `/health`, `/about` for the bare `umaxica.dev` domain, unlike `app/apex`, `com/apex`,
`org/apex`, `net/apex` which cover their respective domains on Cloudflare Workers.

A `dev/apex` workspace existed before (see `adr/002-dev-apex-vercel.md`) but was intentionally deleted
after being built, because at the time it was judged unnecessary. The user now wants it back, and has
pointed at `github.com/seahal/umaxica-apps-edge-apex` — a separate reference repo — which contains a
working, tested implementation of exactly this: a Hono app deployed as a Vercel Edge Function under its
top-level `dev/` directory (`dev/package.json` name: `umaxica-apps-edge-apex-dev`).

That reference implementation is more complete than what ADR 002's "Outcome" describes (it never removed
`vercel.json`, uses the `hono/vercel` adapter via `api/index.ts`, and ships passing tests) and matches the
routing/health/about conventions already used across this monorepo's other `*/apex` workers (title
builder, bilingual `/about`, `/health` + `/health.html` + `/health.json`). We'll port it into this repo at
`dev/apex/`, adapting only what's needed to match local conventions (tsgo, vitest globals instead of
`vite-plus/test`, workspace naming).

## Source material (already fetched from the reference repo, `main` branch)

- `dev/package.json` — deps: `hono` only; scripts were `tsc --noEmit`-based (will adapt to `tsgo`)
- `dev/vercel.json` — rewrites `/(.*)` → `/api/index`
- `dev/tsconfig.json` — standalone tsconfig (target/module ESNext, strict, `include: ["src/**/*", "api/**/*"]`)
- `dev/api/index.ts` — `export const runtime = 'edge'; export const GET = handle(app);` via `hono/vercel`
- `dev/src/app.ts` — Hono app: `/health`, `/health.html`, `/health.json`, `/about` (bilingual, links to
  umaxica.app/com/org), `/` (301 redirect to `DEV_CORE_URL` env or `https://www.umaxica.dev/`)
- `dev/test/app.test.ts`, `dev/test/index.test.ts`, `dev/test/global.d.ts` — full test coverage of the
  above, currently written against `vite-plus/test`

## Plan

### 1. Create `dev/apex/` workspace

Port the four source files, adapted to this repo's conventions:

- `dev/apex/package.json` — name `umaxica-apps-edge-apex-dev`, private, `type: module`. Scripts:
  `dev` (e.g. `vercel dev --listen 5501` or plain `tsgo --noEmit --watch`, no build step needed for Vercel
  auto-detection), `typecheck: tsgo --noEmit`, `deploy: vercel deploy --prod` (matching `dev/acme`'s
  pattern). Dependencies: `hono: catalog:`. No devDependencies beyond what the catalog already provides
  (`@types/node: catalog:`, `typescript` comes from root).
- `dev/apex/vercel.json` — same rewrite rule as source.
- `dev/apex/tsconfig.json` — same shape, aligned with other workspace tsconfigs (strict flags already
  match root `noUncheckedIndexedAccess`/`noImplicitOverride`/`noFallthroughCasesInSwitch`).
- `dev/apex/api/index.ts` — verbatim (imports `../src/app.js`, `hono/vercel`).
- `dev/apex/src/app.ts` — verbatim logic (title builder, `detectLanguage`, `buildPageShell`,
  `buildHealthPayload`/`buildHealthPageHtml`, routes for `/health`, `/health.html`, `/health.json`,
  `/about`, `/`).
- `dev/apex/.gitignore` — `.vercel`, `.env*.local`.

### 2. Adapt tests to local conventions

Per CLAUDE.md, this repo uses Vitest directly (globals enabled, happy-dom) — not `vite-plus/test`. Port
`dev/test/app.test.ts` and `dev/test/index.test.ts` into `dev/apex/test/`, dropping the
`vite-plus/test` import (rely on Vitest globals like `app/apex`'s existing tests do), and drop
`dev/test/global.d.ts` (not needed — no Cloudflare `Env` binding here since this runs on Vercel, not
Workers).

### 3. Register the new workspace

- `pnpm-workspace.yaml`: add `dev/apex` to `packages:` (alongside `dev/acme`).
- Root `package.json`: add `--filter umaxica-apps-edge-apex-dev` to the `typecheck` script's filter list.

### 4. Verification

- `pnpm install` (registers the new workspace)
- `pnpm --filter umaxica-apps-edge-apex-dev run typecheck`
- `pnpm exec vitest run dev/apex` (confirm ported tests pass under this repo's Vitest/happy-dom setup)
- `pnpm run lint:check` / `pnpm run format:check` over the new files
- Manual sanity check: `pnpm --filter umaxica-apps-edge-apex-dev exec vercel dev` (or just eyeball
  `app.fetch` responses in a quick script) to confirm `/`, `/about`, `/health`, `/health.json` behave as
  expected before deploying.

## Out of scope

- Actually deploying to Vercel / wiring the `umaxica.dev` domain to this new function (that's a Vercel
  dashboard / `vercel link` step, not a code change).
- Re-adding `RAILS_API_URL` health-proxy behavior mentioned in ADR 002 — the reference repo's `/health`
  reports its own status only, and we're porting that as-is.
