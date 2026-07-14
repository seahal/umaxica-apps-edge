## Module Composition Rules

- Mixin-style modules, shared helpers, and composition utilities MUST keep their own implementation as side-effect-light as possible. Mutations, registration, persistence, external I/O, and other observable side effects MUST be performed or explicitly wired by the caller or consuming module.
- Shared module code MUST expose the smallest public surface practical. Keep internals unexported or locally scoped whenever possible, and only export functions or types that are intentionally part of the consumer-facing API.

## Toolchain

This project uses plain **pnpm** scripts for orchestration, with each tool (Next.js, Oxlint, Oxfmt, Vitest, tsgo, Playwright, Lefthook) invoked directly rather than through a wrapper CLI.

- Install: `pnpm install`
- Format: `pnpm run format` / `pnpm run format:check`
- Lint: `pnpm run lint` / `pnpm run lint:check`
- Type check: `pnpm run typecheck`
- Test: `pnpm run test` / `pnpm run test:cov`
- Per-workspace: `pnpm --filter <workspace> run <script>`

Import test utilities from `vitest` (not a wrapper package). Oxlint config is `.oxlintrc.json`; Oxfmt config is `.oxfmtrc.json`, both at the repo root. Type-aware linting works via `oxlint-tsgolint`, invoked automatically by `oxlint --type-aware`.

## Review Checklist for Agents

- [ ] Run `pnpm install` after pulling remote changes and before getting started.
- [ ] Run `pnpm run format:check`, `pnpm run lint:check`, `pnpm run typecheck`, and `pnpm run test` to validate changes.
