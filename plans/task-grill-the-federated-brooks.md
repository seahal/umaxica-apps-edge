# Vite+ Removal Audit — Umaxica App (EDGE)

Audit date: 2026-07-14. Branch `develop`, dirty working tree (in-flight purge of docs/help/news app content). All claims below are labeled: **[repo]** = repository fact, **[tool]** = official-tool fact, **[inf]** = inference, **[rec]** = recommendation.

## Context

The hypothesis under test: Next.js is not Vite-based, so Vite+ should not remain the task authority merely to wrap Oxlint/Oxfmt/Vitest/tsgo; pnpm scripts should orchestrate. The audit confirmed the hypothesis **and found something worse**: the CI lint and format jobs are silent no-ops today because they invoke Vite+'s IDE-only wrapper binaries.

---

## 1. Executive verdict

**REMOVE VITE+ WITH PREREQUISITES.**

Vite+ contributes **zero build or runtime value** here. Every app is Next.js: `dev` = `next dev`, `build` = `opennextjs-cloudflare build` (which runs `next build`), deploy = wrangler/OpenNext/Vercel. `vp dev`/`vp build` (Vite) are never used **[repo]**. Vite+'s only real roles are: (a) task fan-out (`vp run --filter`), (b) distributing the oxlint/oxfmt binaries and their config (embedded in `vite.config.ts`), (c) wrapping Vitest via forked packages (`vitest` → `npm:@voidzero-dev/vite-plus-test` catalog alias), (d) git hooks (`prepare: vp config` → `.vite-hooks/pre-commit` → `vp staged`). All four are replaceable by pnpm + standalone tools.

The urgent, verdict-driving finding: **CI lint and format are fake-green** **[repo, verified by execution]**. `node_modules/.bin/oxlint` and `.bin/oxfmt` are Vite+ LSP-only shims that print "This wrapper is for IDE extension use only" and **exit 0**. CI runs `pnpm exec oxlint .` and `pnpm exec oxfmt --check .` — both no-ops. Nothing has actually linted or format-checked this repo in CI. This alone justifies migration: the current architecture makes "direct tool invocation" impossible without Vite+, and CI already (incorrectly) assumes direct invocation exists.

Prerequisites, not blockers: install real `oxlint`/`oxfmt` packages, port the lint/fmt config out of `vite.config.ts` into `.oxlintrc.json`/`.oxfmtrc.json`, swap the vitest catalog alias to real `vitest`, convert `vitest.config.ts` imports, replace `vp run`/`vp exec` with `pnpm -r`/direct binaries, and replace `vp config` hooks with Lefthook (which CLAUDE.md claims is used but **is not** — only a stale `.git/info/lefthook.checksum` remains **[repo]**).

TypeScript 7 is a non-issue: the repo **already type-checks with `tsgo`** from `@typescript/native-preview@7.0.0-dev.20260619.1`, a direct root devDependency independent of Vite+ **[repo]**. Keep it. (Typecheck currently fails with pre-existing code errors — see baseline.)

Do not remove Vite+ in one commit. The catalog rewires `vite`/`vitest` package identity via pnpm `overrides` + `peerDependencyRules`; unwinding must be its own reviewed slice with the test suite as gate.

## 2. Repository topology **[repo]**

- pnpm workspace (`pnpm-workspace.yaml`), `packageManager: pnpm@10.29.3`, Node 24 in CI. Registry: `npm.flatt.tech` proxy, `ignore-scripts=true`, `engine-strict=true` (`.npmrc`).
- 13 workspace packages, all Next.js 16.2.6 apps: `app/{core,docs,help,news}`, `com/{core,docs,help,news}`, `org/{core,docs,help,news}` (Cloudflare via OpenNext), `dev/acme` (Vercel).
- **In-flight working-tree purge**: `*/docs`, `*/help`, `*/news` are gutted to bare `package.json` (all src/config deleted, uncommitted). `app/info`, `com/info`, `org/info` dirs exist but are **empty and not workspaces**. `net/` is empty. Expected "info" surface does not exist.
- `shared/` has real code + 6 test files but is **not a workspace package** — it's type-checked via app tsconfigs and tested via root Vitest glob.
- Dependency versions centralized via pnpm `catalog:`; security `overrides` at root; `minimumReleaseAge: 4320`.
- CI: single `.github/workflows/integration.yaml`. Its `build-vite` matrix targets `app/apex`, `com/apex`, `dev/status`, `net/apex`, `org/apex` — **packages that do not exist**. Dead CI job (fail-fast: false hides it as per-leg failures).
- Root `tsconfig.json` excludes `shared/**` and is not referenced by apps (each app has its own tsconfig with `.next/types` includes). No project references.

## 3. Current toolchain authority **[repo]**

| Concern        | Actual authority                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| build/deploy   | per-app pnpm scripts → `vp exec opennextjs-cloudflare` / `next build` / `vercel`                                                                       |
| dev            | per-app `next dev --port <n>` (no vp)                                                                                                                  |
| lint           | `vp lint` locally (config in `vite.config.ts`); **CI job is a no-op**                                                                                  |
| format         | `vp fmt` locally (config in `vite.config.ts`); **CI job is a no-op**                                                                                   |
| tests/coverage | `vp test` → bundled Vitest 4.1.10, root `vitest.config.ts` (imports from `vite-plus`)                                                                  |
| typecheck      | `vp run type` → per-app `vp exec tsgo --noEmit` (tsgo = `@typescript/native-preview`, NOT vite-plus)                                                   |
| hooks          | Vite+ (`prepare: vp config` → `.vite-hooks/pre-commit`: `vp staged` → `vp check --fix`). **Lefthook is not installed** despite CLAUDE.md/README claims |
| CI             | GitHub Actions calling a mix of pnpm-direct (broken) and vp-backed scripts                                                                             |

Verdict: an **inconsistent mixture** — pnpm scripts wrap vp, vp wraps tools, CI bypasses vp and silently breaks.

## 4. Vite+ dependency graph

| Edge                                                                                                                                                                                                                                               | File                                  | Class                           | Replacement                                                                                                                                                 | Risk                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `vitest`→`@voidzero-dev/vite-plus-test`, `vite`→`@voidzero-dev/vite-plus-core@latest` catalog aliases + `overrides` + `peerDependencyRules`                                                                                                        | `pnpm-workspace.yaml`                 | test/build dep identity rewire  | real `vitest@^4`, drop `vite` entry (nothing uses Vite)                                                                                                     | **Medium** — lockfile churn; `@latest` pin is also a supply-chain smell                                                        |
| `vp fmt`/`vp lint`/`vp check` + config                                                                                                                                                                                                             | root `package.json`, `vite.config.ts` | lint/format                     | standalone `oxlint`+`oxlint-tsgolint`+`oxfmt` pkgs with `.oxlintrc.json`/`.oxfmtrc.json` ported from `vite.config.ts`                                       | **Medium** — config translation must be verified rule-by-rule; type-aware lint needs `oxlint-tsgolint` **[tool: oxc.rs docs]** |
| `vp test run [--coverage]`                                                                                                                                                                                                                         | root `package.json`                   | test orchestration              | `vitest run [--coverage]`; rewrite `vitest.config.ts` imports `vite-plus`→`vitest/config`                                                                   | Low — plain Vitest config semantics                                                                                            |
| `vp run --filter <ws> <script>` (`type`, deploys)                                                                                                                                                                                                  | root `package.json`                   | task orchestration only         | `pnpm -r --filter <ws> run <script>` (loses vp's task cache — acceptable, tasks are fast)                                                                   | Low                                                                                                                            |
| `vp exec <bin>` (opennextjs-cloudflare, wrangler, tsgo)                                                                                                                                                                                            | all app `package.json`                | dev convenience                 | bare binary name in pnpm scripts (pnpm puts `.bin` on PATH) **[tool: pnpm docs]**                                                                           | Low                                                                                                                            |
| `prepare: vp config` → `.vite-hooks/`                                                                                                                                                                                                              | root `package.json`, `.vite-hooks/`   | git hooks                       | Lefthook (`lefthook.yml`, `prepare: lefthook install`) — note `.npmrc ignore-scripts=true` means `prepare` doesn't auto-run anyway; document manual install | Low                                                                                                                            |
| CI `pnpm exec oxlint .` / `oxfmt --check .`                                                                                                                                                                                                        | `integration.yaml`                    | CI (broken)                     | real binaries after standalone install                                                                                                                      | **These are no-ops today**                                                                                                     |
| Docs (README, AGENTS.md, CLAUDE.md)                                                                                                                                                                                                                | —                                     | docs                            | rewrite                                                                                                                                                     | Low                                                                                                                            |
| `knip.json` `ignoreUnresolved: ["^vite/client$"]`, root deps `@cloudflare/vite-plugin`, `@vitejs/plugin-react`, `vite-plugin-babel`, `vite-ssr-components`, `vite-tsconfig-paths`, `@tailwindcss/vite`, `vitest.config.ts` `resolve.tsconfigPaths` | root + app devDeps                    | **dead** (no Vite build exists) | delete                                                                                                                                                      | Low                                                                                                                            |

## 5. What breaks if Vite+ is deleted today **[verified/inf]**

1. `pnpm run lint|format|test|type|typecheck|test:cov` and all `deploy:*` root scripts (all call `vp`).
2. Every app's `build`/`deploy`/`preview`/`cf-typegen`/`type` script (`vp exec`).
3. Pre-commit hook (`.vite-hooks/pre-commit` → `vp staged`).
4. **oxlint, oxfmt binaries vanish entirely** — they are shipped inside vite-plus, no standalone packages installed.
5. Vitest vanishes (`vitest` resolves to `@voidzero-dev/vite-plus-test`); `vitest.config.ts` fails to import `vite-plus`.
6. CI typecheck/test jobs fail; CI lint/format jobs would _finally_ fail loudly instead of no-op'ing.
7. NOT broken: `next dev`, `next build`, tsgo binary (`@typescript/native-preview`), Playwright, wrangler, OpenNext.

## 6. Tool-by-tool verdict

**Oxlint** — Current: v1.72.0 bundled in vite-plus; config lives in `vite.config.ts` `lint` block (plugins typescript/react/import/jsx-a11y, custom rules, type-aware via bundled oxlint-tsgolint v0.24.0); no `.oxlintrc.json` exists; `vp lint` passes in ~0.7s. Vite+ dependency: **total** (binary + config + type-aware wiring). Direct replacement: install `oxlint` + `oxlint-tsgolint`, port config to `.oxlintrc.json` (plugins/rules/globals/ignorePatterns map 1:1 to oxlintrc schema **[tool]**), run `oxlint --type-aware .`. **`oxlint .` today is NOT equivalent — it is a no-op shim.** Risk: medium (verify identical diagnostics on a dirty file). Verdict: migrate.

**Oxfmt** — Current: v0.57.0 bundled; config in `vite.config.ts` `fmt` block (printWidth 100, singleQuote, sortPackageJson, per-filetype overrides, ignorePatterns); `vp fmt --check` reports 4 pre-existing dirty files under `plans/`. Vite+ dependency: total (same as oxlint). Direct replacement: standalone `oxfmt` + `.oxfmtrc.json`. Risk: medium (verify with `--check` before/after produces same file set, modulo plans/). Verdict: migrate.

**Lefthook** — Current: **not installed**; CLAUDE.md/README claims are false; hooks are Vite+ (`vp staged` → `vp check --fix`, i.e. format+lint+typecheck on staged files). Direct replacement: `lefthook.yml` pre-commit running oxfmt/oxlint on `{staged_files}`, pre-push running typecheck+vitest. Risk: low. Verdict: introduce for real.

**Vitest** — Current: v4.1.10 via `@voidzero-dev/vite-plus-test` fork; root `vitest.config.ts` (happy-dom, globals, setup `vitest.setup.ts` → jest-dom, v8 coverage, 100% thresholds with very broad excludes — **all of `src/app/**` is excluded from coverage**, so the 100% threshold is largely cosmetic); 18 files / 112 tests, all pass in <1s; single root config, no projects/workspaces, no aliases beyond `tsconfigPaths` (dead — no path aliases used in tests confirmed by passing suite). Vite+ dependency: package identity + config import. Direct replacement: real `vitest` + `@vitest/coverage-v8` (already a direct root dep at 4.1.9 — pin alignment needed), import from `vitest/config`, drop `resolve.tsconfigPaths` or add `vite-tsconfig-paths` explicitly if needed. `vp test run` → `vitest run`; `vp test run --coverage` → `vitest run --coverage`. Risk: low; gate = identical 18/112 pass + same coverage table. Verdict: migrate; **no semantic regression expected**. Route-handler and page tests are unit-level RTL tests; async-Server-Component/runtime behavior is untested — that's a Playwright gap, not a Vitest migration issue.

**Playwright** — Current: `@playwright/test` ^1.59.1 in core apps + dev/acme; configs and `e2e/example.spec.ts` are **untouched `create-playwright` scaffolds testing playwright.dev** — no webServer, no baseURL, no CI job, never run. Vite+ dependency: none. Verdict: no migration edge; real E2E (against `next start` and/or `opennextjs-cloudflare preview`) is future work, out of scope here. Flagged gap: nothing tests OpenNext/Workers runtime output.

**TypeScript** — Current: tsgo (`@typescript/native-preview` 7.0.0-dev) per-app `--noEmit`; no `typescript` package installed anywhere; no `import ts from "typescript"` usage found **[repo]**. `vp run type` currently **fails** with pre-existing code errors (below). Next.js: apps use generated `.next/types` includes + `next-env.d.ts`; typecheck depends on `next dev`/`next build` having generated types at least once — a `next typegen`-style step is worth adding per-app before tsgo in CI (verify against Next 16 docs at implementation time; Next 16 provides `next typegen` **[tool — confirm]**). Typecheck must stay per-app (each app has its own tsconfig + `.next` dir; parallel-safe since `.next` is app-local). Verdict: keep tsgo, drop only the `vp exec` wrapper.

**Next.js** — v16.2.6, drives its own dev/build. Zero Vite involvement. No change.

## 7. TypeScript 7 verdict

**SAFE NOW** — trivially: it is already the only type checker in the repo (`@typescript/native-preview@7.0.0-dev.20260619.1`, direct devDependency, invoked as `tsgo --noEmit` per app). No TS JS-API consumers found (no `typescript` package in the dependency tree; oxlint's type-aware mode uses tsgolint, which is tsgo-native **[tool]**). Editor caveat: VS Code needs the TS-native extension for parity, and `tsgo` is a preview build — pin exact versions and keep the escape hatch of installing `typescript` + `tsc --noEmit` if a Next.js upgrade emits types tsgo can't handle. Current failures are code bugs, not compiler incompatibilities.

## 8. Proposed pnpm command contract

Root (`package.json`), all CI-safe unless noted:

- `pnpm lint` → `oxlint --type-aware .` — repo-wide, read-only.
- `pnpm lint:fix` → `oxlint --fix .` — mutates.
- `pnpm format` → `oxfmt .` — mutates. `pnpm format:check` → `oxfmt --check .` — read-only. (Fixes current typo script `formach:check`.)
- `pnpm typecheck` → `pnpm -r run typecheck` — recursive, per-app tsgo; fails fast per pnpm defaults; ordering: apps must have generated Next types (add `next typegen`/build-types step per app if CI is a cold checkout).
- `pnpm test` → `vitest run`; `pnpm test:coverage` → `vitest run --coverage` (rename from `test:cov` or keep — pick one; recommend keeping `test:cov` to avoid CI churn, cosmetic either way).
- `pnpm test:e2e` → `pnpm -r --filter './*/core' --filter dev/acme exec playwright test` — deferred until E2E is real.
- `pnpm check` → `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` — CI aggregate, read-only.
- Per-app: `dev`/`build`/`start` unchanged; replace `vp exec X` with bare `X` (pnpm exposes workspace `.bin` on script PATH); rename per-app `type` → `typecheck` for one vocabulary.
- Deploy scripts: `vp run --filter <ws> deploy:upload` → `pnpm --filter <ws> run deploy:upload`.

Lost vs Vite+: `vp run` task caching. Measured task times (lint 0.7s, tests 0.5s, fmt 0.4s) make a cache worthless here **[repo baseline]**.

## 9. Lefthook responsibility model

- **pre-commit** (fast, staged-only, parallel): `oxfmt {staged_files}` + `oxlint {staged_files}` — mirrors current `vp staged` minus typecheck (typecheck on staged files is whole-project anyway; move it out of pre-commit for speed... current `vp check --fix` includes it; keep pre-commit ≤2s).
- **pre-push**: `pnpm typecheck && vitest run` (suite is 0.5s; cheap enough).
- **CI (authoritative)**: full `pnpm check` equivalents as separate jobs (as today), plus audit/knip/gitleaks unchanged. Delete or fix the dead `build-vite` matrix (targets nonexistent `*/apex`, `dev/status`, `net/apex` packages) — replace with a build matrix over real core apps running `opennextjs-cloudflare build`.
- gitleaks stays CI-side (already an Action); optionally add to pre-commit later.

## 10. Baseline results (2026-07-14, dirty develop tree)

| Command                        | Result                                             | Notes                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oxlint .` (raw .bin)          | exit 0, **no lint performed**                      | "IDE extension only" shim — CI lint job is a no-op (pre-existing)                                                                                        |
| `oxfmt --check .` (raw .bin)   | exit 0, **no check performed**                     | same — CI format job is a no-op (pre-existing)                                                                                                           |
| `vp lint`                      | pass, 0.7s                                         | clean                                                                                                                                                    |
| `vp fmt --check`               | 4 files dirty (all under `plans/`), 0.4s/227 files | pre-existing                                                                                                                                             |
| `vp run type`                  | **4 packages FAIL**                                | pre-existing code errors: `org/core` missing `@/i18n/config` + `@/i18n/dictionaries` modules; `shared/cloudflare/image.ts` TS18048 possibly-undefined ×5 |
| `vp test run`                  | **pass**: 18 files, 112 tests, 480ms               | clean                                                                                                                                                    |
| Coverage / Playwright / builds | not executed (plan mode / write-heavy)             | Playwright specs are scaffolds against playwright.dev; run coverage + one `opennextjs-cloudflare build` in Slice 0                                       |

## 11. Dead or redundant tooling

- CI `build-vite` job: targets nonexistent packages — **dead**.
- Vite plugin devDeps at root: `@cloudflare/vite-plugin`, `@vitejs/plugin-react` (also in app devDeps), `vite-plugin-babel`, `vite-ssr-components`, `vite-tsconfig-paths`, `@tailwindcss/vite`, `@babel/preset-typescript`, `babel-plugin-react-compiler`, `miniflare` (root; wrangler vendors its own) — **dead/redundant** (no Vite build exists); verify each with knip before removal.
- `vite: npm:@voidzero-dev/vite-plus-core@latest` catalog entry — dead once vite-plus is gone; `@latest` pin is a hazard regardless.
- `jsdom` in app devDeps (env is happy-dom) — redundant.
- `.git/info/lefthook.checksum` — stale remnant.
- Empty `app/info`, `com/info`, `org/info`, `net/` dirs — dead scaffolding.
- Root `tsconfig.json` — unused by any build/typecheck path (apps have their own; root excludes `shared`); likely editor-only; review.
- CLAUDE.md/README/AGENTS.md tooling claims (Lefthook, `vp` workflow) — stale after migration.
- No ESLint/Prettier/Biome/Jest remnants found — clean.

## 12. Migration plan (small reviewable slices)

Each slice = one PR; rollback boundary = revert that PR. Validation baseline: `vp lint` clean, fmt-dirty = 4 plans/ files, typecheck fails in 4 known packages, tests 18/112 pass.

- **Slice 0 — freeze baseline (no toolchain change):** commit/land the in-flight docs/help/news purge first (dirty tree makes every diff noisy); record coverage run + one `opennextjs-cloudflare build` output. Optionally fix the 4-package typecheck failures (`org/core` i18n modules, `shared/cloudflare/image.ts`) so migration gates on green. Files: working-tree deletions, `org/core/src`, `shared/cloudflare/image.ts`. Validate: `vp run type` green, `vp test run` green.
- **Slice 1 — standalone tools alongside Vite+:** add real `oxlint`, `oxlint-tsgolint`, `oxfmt` devDeps (pnpm `.bin` collision with vite-plus shims must be checked — may need exact bin precedence or removing shim exposure); create `.oxlintrc.json` + `.oxfmtrc.json` ported from `vite.config.ts`; prove equivalence (introduce a violation, confirm both paths flag it; `oxfmt --check` file set matches `vp fmt --check`). Files: root `package.json`, two new rc files. Rollback: delete deps+rc files.
- **Slice 2 — root scripts to direct tools:** `lint`/`lint:check→lint:fix` naming fix, `format`, `format:check` (fix `formach:check` typo), `test`/`test:cov` → `vitest run`; rewrite `vitest.config.ts` to import from `vitest/config`; swap catalog `vitest` alias → real `vitest`, align `@vitest/coverage-v8`; drop `resolve.tsconfigPaths`. Validate: 18/112 pass, coverage table unchanged. Files: root `package.json`, `vitest.config.ts`, `pnpm-workspace.yaml`, lockfile.
- **Slice 3 — app scripts + typecheck:** replace all `vp exec X` with `X` across 13 app `package.json`; root `typecheck` → `pnpm -r run typecheck`; add Next type generation step where CI cold-checkout typecheck needs it (verify `next typegen` availability in Next 16 docs; else `next build` in typecheck-only mode or check-in ordering). Validate: `pnpm typecheck` reproduces exactly the known failures (or green post-Slice-0).
- **Slice 4 — CI:** fix lint/format jobs to the now-real binaries (they silently no-op today — this slice makes CI honest); typecheck/test jobs to new scripts; delete/replace dead `build-vite` matrix with real core-app OpenNext builds. Files: `integration.yaml`. Validate: all jobs run real work (check logs, not just green).
- **Slice 5 — hooks:** add `lefthook` devDep + `lefthook.yml` (pre-commit: staged oxfmt+oxlint; pre-push: typecheck+test); remove `prepare: vp config`; document `pnpm exec lefthook install` in README (auto-`prepare` is disabled by `ignore-scripts=true`); delete `.vite-hooks/`, `.git/info/lefthook.checksum` note. Validate: commit with a violation is blocked.
- **Slice 6 — remove Vite+:** drop `vite-plus` from all package.jsons, remove `vite`/`vitest` catalog aliases + `overrides` + `peerDependencyRules` remnants, delete `vite.config.ts`, prune dead Vite plugin deps (knip-verified), `pnpm install`, run knip. Validate: full `pnpm check`, one OpenNext build, one deploy dry-run.
- **Slice 7 — docs:** rewrite README/CLAUDE.md/AGENTS.md command tables; remove Vite+ sections; update `knip.json` (`^vite/client$` ignore). Validate: docs commands all execute.

(TS7 adoption slice not needed — already adopted.)

## 13. Blockers and open questions

1. **In-flight purge**: the uncommitted deletion of docs/help/news app content must land (or be reverted) before migration diffs are reviewable — user decision on sequencing.
2. **bin collision** (Slice 1): whether pnpm links standalone oxlint's bin over vite-plus's shim at root `.bin` is install-order/hoisting dependent — must be verified empirically during Slice 1; worst case, scripts call `pnpm exec oxlint` with explicit dep precedence or `node_modules/oxlint/bin` paths.
3. **`next typegen` exact semantics on Next 16.2** for cold-checkout typecheck — verify against Next docs during Slice 3.
4. Registry: `npm.flatt.tech` must carry standalone `oxlint`/`oxfmt`/`lefthook` — presumed yes (npm proxy), verify at Slice 1 install.

## 14. Final recommendation

```text
package manager / orchestration = pnpm (workspace + catalog, scripts as task authority)
framework build/dev            = Next.js 16 (+ OpenNext/wrangler for CF, Vercel for dev/acme)
lint                           = Oxlint (standalone, .oxlintrc.json, --type-aware via oxlint-tsgolint)
format                         = Oxfmt (standalone, .oxfmtrc.json)
hooks                          = Lefthook (newly real; replaces vp config/.vite-hooks)
unit/integration               = Vitest 4 (real package, root config, happy-dom)
browser/E2E                    = Playwright (scaffold today; wire webServer to next start / opennext preview later)
typecheck                      = tsgo (@typescript/native-preview, TS7 native) — already in use, per-app --noEmit
```
