@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Umaxica App (EDGE) — a multi-domain monorepo deploying Next.js SSR apps (via opennextjs-cloudflare) and Hono API services to Cloudflare Workers. Three domain families: umaxica.com (corporate), umaxica.app (service), umaxica.org (staff), plus a dev status dashboard on Vercel.

## Commands

All commands run from the repo root using **pnpm**.

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

Each domain has an **apex** backend (Hono on Workers) and **core** frontend (Next.js SSR on Workers), plus **docs**, **help**, and **news** sub-apps (Next.js):

| Apex (Hono) | Core (Next.js) | Docs       | Help       | News       | Domain               |
| ----------- | -------------- | ---------- | ---------- | ---------- | -------------------- |
| `app/apex`  | `app/core`     | `app/docs` | `app/help` | `app/news` | umaxica.app          |
| `com/apex`  | `com/core`     | `com/docs` | `com/help` | `com/news` | umaxica.com          |
| `org/apex`  | `org/core`     | `org/docs` | `org/help` | `org/news` | umaxica.org          |
| `net/apex`  | —              | —          | —          | —          | umaxica.net          |
| —           | `dev/core`     | —          | —          | —          | umaxica.dev (Vercel) |

### Dev Server Ports

| Workspace  | Port | Dev URL                      |
| ---------- | ---- | ---------------------------- |
| `app/apex` | 5401 | `app.localhost:5401`         |
| `com/apex` | 5101 | `com.localhost:5101`         |
| `org/apex` | 5301 | `org.localhost:5301`         |
| `net/apex` | 5201 | `net.localhost:5201`         |
| `app/core` | 5402 | `jp.app.localhost:5402`      |
| `com/core` | 5102 | `jp.com.localhost:5102`      |
| `org/core` | 5302 | `jp.org.localhost:5302`      |
| `dev/apex` | 5501 | `umaxica.dev:5501`           |
| `dev/core` | 5502 | `umaxica.dev:5502`           |
| `app/docs` | 5403 | `docs.jp.app.localhost:5403` |
| `app/help` | 5404 | `help.jp.app.localhost:5404` |
| `app/news` | 5405 | `news.jp.app.localhost:5405` |
| `com/docs` | 5103 | `docs.jp.com.localhost:5103` |
| `com/help` | 5104 | `help.jp.com.localhost:5104` |
| `com/news` | 5105 | `news.jp.com.localhost:5105` |
| `org/docs` | 5303 | `docs.jp.org.localhost:5303` |
| `org/help` | 5304 | `help.jp.org.localhost:5304` |
| `org/news` | 5305 | `news.jp.org.localhost:5305` |

### Frontend Pattern (Next.js on Cloudflare Workers)

- Next.js with App Router and SSR, deployed via **opennextjs-cloudflare**
- i18n via middleware-based locale routing (`middleware.ts`)
- `next.config.ts` with `allowedDevOrigins: ['localhost', '*.localhost']`
- `wrangler.jsonc` for Cloudflare Workers deployment config

### Backend Pattern (Hono apex)

- Hono v4 web framework on Cloudflare Workers
- Shared middleware and types via `shared/apex/` (e.g., `shared/apex/bindings.ts`)
- Vite dev server with `@cloudflare/vite-plugin`

### Key Dependencies

- **React 19** + Next.js 16
- **Hono v4** for API services
- **Vite** (via rolldown-vite) for apex builds
- **opennextjs-cloudflare** for Next.js on Workers
- **Wrangler v4** for Cloudflare deployment

## Testing

- **Vitest** with happy-dom environment, globals enabled
- Tests located in `<workspace>/test/` directories
- Setup file: `vitest.setup.ts` (imports @testing-library/jest-dom)
- Sentry is mocked via `app/core/__mocks__/@sentry/react-router.ts`
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
<<<<<<< HEAD
- **Running scripts:** Vite+ built-in commands (`vp dev`, `vp build`, `vp test`, etc.) always run the Vite+ built-in tool, not any `package.json` script of the same name. To run a custom script that shares a name with a built-in command, use `vp run <script>`. For example, if you have a custom `dev` script that runs multiple services concurrently, run it with `vp run dev`, not `vp dev` (which always starts Vite's dev server).
=======
- **Running scripts:** Vite+ commands take precedence over `package.json` scripts. If there is a `test` script defined in `scripts` that conflicts with the built-in `vp test` command, run it using `vp run test`.
>>>>>>> f779cd0 ([update] began to use Vite+.)
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

<<<<<<< HEAD
## CI Integration

For GitHub Actions, consider using [`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp) to replace separate `actions/setup-node`, package-manager setup, cache, and install steps with a single action.

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
- run: vp check
- run: vp test
```

=======
>>>>>>> f779cd0 ([update] began to use Vite+.)
## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
<<<<<<< HEAD
  <!--VITE PLUS END-->
  arted.
- [ ] Run `vp check` and `vp test` to validate changes.
=======
>>>>>>> f779cd0 ([update] began to use Vite+.)
<!--VITE PLUS END-->
