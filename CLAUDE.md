# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Umaxica App (EDGE) — a multi-domain monorepo for Next.js applications deployed to Cloudflare Workers and Vercel. Three domain families: umaxica.com (corporate), umaxica.app (service), and umaxica.org (staff).

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

The active workspaces are Next.js applications:

| Workspace  | Domain           | Dev Port |
| ---------- | ---------------- | -------- |
| `app/core` | umaxica.app      | 5402     |
| `app/docs` | docs.umaxica.app | 5406     |
| `app/news` | news.umaxica.app | 5407     |
| `app/help` | help.umaxica.app | 5408     |
| `com/core` | umaxica.com      | 5102     |
| `com/docs` | docs.umaxica.com | 5106     |
| `com/news` | news.umaxica.com | 5107     |
| `com/help` | help.umaxica.com | 5108     |
| `org/core` | umaxica.org      | 5302     |
| `org/docs` | docs.umaxica.org | 5306     |
| `org/news` | news.umaxica.org | 5307     |
| `org/help` | help.umaxica.org | 5308     |
| `dev/acme` | umaxica.dev      | 5502     |

### Service Pattern

- Next.js on Cloudflare Workers via OpenNext, plus Vercel for `dev/acme`
- pnpm scripts drive local dev, builds, tests, linting, and formatting; each tool (Next.js, Oxlint, Oxfmt, Vitest, tsgo) is invoked directly

### Key Dependencies

- **Next.js** for application implementation and builds (no Vite build step)
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
