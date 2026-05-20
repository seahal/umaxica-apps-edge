# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Umaxica App (EDGE) — a multi-domain monorepo deploying React Router v7 SSR apps and Hono API services to Cloudflare Workers. Three domain families: umaxica.com (corporate), umaxica.app (service), umaxica.org (staff), plus a dev status dashboard on Vercel.

## Commands

All commands run from the repo root using **pnpm** (not Bun — the README references Bun but the project has migrated to pnpm).

| Task                       | Command                                     |
| -------------------------- | ------------------------------------------- |
| Install deps               | `pnpm install`                              |
| Format                     | `pnpm run format` (oxfmt)                   |
| Lint                       | `pnpm run lint` (oxlint)                    |
| Type check                 | `pnpm run type` (tsgo)                      |
| Run all tests              | `pnpm test` (vitest)                        |
| Run single test file       | `pnpm exec vitest run path/to/file.test.ts` |
| Run tests matching name    | `pnpm exec vitest run -t "test name"`       |
| CF type generation         | `pnpm run cf-typegen`                       |
| Dev server (per workspace) | `pnpm run --filter <workspace> server`      |
| Deploy (per workspace)     | `pnpm run --filter <workspace> deploy`      |

## Architecture

### Workspace Layout

Each domain has a **backend** (Hono on Workers) and **frontend** (React Router v7 SSR on Workers):

| Backend | Frontend      | Domain               | Dev Port |
| ------- | ------------- | -------------------- | -------- |
| `app/`  | `app_www/`    | umaxica.app          | 5171     |
| `com/`  | `com_www/`    | umaxica.com          | 5170     |
| `org/`  | `org_www/`    | umaxica.org          | 5172     |
| —       | `dev_status/` | umaxica.dev (Vercel) | 5173     |
| —       | `net/`        | Network renderer     | —        |

### Frontend Pattern (app_www, com_www, org_www)

- Entry: `workers/app.ts` — creates a request handler from React Router, generates a CSP nonce per request, passes Cloudflare env/ctx via `RouterContextProvider`
- React Router v7 with file-based routing and SSR
- i18next for internationalization (remix-i18next for SSR)
- Sentry integration for error tracking
- Three tsconfig files per workspace: `tsconfig.json`, `tsconfig.node.json`, `tsconfig.cloudflare.json`

### Backend Pattern (app, com, org)

- Hono v4 web framework on Cloudflare Workers
- Ports 8780-8782 for local dev

### Key Dependencies

- **React 19** + React Router v7 + React Aria Components
- **Hono v4** for API services
- **Vite** (via rolldown-vite) for builds
- **Zod v4** for validation
- **Wrangler v4** for Cloudflare deployment

## Testing

- **Vitest** with happy-dom environment, globals enabled
- Tests located in `<workspace>/test/` directories
- Setup file: `vitest.setup.ts` (imports @testing-library/jest-dom)
- Sentry is mocked via `app_www/__mocks__/@sentry/react-router.ts`
- Testing libraries: @testing-library/react, @testing-library/user-event

## Tooling

- **Linter**: oxlint (not ESLint) — config in `.oxlintrc.json`
- **Formatter**: oxfmt (not Prettier/Biome)
- **Type checker**: tsgo (not tsc)
- **Pre-commit hooks**: Lefthook runs format, lint, typecheck, audit, secret-scan (gitleaks), and tests in parallel

> **IMPORTANT**: Do not modify the configurations for oxlint, oxfmt, tsgo, or vitest without explicit user permission.

## TypeScript

Strict mode enabled. Key compiler options: `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. Module resolution is `Bundler`. Path aliases `@app/*`, `@com/*`, `@org/*` map to respective `<workspace>/src/*`.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ commands take precedence over `package.json` scripts. If there is a `test` script defined in `scripts` that conflicts with the built-in `vp test` command, run it using `vp run test`.
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
<!--VITE PLUS END-->
