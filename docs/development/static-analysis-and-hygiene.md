# Static analysis and repository hygiene

Eleven tools run over this repository. Each one owns exactly one question, and
none of them is allowed to answer another's. This file is the ownership table,
the command list, and the policy for adding an exception.

## 1. Who owns what

| Tool                    | Answers                              | Explicitly does NOT                                                                                     |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **oxfmt**               | is it formatted?                     | anything about meaning                                                                                  |
| **oxlint**              | is the source itself wrong or risky? | cross-file architecture; spelling                                                                       |
| **oxlint --type-aware** | is it wrong once types are known?    | —                                                                                                       |
| **tsc**                 | does it type-check?                  | —                                                                                                       |
| **Vitest**              | did the internal logic break?        | HTTP responses (Hurl), rendering (Playwright)                                                           |
| **Hurl**                | did the HTTP contract break?         | internal logic                                                                                          |
| **Playwright**          | did the user's browser path break?   | status codes and `Content-Type`                                                                         |
| **Knip**                | is anything dead or undeclared?      | version ranges; import direction                                                                        |
| **dependency-cruiser**  | may this layer import that one?      | **TypeScript — it cannot read it. See §4.**                                                             |
| **syncpack**            | do the manifests agree on versions?  | `packageManager` / Node versions — `devEngines` and `test/package-manager-invariants.test.ts` own those |
| **CSpell**              | is it spelt correctly?               | identifier naming rules                                                                                 |
| **Size Limit**          | did the browser bundle grow?         | server bundle size; runtime performance                                                                 |

Import cycles are the one invariant with two owners, and deliberately so:
oxlint's `import/no-cycle` holds the line for TypeScript, which
dependency-cruiser cannot parse, and dependency-cruiser holds it for the
JavaScript that oxlint's rule also covers. Remove neither until §4 changes.

## 2. Commands

| Command                       | What it runs                                               |
| ----------------------------- | ---------------------------------------------------------- |
| `pnpm run knip`               | dead code / unused dependencies, once per unit             |
| `pnpm run check:architecture` | dependency-cruiser over the JavaScript surface             |
| `pnpm run check:deps`         | syncpack, read-only                                        |
| `pnpm run fix:deps`           | syncpack, **rewrites manifests — local only**              |
| `pnpm run check:spelling`     | CSpell over the tree                                       |
| `pnpm run check:size`         | Size Limit, per unit — **requires `pnpm run build` first** |
| `pnpm run check:static`       | all of the above except `check:size`                       |
| `pnpm run check`              | `check:static` then `test`                                 |

`check:size` is outside `check:static` because it measures build output, and
`check:static` must be runnable on a tree that has never been built.

## 3. Where each gate runs

| Gate                  | pre-commit         | pre-push | CI job                          |
| --------------------- | ------------------ | -------- | ------------------------------- |
| oxfmt                 | staged files       | —        | `format`                        |
| oxlint                | staged files       | ✓        | `lint`                          |
| CSpell                | staged files       | ✓ (full) | `spelling`                      |
| syncpack              | ✓ (manifests only) | ✓        | `deps`                          |
| dependency-cruiser    | —                  | ✓        | `architecture`                  |
| Knip                  | —                  | ✓        | `knip` (21-job matrix)          |
| tsc / type-aware lint | —                  | ✓        | `typecheck`, `lint-types`       |
| Vitest                | —                  | ✓        | `test`                          |
| Size Limit            | —                  | —        | `build` matrix, after the build |

`pre-push` runs cheapest-first so a one-word mistake is reported in under a
second rather than after the test suite; the measured costs are listed in
`lefthook.yml`. Size Limit is absent from both hooks because it would require
building all twenty units before every push — a cost CI already pays. `vite
build` is fast, but twenty of them is still twenty.

Every CI step is `pnpm run <script>` or `pnpm -C <dir> run <script>`. No tool
flags live in `.github/workflows/integration.yaml`, so a red check is reproduced
by copying one line. Nothing in CI writes to the tree: `--fix` and `syncpack fix`
have no CI caller.

## 4. Why dependency-cruiser only sees JavaScript

dependency-cruiser was removed during the TypeScript 7 migration and is back
with a deliberately narrow scope.

v18.2.0 — the latest release, 2026-08-10 — reaches for TypeScript's programmatic
compiler API and declares `typescript: >=2.0.0 <7.0.0`. This repository is on
TypeScript 7.0.2, which does not publish that API. Re-verified against 18.2.0 on
2026-08-18:

```
$ pnpm exec depcruise --no-config --ts-config app/core/tsconfig.json app/core/src
✔ no dependency violations found (0 modules, 0 dependencies cruised)
‼ missing-typescript-transpiler: dependency-cruiser detected a TypeScript
    environment, but not a compatible TypeScript compiler (typescript: >=2.0.0 <7.0.0).
    => Support for typescript@>=7 will follow when its API is published and stable.

$ pnpm exec depcruise --no-config tools
✔ no dependency violations found (8 modules, 11 dependencies cruised)
```

A gate that passes because it parsed nothing reads as coverage, which is why the
tool was removed rather than left in place. `.dependency-cruiser.jsonc` is
therefore pointed only at the JavaScript: `tools/**/*.mjs` and the twenty
per-unit `api/run.mjs` Hurl runners. `scripts/` is not included — every file
there is `#!/usr/bin/env bash`.

`test/dependency-architecture-invariants.test.ts` is the guard on this
arrangement. It fails if the cruise ever goes empty again — from a resolver
regression, a bad glob, or another compiler bump — so the gate cannot quietly
return to being green-because-blind.

### Rules enforced today

Each encodes a dependency direction that already holds, verified before it was
turned on. Nothing aspirational is enforced.

| Rule                           | What it forbids                                                              |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `no-circular`                  | import cycles                                                                |
| `not-to-unresolvable`          | an import that resolves to nothing                                           |
| `not-to-dev-dep`               | `tools/` reaching a devDependency — the `check-workers` CI job skips install |
| `no-non-package-json`          | an import that works only because a package was hoisted                      |
| `no-deprecated-core`           | Node core modules on a removal schedule                                      |
| `tools-not-to-test`            | `tools/` → `test/`; the real direction is `test/` → `tools/`                 |
| `tools-lib-is-a-leaf`          | `tools/lib/` reaching back into a `tools/*.mjs` entrypoint                   |
| `api-runner-is-self-contained` | any non-core import in an `api/run.mjs`                                      |

`no-orphans` is **not** enabled, and this is not an exception: every module in
scope except `tools/lib/wrangler-config.mjs` is a CLI entrypoint reached through
a pnpm script, never through an import, so the rule would report the whole
graph. That is the rule not fitting the code, not the code being wrong.

### Future invariants — recorded, not enforced

TypeScript-layer layering rules, cross-deployment-unit imports and private
implementation boundaries stay where they are:
`test/deployment-unit-boundaries.test.ts`, oxlint's `no-restricted-imports`, and
`import/no-cycle`. Reconsider moving them here **only** when dependency-cruiser
declares `typescript@>=7`, and only after checking it adds something the three
owners above do not.

## 5. Performance budget

Measured with Size Limit (gzip) against each unit's own build output. The
original baseline-plus-10% figures remain historical measurements. The current
approved ceiling for the fifteen TanStack Start units is 150 kB; Apex keeps its
52 kB ceiling. The ceiling applies to each unit's client JavaScript output and
does not change the Apex Worker bundle rule.

The frame figures were measured on 2026-08-23 and the apex figures on
2026-08-18. `adr/013-frames-tanstack-start.md` records where the frame numbers
came from and what they replaced.

| Unit                                       | Baseline     | Budget |
| ------------------------------------------ | ------------ | ------ |
| `{app,com,org}/{docs,help,info,news}` (12) | 101.84 kB    | 150 kB |
| `{app,com,org}/core` (3)                   | 117.3 kB     | 150 kB |
| `{app,com,dev,net,org}/apex` (5)           | 47.1–47.2 kB | 52 kB  |

The twelve satellites measured within 0.1 kB of each other and the three cores
were identical, so each group carries one budget rather than three or twelve.
The frames measure `dist/client/assets/**/*.js`, which is where Vite writes the
hashed client chunks.

`dev/acme` used to hold the largest budget in this table, 300.96 kB against
335 kB, almost all of it the Sentry SDK. It was deleted along with the rest of
the Vercel surface; `umaxica.dev` is now served by `dev/apex`, which is a Hono
Worker on the apex archetype and uses the same 52 kB ceiling as its four
siblings.

`app/core` used to be unmeasurable locally: its development environment binds a
Workers VPC Service, which wrangler refuses to simulate and can only proxy after
an interactive `wrangler login`, so the build aborted in a container without
credentials. Each frame's `vite.config.ts` passes `remoteBindings: false` unless
`CLOUDFLARE_ENV=vpc`, so `app/core` builds and measures locally like its two
siblings.

`dev/apex` used to have no entry and no `.size-limit.json`, because it rendered
HTML from template literals on Vercel. It is an Apex Worker on Cloudflare now
and carries the same 52 kB Worker-bundle entry as the other four.

The Apex figure is the gzip size of the Vite-produced Worker bundle at each
unit's configured `dist/umaxica_apps_edge_*` path. The 52 kB ceiling remains
separate from the 150 kB client-JavaScript ceiling used by TanStack Start.

### Why no Size Limit preset

`@size-limit/preset-app` pulls in `@size-limit/time`, which needs a headless
Chrome. Neither `Containerfile` nor the workflow installs a browser binary —
the same reason `test:e2e` is not a CI gate. Only `size-limit` and
`@size-limit/file` are installed. The webpack and esbuild plugins are not needed
either: Vite has already bundled everything being measured.

## 6. Configuration files

| File                              | Owns                           |
| --------------------------------- | ------------------------------ |
| `<unit>/knip.jsonc`               | Knip, per unit                 |
| `.dependency-cruiser.jsonc`       | dependency-cruiser (root only) |
| `.syncpackrc.json`                | syncpack (root only)           |
| `cspell.config.yaml`              | CSpell (root only)             |
| `.cspell/project-words.txt`       | the project dictionary         |
| `<unit>/.size-limit.json`         | that unit's budget             |
| `pnpm-workspace.yaml` → `catalog` | every shared version           |

Knip and Size Limit are per unit because their answers are per unit, matching
the rule that a unit carries the configuration it needs to run standalone
(`test/deployment-unit-boundaries.test.ts`). The other three are root-only
because their questions are about the repository _as a whole_ — a spelling
dictionary, a cross-manifest version policy and a root-level import graph have
no per-unit meaning.

## 7. Adding an exception

An exception is the last resort, and it needs a written cause, not a written
apology. Before adding one, work out which of these it is:

1. **A framework convention the tool cannot see** — resolve it through the
   tool's own plugin or `entry`/`project` configuration, not an ignore.
2. **Generated code** — exclude the path, and say what generates it.
3. **A dynamic import or a filename convention** — declare the entry point.
4. **A configuration defect** — fix the configuration. This is the common case,
   and it is what the two Tailwind suppressions in every `knip.jsonc` turned out
   to be: they existed because Knip "does not parse CSS at-rules", which stopped
   being true once `.css` was added to `project`. Both are gone.
5. **Genuinely unused** — delete the code or the dependency.

Only if it is none of the above does an ignore go in, with a comment naming
which of the five it _is_ and what would let it be removed.

Two live examples of the bar:

- `react-aria-components` in the twelve satellite frames' `ignoreDependencies` is
  case 5-in-waiting, not an exemption: it is installed ahead of use so the
  archetypes cannot diverge on the component library, and the comment says to
  remove the entry from the first unit that gains a consumer.
- `.cspell/project-words.txt` holds names and deliberate non-words under
  headings. The first thing this checker found was the product name misspelt in
  seven apex test fixtures; the fix was to correct all seven, not to add a
  ninetieth word.

## 8. CI job → local command

| CI job                   | Reproduce with                                            |
| ------------------------ | --------------------------------------------------------- |
| `format`                 | `pnpm run format:check`                                   |
| `lint`                   | `pnpm run lint`                                           |
| `lint-types`             | `pnpm run lint:types`                                     |
| `typecheck`              | `pnpm run typecheck`                                      |
| `generated-types`        | `pnpm run check:generated`                                |
| `check-workers`          | `node tools/check-workers.mjs`                            |
| `architecture`           | `pnpm run check:architecture`                             |
| `deps`                   | `pnpm run check:deps` (repair: `pnpm run fix:deps`)       |
| `spelling`               | `pnpm run check:spelling`                                 |
| `knip:<platform>:<unit>` | `pnpm --dir <dir> run knip`                               |
| `test`                   | `pnpm run test`                                           |
| `size`                   | `pnpm -C <dir> run build && pnpm -C <dir> run check:size` |
| `test-api`               | `pnpm -C <dir> run test:api`                              |

The `size` job builds, but it is not a build gate and must not be read as one.
"Does this unit build?" is answered by Cloudflare Workers Builds, which runs on
every push — including non-production branches, where `preview_urls` yields a
deployed URL that shows the Worker starting and answering a request, rather than
only that Vite exited zero. CI does not repeat that. What Cloudflare does not do
is compare the output against `.size-limit.json`, and a bundle cannot be
measured without having been built, so the build survives here as the input to
the measurement. If the bundle budget is ever retired, retire the job with it
instead of keeping a build for its own sake.
