![GitHub last commit (branch)](https://img.shields.io/github/last-commit/seahal/umaxica-apps-edge/main)

# Umaxica App (EDGE)

（ ＾ν＾） Hello, World!

## Prerequisites

- Node.js 24.x (`node:24-trixie`)
- [pnpm](https://pnpm.io/) 10.29+
- Docker & Docker Compose (optional)

## Workspaces

This table describes the target workspace matrix. `info` rows are planned
public information surfaces and may not exist until the Astro migration slice
adds them.

| Package    | Role            | Domain             | Dev Port |
| ---------- | --------------- | ------------------ | -------- |
| `com/core` | Corporate app   | `umaxica.com`      | 5102     |
| `com/docs` | Corporate docs  | `docs.umaxica.com` | 5106     |
| `com/news` | Corporate news  | `news.umaxica.com` | 5107     |
| `com/info` | Corporate info  | `info.umaxica.com` | 5109     |
| `com/help` | Corporate help  | `help.umaxica.com` | 5108     |
| `org/core` | Staff app       | `umaxica.org`      | 5302     |
| `org/docs` | Staff docs      | `docs.umaxica.org` | 5306     |
| `org/news` | Staff news      | `news.umaxica.org` | 5307     |
| `org/info` | Staff info      | `info.umaxica.org` | 5309     |
| `org/help` | Staff help      | `help.umaxica.org` | 5308     |
| `app/core` | Service app     | `umaxica.app`      | 5402     |
| `app/docs` | Service docs    | `docs.umaxica.app` | 5406     |
| `app/news` | Service news    | `news.umaxica.app` | 5407     |
| `app/info` | Service info    | `info.umaxica.app` | 5409     |
| `app/help` | Service help    | `help.umaxica.app` | 5408     |
| `dev/acme` | Development app | `umaxica.dev`      | 5502     |

## Quick Start

```bash
pnpm install

# Run a specific workspace
pnpm --filter <workspace> run dev   # e.g. com/core, app/core

# Docker (optional)
docker compose up && docker compose exec core bash
```

## Scripts

Toolchain is plain pnpm scripts backed by standalone Oxfmt, Oxlint, Vitest, and tsgo.

```bash
pnpm run format            # oxfmt .
pnpm run format:check      # oxfmt --check .
pnpm run lint               # oxlint --type-aware --fix .
pnpm run lint:check         # oxlint --type-aware .
pnpm run typecheck           # tsgo --noEmit, per app
pnpm run test                # vitest run
pnpm run test:cov            # vitest run --coverage
pnpm --filter <ws> run <script>
```

## Development Environment

### Toolchain

| Tool                                                            | Role                                 | Version   |
| --------------------------------------------------------------- | ------------------------------------ | --------- |
| [pnpm](https://pnpm.io/)                                        | Package manager & task orchestration | 10.29.x   |
| [Next.js](https://nextjs.org/)                                  | Framework, dev server, build         | 16.x      |
| [Oxfmt](https://oxc.rs/)                                        | Formatter (`pnpm run format`)        | 0.58.x    |
| [Oxlint](https://oxc.rs/)                                       | Linter (`pnpm run lint`)             | 1.73.x    |
| [tsgo](https://github.com/microsoft/typescript-go)              | Type checker (`pnpm run typecheck`)  | 7.0.0-dev |
| [Vitest](https://vitest.dev/)                                   | Test runner (`pnpm run test`)        | 4.1.x     |
| [Playwright](https://playwright.dev/)                           | Browser/E2E tests                    | 1.59.x    |
| [Lefthook](https://github.com/evilmartians/lefthook)            | Git hooks                            | 2.1.x     |
| [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | Cloudflare Workers CLI               | 4.x       |

Each tool is installed and invoked directly; nothing wraps `next dev`/`next build`.

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

## Production Environment

| Platform                                              | Workspaces                | Domains                                     |
| ----------------------------------------------------- | ------------------------- | ------------------------------------------- |
| [Cloudflare Workers](https://workers.cloudflare.com/) | `com/*`, `app/*`, `org/*` | `umaxica.com`, `umaxica.app`, `umaxica.org` |
| [Vercel](https://vercel.com/)                         | `dev/*`                   | `umaxica.dev`                               |

### Deployment

```bash
pnpm --filter <workspace> run deploy            # direct deploy
pnpm --filter <workspace> run deploy:upload      # versioned: upload then promote
pnpm --filter <workspace> run deploy:promote
```

Cloudflare deploy commands should use the pnpm workspace filter, for example:

```bash
pnpm run deploy:app-docs:upload
pnpm run deploy:com-docs:upload
pnpm run deploy:org-docs:upload
```

Cloudflare project deploy commands for docs should point at the docs workspace:

```bash
pnpm --dir app/docs run deploy:upload
pnpm --dir com/docs run deploy:upload
pnpm --dir org/docs run deploy:upload
```

Do not point Cloudflare at the removed `post` workspace. Do not use `npm --dir`;
npm does not support that flag. If npm must be used by the platform, use
`npm --prefix app/docs run deploy:upload`.

If Wrangler reports that the CI system expected a `*-post` Worker while the
workspace config uses `*-docs`, the Cloudflare Workers Build is still connected
to the removed `post` Worker. Reconnect or recreate that Cloudflare build for
the matching docs Worker before deploying.

### Environment Variables

Cloudflare workspaces use `wrangler.jsonc` (`vars` + environments).

For local Docker Compose development, the workspace URL convention is:

```text
JIT_{COM,ORG,APP}_{CORE,DOCS,NEWS,INFO,HELP}_URL
```

Compose defaults should map those names to the local dev ports for each workspace.

Use the same naming pattern in other workspaces when you need a self URL or cross-workspace link target.

## Surface Architecture

Core workspaces stay on Next.js. They own RP/BFF behavior, authenticated UI,
React Aria surfaces, logged-in state, and account, organization, and avatar
operations.

Public information workspaces use Astro: `docs`, `news`, `info`, and `help`.
They are limited to public content, MDX, content collections, SSG/SSR, and image
optimization.

Rails Core/Base remains the source of truth for policy, mutation, authority,
and content JSON APIs. Astro public surfaces may consume only public,
read-only Rails content APIs through the Cloudflare Workers private connectivity
boundary. They must not receive Acme refresh tokens, user-scoped secrets, or
authenticated Core session material.

See [Public Information Surfaces](./docs/public-information-surfaces.md) and
[ADR 004](./adr/004-public-information-surfaces-astro.md).

## Acknowledgement

- Secrets must stay in Rails credentials; do not commit plaintext secrets.
- WebAuthn origins are controlled by `TRUSTED_ORIGINS`.
- Public availability of this repository is not guaranteed permanently.
