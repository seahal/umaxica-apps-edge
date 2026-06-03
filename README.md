![GitHub last commit (branch)](https://img.shields.io/github/last-commit/seahal/umaxica-apps-edge/main)

# Umaxica App (EDGE)

（ ＾ν＾） Hello, World!

## Prerequisites

- Node.js 24.x (`node:24-trixie`)
- [pnpm](https://pnpm.io/) 10.29+
- Docker & Docker Compose (optional)

## Workspaces

| Package    | Role            | Domain             | Dev Port |
| ---------- | --------------- | ------------------ | -------- |
| `com/core` | Corporate app   | `umaxica.com`      | 5102     |
| `com/docs` | Corporate docs  | `docs.umaxica.com` | 5106     |
| `com/news` | Corporate news  | `news.umaxica.com` | 5107     |
| `com/help` | Corporate help  | `help.umaxica.com` | 5108     |
| `org/core` | Staff app       | `umaxica.org`      | 5302     |
| `org/docs` | Staff docs      | `docs.umaxica.org` | 5306     |
| `org/news` | Staff news      | `news.umaxica.org` | 5307     |
| `org/help` | Staff help      | `help.umaxica.org` | 5308     |
| `app/core` | Service app     | `umaxica.app`      | 5402     |
| `app/docs` | Service docs    | `docs.umaxica.app` | 5406     |
| `app/news` | Service news    | `news.umaxica.app` | 5407     |
| `app/help` | Service help    | `help.umaxica.app` | 5408     |
| `dev/acme` | Development app | `umaxica.dev`      | 5502     |

## Quick Start

```bash
vp install

# Run a specific workspace
vp run --filter <workspace> dev   # e.g. com/core, app/core

# Docker (optional)
docker compose up && docker compose exec core bash
```

## Scripts

Toolchain is [Vite+](https://vite.plus/) (`vp` CLI).

```bash
vp check                  # format + lint + type-check
vp fmt                    # oxfmt
vp lint                   # oxlint
vp test                   # vitest
vp run --filter <ws> <script>
```

## Development Environment

### Toolchain

| Tool                                                            | Role                                      | Version |
| --------------------------------------------------------------- | ----------------------------------------- | ------- |
| [Vite+](https://vite.plus/) (`vp`)                              | Unified CLI (dev, build, test, lint, fmt) | 0.1.x   |
| [pnpm](https://pnpm.io/)                                        | Package manager (wrapped by `vp`)         | 10.32.x |
| [Oxfmt](https://oxc.rs/)                                        | Formatter (`vp fmt`)                      | bundled |
| [Oxlint](https://oxc.rs/)                                       | Linter (`vp lint`)                        | bundled |
| [tsgo](https://github.com/nicolo-ribaudo/tsgo)                  | Type checker (`vp check`)                 | bundled |
| [Vitest](https://vitest.dev/)                                   | Test runner (`vp test`)                   | bundled |
| [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | Cloudflare Workers CLI                    | 4.x     |

Oxfmt, Oxlint, tsgo, and Vitest are bundled with Vite+ — no separate installation required.

### Docker / DevContainer

The development environment can be set up via Docker + VS Code DevContainer.

- **Base image**: `node:24-trixie` with pnpm (corepack) and Vite+ pre-installed
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
vp run --filter <workspace> deploy            # direct deploy
vp run --filter <workspace> deploy:upload      # versioned: upload then promote
vp run --filter <workspace> deploy:promote
```

Cloudflare deploy commands should use the Vite+ workspace runner, for example:

```bash
vp run deploy:app-docs:upload
vp run deploy:com-docs:upload
vp run deploy:org-docs:upload
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
JIT_{COM,ORG,APP}_{CORE,DOCS,NEWS,HELP}_URL
```

The current Compose defaults map those names to the local dev ports for each workspace.

Use the same naming pattern in other workspaces when you need a self URL or cross-workspace link target.

## Acknowledgement

- Secrets must stay in Rails credentials; do not commit plaintext secrets.
- WebAuthn origins are controlled by `TRUSTED_ORIGINS`.
- Public availability of this repository is not guaranteed permanently.
