![GitHub last commit (branch)](https://img.shields.io/github/last-commit/seahal/umaxica-apps-edge/main)

# Umaxica App (EDGE)

（ ＾ν＾） Hello, World!

A multi-domain monorepo of Next.js applications deployed to Cloudflare Workers
and Vercel, spanning three domain families: `umaxica.com` (corporate),
`umaxica.app` (service), and `umaxica.org` (staff).

## Prerequisites

- Node.js 24.x (`node:24-trixie`)
- [pnpm](https://pnpm.io/) 11.13.x
- Docker & Docker Compose (optional)

## Workspaces

| Package    | Role                | Domain             | Dev Port |
| ---------- | ------------------- | ------------------ | -------- |
| `com/apex` | Apex/static worker  | `umaxica.com`      | 5101     |
| `com/core` | Corporate app       | `umaxica.com`      | 5102     |
| `com/docs` | Corporate docs      | `docs.umaxica.com` | 5106     |
| `com/news` | Corporate news      | `news.umaxica.com` | 5107     |
| `com/help` | Corporate help      | `help.umaxica.com` | 5108     |
| `com/info` | Corporate info      | `info.umaxica.com` | 5109     |
| `net/apex` | Network apex worker | `umaxica.net`      | 5201     |
| `org/apex` | Apex/static worker  | `umaxica.org`      | 5301     |
| `org/core` | Staff app           | `umaxica.org`      | 5302     |
| `org/docs` | Staff docs          | `docs.umaxica.org` | 5306     |
| `org/news` | Staff news          | `news.umaxica.org` | 5307     |
| `org/help` | Staff help          | `help.umaxica.org` | 5308     |
| `org/info` | Staff info          | `info.umaxica.org` | 5309     |
| `app/apex` | Apex/static worker  | `umaxica.app`      | 5401     |
| `app/core` | Service app         | `umaxica.app`      | 5402     |
| `app/docs` | Service docs        | `docs.umaxica.app` | 5406     |
| `app/news` | Service news        | `news.umaxica.app` | 5407     |
| `app/help` | Service help        | `help.umaxica.app` | 5408     |
| `app/info` | Service info        | `info.umaxica.app` | 5409     |
| `dev/acme` | Development app     | `umaxica.dev`      | 5502     |

`{com,org,app}/apex` are lightweight Hono workers (root redirect, `/health`,
`/about`); `{com,org,app}/core` are the Next.js applications behind them at
regional subdomains. Cloudflare's custom domain for each apex root
(`umaxica.com` / `.org` / `.app`) must point at the `*-apex` Worker, not
`*-core` — reassigning production domain routing is a Cloudflare
dashboard/DNS change outside this repo and must be coordinated before
deploying `*/apex`.

## Quick Start

```bash
pnpm install

# Run a specific workspace
pnpm --filter <workspace> run dev   # e.g. com/core, app/core

# Docker (optional)
docker compose up && docker compose exec core bash
```

## Scripts

The toolchain is plain pnpm scripts backed by standalone Oxfmt, Oxlint, Vitest,
and tsgo — nothing wraps `next dev` / `next build`.

```bash
pnpm run format          # oxfmt .
pnpm run format:check    # oxfmt --check .
pnpm run lint            # oxlint --type-aware --fix .
pnpm run lint:check      # oxlint --type-aware .
pnpm run typecheck       # tsgo --noEmit, per app
pnpm run test            # vitest run
pnpm run test:cov        # vitest run --coverage
pnpm --filter <ws> run <script>
```

## Development Environment

### Toolchain

| Tool                                                            | Role                                 | Version   |
| --------------------------------------------------------------- | ------------------------------------ | --------- |
| [pnpm](https://pnpm.io/)                                        | Package manager & task orchestration | 11.13.x   |
| [Next.js](https://nextjs.org/)                                  | Framework, dev server, build         | 16.x      |
| [Oxfmt](https://oxc.rs/)                                        | Formatter (`pnpm run format`)        | 0.58.x    |
| [Oxlint](https://oxc.rs/)                                       | Linter (`pnpm run lint`)             | 1.73.x    |
| [tsgo](https://github.com/microsoft/typescript-go)              | Type checker (`pnpm run typecheck`)  | 7.0.0-dev |
| [Vitest](https://vitest.dev/)                                   | Test runner (`pnpm run test`)        | 4.1.x     |
| [Playwright](https://playwright.dev/)                           | Browser/E2E tests                    | 1.59.x    |
| [Lefthook](https://github.com/evilmartians/lefthook)            | Git hooks                            | 2.1.x     |
| [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | Cloudflare Workers CLI               | 4.x       |

### Docker / DevContainer

The development environment can be set up via Docker + VS Code DevContainer.

- **Base image**: `node:24-trixie` with pnpm (corepack) pre-installed
- **DevContainer**: configured in `.devcontainer/devcontainer.json`
  - Extensions: Claude Code, Oxc, Playwright
  - Disabled: ESLint, Prettier, GitLens, GitHub Copilot
  - Security: Trivy, Gitleaks (via pre-commit hooks)

```bash
# VS Code: use "Reopen in Container" for automatic setup

# Or start manually with Docker Compose
docker compose up && docker compose exec core bash
```

## Testing

- **Vitest** runs with the `happy-dom` environment and globals enabled.
- Tests live in each workspace's `test/` directory.
- Setup file: `vitest.setup.ts` (imports `@testing-library/jest-dom`).
- Testing libraries: `@testing-library/react`, `@testing-library/user-event`.

```bash
pnpm exec vitest run path/to/file.test.ts   # run a single test file
pnpm exec vitest run -t "test name"         # run tests matching a name
```

## TypeScript

Strict mode is enabled across the monorepo. Key compiler options:
`noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`.
Module resolution is `Bundler`.

> Do not modify the configurations for Oxlint, Oxfmt, tsgo, or Vitest without
> explicit user permission.

## Production Environment

| Platform                                              | Workspaces                | Domains                                     |
| ----------------------------------------------------- | ------------------------- | ------------------------------------------- |
| [Cloudflare Workers](https://workers.cloudflare.com/) | `com/*`, `app/*`, `org/*` | `umaxica.com`, `umaxica.app`, `umaxica.org` |
| [Vercel](https://vercel.com/)                         | `dev/*`                   | `umaxica.dev`                               |

### Deployment

```bash
pnpm --filter <workspace> run deploy           # direct deploy
pnpm --filter <workspace> run deploy:upload    # versioned: upload, then promote
pnpm --filter <workspace> run deploy:promote
```

Root-level shortcuts exist for the docs workspaces:

```bash
pnpm run deploy:app-docs:upload
pnpm run deploy:com-docs:upload
pnpm run deploy:org-docs:upload
```

Notes:

- Do not point Cloudflare at the removed `post` workspace. If Wrangler reports
  that CI expected a `*-post` Worker while the workspace config uses `*-docs`,
  the Cloudflare Workers Build is still connected to the removed `post` Worker —
  reconnect or recreate that build for the matching docs Worker before deploying.
- `npm --dir` is not a valid flag. If the platform requires npm, use
  `npm --prefix app/docs run deploy:upload` instead.

### Environment Variables

Cloudflare workspaces use `wrangler.jsonc` (`vars` + environments).

For local Docker Compose development, the workspace URL convention is:

```text
JIT_{COM,ORG,APP}_{CORE,DOCS,NEWS,INFO,HELP}_URL
```

Compose defaults map those names to the local dev ports for each workspace.
Use the same naming pattern in other workspaces when you need a self URL or a
cross-workspace link target.

## Surface Architecture

Core workspaces stay on Next.js. They own RP/BFF behavior, authenticated UI,
React Aria surfaces, logged-in state, and account, organization, and avatar
operations.

Public information workspaces (`docs`, `news`, `info`, and `help`) also use
Next.js and OpenNext on Cloudflare Workers. They are limited to public content,
read-only content APIs, SSG/SSR, and image optimization.

Rails Core/Base remains the source of truth for policy, mutation, authority,
and content JSON APIs. Public information surfaces may consume only public,
read-only Rails content APIs through the Cloudflare Workers private connectivity
boundary. They must not receive Acme refresh tokens, user-scoped secrets, or
authenticated Core session material.

## Review Checklist for Agents

- [ ] Run `pnpm install` after pulling remote changes and before getting started.
- [ ] Run `pnpm run format:check`, `pnpm run lint:check`, `pnpm run typecheck`,
      and `pnpm run test` to validate changes.

## Notes

- Secrets must stay in Rails credentials; do not commit plaintext secrets.
- WebAuthn origins are controlled by `TRUSTED_ORIGINS`.
- Public availability of this repository is not guaranteed permanently.
