<<<<<<< HEAD
# Umaxica App (EDGE)

Multi-domain monorepo deploying Next.js SSR apps (via opennextjs-cloudflare) and Hono API services to Cloudflare Workers.

## Commands

Run from repo root using `pnpm`:

| Task                       | Command                                     |
| -------------------------- | ------------------------------------------- |
| Install deps               | `pnpm install`                              |
| Format                     | `pnpm run format`                           |
| Lint                       | `pnpm run lint`                             |
| Type check                 | `pnpm run type`                             |
| Run all tests              | `pnpm test`                                 |
| Run single test file       | `pnpm exec vitest run path/to/file.test.ts` |
| Run tests by name          | `pnpm exec vitest run -t "test name"`       |
| Dev server (per workspace) | `pnpm run --filter <workspace> server`      |
| Deploy (per workspace)     | `pnpm run --filter <workspace> deploy`      |

> Do not modify configs for oxlint, oxfmt, tsgo, or vitest without explicit user permission.

## Architecture

Each domain has workspaces: `<domain>/apex` (Hono backend), `<domain>/core` (Next.js frontend), plus `<domain>/docs`, `<domain>/help`, and `<domain>/news` (Next.js sub-apps):

| Apex (Hono) | Core       | Docs       | Help       | News       | Domain               |
| ----------- | ---------- | ---------- | ---------- | ---------- | -------------------- |
| `app/apex`  | `app/core` | `app/docs` | `app/help` | `app/news` | umaxica.app          |
| `com/apex`  | `com/core` | `com/docs` | `com/help` | `com/news` | umaxica.com          |
| `org/apex`  | `org/core` | `org/docs` | `org/help` | `org/news` | umaxica.org          |
| `net/apex`  | —          | —          | —          | —          | umaxica.net          |
| —           | `dev/core` | —          | —          | —          | umaxica.dev (Vercel) |

**Apex backends** (`*/apex`): Hono apps built via direct route composition (see `app/apex/src/app.tsx` for reference). They wire up common middleware (CSRF, rate limiting, security headers, language detection, ETags) and shared route factories from `shared/apex/`.

**Next.js frontends** (`*/core`, `*/docs`, `*/help`, `*/news`): Next.js with App Router and SSR, deployed to Cloudflare Workers via **opennextjs-cloudflare**. i18n handled by middleware-based locale routing (`middleware.ts`).

**Shared code** lives in `shared/apex/` (common Hono middleware and utilities) and `shared/cloudflare/` (Cloudflare-specific helpers like secrets store).

## Key Conventions

- **tsconfig**: TypeScript strict mode with `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`.
- **Path aliases**: `@app/*` → `app/core/src/*`, `@com/*` → `com/core/src/*`, `@org/*` → `org/core/src/*`.
- **Sentry mock**: `app/core/__mocks__/@sentry/react-router.ts` stubs Sentry for tests. Use the alias in `vitest.config.ts` to resolve it.
- **Inline lint suppression**: Use `// oxlint-disable-next-line <rule>` (not eslint-disable).
- **Tests**: Located in `<workspace>/test/` directories or inline as `*.test.ts` files. Vitest globals are enabled; no need to import `describe`/`it`/`expect`.

## Design Principles

- **Single Responsibility**: Keep modules, components, and functions focused on one job.
- **Open/Closed**: Extend behavior with composition or new modules instead of piling branching logic into existing code.
- **Liskov Substitution**: Preserve contracts so replacements behave the same way as the original abstraction.
- **Interface Segregation**: Prefer small, focused interfaces over broad ones with unused members.
- **Dependency Inversion**: Depend on abstractions and shared boundaries, not concrete implementation details.
- **Practicality**: Apply SOLID where it improves clarity and changeability; avoid over-engineering tiny, stable code paths.

=======
>>>>>>> f779cd0 ([update] began to use Vite+.)
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
<!--VITE PLUS END-->
