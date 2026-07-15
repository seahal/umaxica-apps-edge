# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Umaxica App (EDGE) — a multi-domain monorepo mixing Next.js applications (Cloudflare Workers/Vercel) with lightweight Hono `*/apex` workers (Cloudflare Workers). Three domain families: umaxica.com (corporate), umaxica.app (service), and umaxica.org (staff), plus umaxica.net (network support, `net/apex`).

## Commands

All commands run from the repo root using **pnpm** scripts and standalone tool binaries.

| Task                       | Command                                     |
| -------------------------- | ------------------------------------------- |
| Install deps               | `pnpm install`                              |
| Format                     | `pnpm run format`                           |
| Lint                       | `pnpm run lint:check`                       |
| Type check                 | `pnpm run typecheck`                        |
| Run all tests              | `pnpm run test`                             |
| Run single test file       | `pnpm exec vitest run path/to/file.test.ts` |
| Run tests matching name    | `pnpm exec vitest run -t "test name"`       |
| CF type generation         | `pnpm --filter <workspace> run cf-typegen`  |
| Dev server (per workspace) | `pnpm --filter <workspace> run dev`         |
| Deploy (per workspace)     | `pnpm --filter <workspace> run deploy`      |

## Architecture

### Workspace Layout

Most workspaces are Next.js applications; `*/apex` are Hono workers:

| Workspace  | Domain           | Dev Port | Framework      |
| ---------- | ---------------- | -------- | -------------- |
| `app/apex` | umaxica.app      | 5401     | Hono           |
| `app/core` | umaxica.app      | 5402     | Next.js        |
| `app/docs` | docs.umaxica.app | 5406     | Next.js        |
| `app/news` | news.umaxica.app | 5407     | Next.js        |
| `app/help` | help.umaxica.app | 5408     | Next.js        |
| `app/info` | info.umaxica.app | 5409     | Next.js        |
| `com/apex` | umaxica.com      | 5101     | Hono           |
| `com/core` | umaxica.com      | 5102     | Next.js        |
| `com/docs` | docs.umaxica.com | 5106     | Next.js        |
| `com/news` | news.umaxica.com | 5107     | Next.js        |
| `com/help` | help.umaxica.com | 5108     | Next.js        |
| `com/info` | info.umaxica.com | 5109     | Next.js        |
| `net/apex` | umaxica.net      | 5201     | Hono           |
| `org/apex` | umaxica.org      | 5301     | Hono           |
| `org/core` | umaxica.org      | 5302     | Next.js        |
| `org/docs` | docs.umaxica.org | 5306     | Next.js        |
| `org/news` | news.umaxica.org | 5307     | Next.js        |
| `org/help` | help.umaxica.org | 5308     | Next.js        |
| `org/info` | info.umaxica.org | 5309     | Next.js        |
| `dev/acme` | umaxica.dev      | 5502     | Vercel/edge fn |

`app/apex`, `com/apex`, `org/apex`, and `net/apex` own the apex/root domain
(redirect to a regional `*/core` subdomain, `/health`, `/about`); the
corresponding `*/core` Next.js app serves the actual regional subdomain, not
the root. They intentionally share the same top-level domain — do not treat
that as a collision to resolve.

There is no `shared/` directory. Each frame (workspace) owns its own copy of
its components, types, hooks, and utilities — including code that looks
identical across frames (e.g. `createApexApp`, health page, security headers,
rate limiting, and CSRF middleware in each `*/apex`, or `rails-client`/
`rails-health`/`image-config` in each `*/core`). Do not reintroduce a shared
module, a `common/`/`core/`/`base/` directory, or a re-export layer to
de-duplicate this code — duplication across frames is intentional so that one
frame's requirement changes never force a change in another frame. oxlint's
`no-restricted-imports` rule (`.oxlintrc.json`) enforces this by rejecting
`shared/` imports and direct frame-to-frame imports.

### Service Pattern

- Next.js on Cloudflare Workers via OpenNext, plus Vercel for `dev/acme`, for `*/core` and content workspaces (`docs`/`news`/`help`/`info`)
- Hono v4 directly on Cloudflare Workers (no bundler/build step beyond `wrangler`) for `*/apex`
- pnpm scripts drive local dev, builds, tests, linting, and formatting; each tool (Next.js, Hono/Wrangler, Oxlint, Oxfmt, Vitest, tsgo) is invoked directly — no `vp`/Vite+ wrapper anywhere in this repo

### Key Dependencies

- **Next.js** for `*/core` and content workspaces (no Vite build step)
- **Hono v4** for `*/apex` workers
- **Zod v4** for validation
- **Wrangler v4** for Cloudflare deployment

## Testing

- **Vitest** with happy-dom environment, globals enabled
- Tests located in `<workspace>/test/` directories
- Setup file: `vitest.setup.ts` (imports @testing-library/jest-dom)
- Testing libraries: @testing-library/react, @testing-library/user-event

## Tooling

- **Linter**: oxlint (not ESLint) — config in `.oxlintrc.json`
- **Formatter**: oxfmt (not Prettier/Biome)
- **Type checker**: tsgo (not tsc)
- **Pre-commit hooks**: Lefthook runs format, lint, typecheck, audit, secret-scan (gitleaks), and tests in parallel

> **IMPORTANT**: Do not modify the configurations for oxlint, oxfmt, tsgo, or vitest without explicit user permission.

## TypeScript

Strict mode enabled. Key compiler options: `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. Module resolution is `Bundler`.

## Toolchain Notes

- Use pnpm directly (`pnpm install`, `pnpm add`, `pnpm --filter <ws> run <script>`) — there is no wrapper CLI.
- Import test utilities from `vitest` (e.g. `import { describe, expect, it, vi } from 'vitest';`), and Vitest config from `vitest/config`.
- Oxlint config lives in `.oxlintrc.json`, Oxfmt config in `.oxfmtrc.json` at the repo root.
- Type-aware linting works via `oxlint-tsgolint`, invoked automatically by `oxlint --type-aware`.

## Review Checklist for Agents

- [ ] Run `pnpm install` after pulling remote changes and before getting started.
- [ ] Run `pnpm run format:check`, `pnpm run lint:check`, `pnpm run typecheck`, and `pnpm run test` to validate changes.
