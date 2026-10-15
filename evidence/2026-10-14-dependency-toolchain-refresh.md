# Dependency, toolchain and compatibility-date refresh

Date: 2026-10-14. Branch `feature`. Done after the TanStack Start upgrade
(`evidence/2026-10-14-tanstack-start-1-169-upgrade.md`), in the same
uncommitted working tree.

## What changed

- **Catalog packages**, via `pnpm update -r --latest`:
  - Cloudflare / build: `@cloudflare/vite-plugin` 1.63.1,
    `@cloudflare/workers-types` 5.20261013.1, vite 8.3.4, wrangler 4.149.0.
  - Tests: vitest and `@vitest/coverage-v8` 5.0.4, `@playwright/test` 1.64.0.
  - React: react, react-dom, `@types/react` and `@types/react-dom` 19.3.0,
    `react-aria-components` 1.22.1.
  - i18n: `@inlang/paraglide-js` 2.27.0, `plugin-m-function-matcher` 2.3.2,
    `plugin-message-format` 4.5.2.
  - Tooling: knip 6.41.0, dependency-cruiser 18.6.0, oxlint-tsgolint
    7.0.2004, `@types/node` 26.6.5, `@vitejs/plugin-react` 6.1.2.
  - lefthook 2.2.1 at the root.
  - Catalog comments were left unchanged.
- **happy-dom 20.14.5 → 21.0.1** (major, test environment only).
- **`@tanstack/intent` 0.5.5** added at the root through the catalog.
- **Toolchain**: pnpm 12.0.0 → 12.11.2 and Node 24.20.0 → 24.21.0. Updated in
  `package.json#devEngines`, `Containerfile`, `README.md`,
  `docs/development/development-environment-overview.md`,
  `docs/development/edge-development-container.md` and the canary image in
  `scripts/verify-build-context`. The `node:24.21.0-trixie` tag returned 200 from
  Docker Hub. `docs/development/edge-environment-refresh-report.md` is a past
  report and was not edited.
- **`compatibility_date`**: all 19 `wrangler.jsonc` files set to `2026-10-06`.
  Before: 2026-02-27 (`dev/apex`, `net/apex`), 2026-05-13 (15 frames and
  `tools/vpc-probe`), 2026-07-25 (`all/busy`). 2026-10-06 is the newest date the
  installed workerd (1.20261006.1) supports.

## Compatibility flags newly in effect

Reviewed against the Cloudflare compatibility-flags page (2026-10-14). Flags
for Durable Objects, Python, Containers, Queues, Workflows and WebSockets do not
apply: no unit uses those features. These do apply:

- **`nodejs_compat` on by default from 2026-08-04.** The 16 units that already
  set it are unaffected. `dev/apex` and `net/apex` set only `nodejs_als`, so
  they gain full Node compatibility. Their bundle sizes were unchanged
  (53.53 / 53.54 kB).
- **`writable_stream_spec_compliant_writer` and
  `encoder_stream_spec_compliant_backpressure`** (2026-03-24) change stream
  semantics. These matter for the Core Rails relay (`rails-body-limit.ts`).
  Covered by the unit tests only; not exercised against a live Rails.
- **`unhandled_rejection_after_microtask_checkpoint`** (2026-03-03) and
  **`enhanced_error_serialization`** (2026-04-21). No observed effect.

## Verification

Run after every step; the final state is reported here.

- `pnpm run check`: exit 0.
- `pnpm run check:deps`: no issues. `pnpm run check:spelling`: 0 issues.
- `pnpm run build`: exit 0. The 15 `SOURCEMAP_BROKEN` warnings from
  `vite:css-post` were already present before this work.
- `pnpm run check:size`: exit 0. Satellites 121.2–121.24 kB, Cores
  129.25–132.33 kB, apexes 53.53–53.54 kB.
- `pnpm run test:api`: exit 0. Every unit reported `Failed files: 0`.

## Not done

- The local Node is still 24.20.0, so pnpm warns that 24.21.0 is required.
  Rebuilding the development container clears it.
- No deployment, no `vite preview`, no Playwright, no live Rails or Workers VPC.
  The new compatibility date has run only in local workerd.
