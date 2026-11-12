# Split umaxica-apps-edge into Three Repositories (2026-11-12)

Status: decided direction (owner, 2026-11-12); repository names and details open. Nothing is
implemented.

## Decisions (owner)

1. **Three repositories**, following the Cosmos split:

   | New repository | Takes from this repository | Related Cosmos repository |
   | --- | --- | --- |
   | acme (formerly "apex") | `*/apex` (`app`, `com`, `org`, `dev`, `net`) | the apex (acme) domains |
   | sphere | `*/core` (`app`, `org`) | umaxica-apps-cosmos-sphere |
   | press | `*/docs`, `*/help`, `*/info`, `*/news` (`app`, `com`, `org`) | umaxica-apps-cosmos-press |

   The apex group is renamed **acme**, because it serves the acme domains. The Edge repositories are
   not bound to Rails, so their names are free.
2. **How to split:** copy this repository into each new one, then delete what that repository does
   not own. No shared package is created up front.
3. **Vite+ (`vp`) is adopted** in all three. Every package already builds on Vite (Hono with a Vite
   build, TanStack Start), so the earlier reason for removing it (a broken `vp` wrapper while a
   non-Vite framework was in use) no longer applies; Jump and Away already moved to Vite+ on
   2026-11-12. If a licensing problem appears, switch back to the individual tools.

## Decided later the same day (owner, 2026-11-12)

- **No `.com` in sphere.** `com/core` is retired, not carried over. If a `.com` Core is ever needed,
  decide then. Press keeps its `.com` surfaces; acme's `.com` follows Governance's Base com decision.
- **`all/busy` and `tools/vpc-probe`:** delete each when it is no longer needed. `tools/vpc-probe`
  moves to the sphere repository, its only user.
- **Toolchain versions follow the newest releases:** Node.js 26 LTS and pnpm 12, moving to newer
  versions as they come (`docs/backlog/2026-11-12-node-lts-26.md`).
- **Core and Sphere are n:n by region.** One Edge Core deployment may front several regional Sphere
  backends (for example `jp`, later `us`), and one regional Sphere may be fronted by more than one
  Edge Core deployment. The sphere Edge repository keeps region as an explicit dimension in routing
  and configuration instead of assuming a single backend.

## Repository names (owner, 2026-11-12)

| Group  | Repository                 |
| ------ | -------------------------- |
| acme   | `umaxica-apps-edge-acme` |
| sphere | `umaxica-apps-edge-sphere` |
| press  | `umaxica-apps-edge-press`  |

The acme group's repository is `umaxica-apps-edge-acme` (owner, 2026-11-13; the older
`umaxica-apps-edge-apex` repository on GitHub is unrelated and keeps its name). Region is configuration inside `umaxica-apps-edge-sphere`, not
a per-region repository.

## History (owner, 2026-11-12)

This repository is renamed to `umaxica-apps-edge-sphere` and keeps its Git history. Acme and press
start as copies (`git clone` of this repository, so their history up to the split is kept too) and
then delete what they do not own.

## Execution plan

Owner steps touch GitHub and Cloudflare (external writes); Codex steps are local and end without a
commit. Each phase ends with a review by Claude before the next one starts.

0. **Freeze (owner).** Commit or stash open work on `feature`, merge to `main`, push. Record the
   source commit hash; both copies start from it.
1. **Create the copies (owner).** Create empty GitHub repositories `umaxica-apps-edge-acme` and
   `umaxica-apps-edge-press`; clone this repository into each local folder, set the new `origin`,
   push `main`. Rename this repository on GitHub to `umaxica-apps-edge-sphere` and update the local
   folder and `origin` URL (GitHub redirects the old name).
2. **Prune each repository (Codex, one repository per run, in parallel allowed).** Work order below.
3. **Cloudflare (owner, later).** Worker names, routes and secrets stay as they are until each
   repository deploys green; then remove the old deploy paths from the repositories that no longer
   own them. No Worker is renamed in this plan.
4. **Close.** Archive this plan to `plans/archive/` in sphere; record the split commit hashes in
   `evidence/` of each repository.

### Ownership after the split

| Path in this repository                     | acme   | sphere | press |
| ------------------------------------------- | ------ | ------ | ----- |
| `{app,com,org,dev,net}/apex`                | keep   | delete | delete |
| `{app,org}/core`                            | delete | keep   | delete |
| `com/core`                                  | delete | delete (retired) | delete |
| `{app,com,org}/{docs,help,info,news}`       | delete | delete | keep  |
| `all/busy`                                  | delete | keep until unneeded | delete |
| `tools/vpc-probe`                           | delete | keep   | delete |
| other `tools/`, `scripts/`, `test/`, `e2e/` | keep only what references kept packages | same | same |
| `adr/`, `docs/`, `research/`, `specs/`      | keep what concerns kept packages; mark others superseded or delete | same | same |

Paths not listed are resolved by the same rule: keep what a kept package uses.

### Codex work order (run once per repository, replace `<REPO>` and the keep-list)

```
Repository: <REPO> (umaxica-apps-edge-acme | -sphere | -press), freshly copied from
umaxica-apps-edge at commit <SOURCE_SHA>. Read AGENTS.md first.
Goal: this repository owns only <KEEP-LIST from the ownership table in
plans/2026-11-12-split-edge-into-three-repositories.md>. Delete everything else.

1. Delete the packages, workspace entries (pnpm-workspace.yaml), root package.json scripts,
   tools, tests, e2e, CI jobs, lefthook entries, dependency-cruiser paths, cspell words and
   syncpack groups that only serve deleted packages. Regenerate pnpm-lock.yaml.
2. Rename the root package to "<REPO>"; update README.md, AGENTS.md, CONTRIBUTING.md and
   compose/Containerfile names to the new repository. Keep Node 26 LTS and pnpm 12 (latest).
3. Adopt Vite+ (vp) for the kept packages following umaxica-apps-edge-jump's setup. If a
   package cannot build with vp, stop that package and report; do not add a non-Vite tool.
4. Docs: keep ADRs and docs that concern kept packages. For deleted scope, delete the doc, or
   mark the ADR "Superseded: moved to <other repo>" if other kept docs link to it.
5. Sphere only: keep region as an explicit configuration dimension (Core <-> Sphere is n:n
   by region); do not hard-code a single backend. Do not carry com/core.
6. Do not change wrangler Worker names, routes, bindings, rate-limit namespaces or secrets.
   Do not run wrangler deploy, secret or any remote command. Do not print secret values.
7. Verify: pnpm install, format:check, lint, typecheck, knip, test, check:architecture,
   check:spelling, and a local build of every kept package. Report each result; separate
   pre-existing failures (compare with umaxica-apps-edge at <SOURCE_SHA>) from new ones.
8. Write evidence/2026-11-12-split-<repo>-XXXX.md: source SHA, deleted paths summary, kept
   packages, check results. No commit.
```

## Open

- Core Edge Workers binding to `www-jp.*` (`plans/2026-11-12-core-edge-handoff.md`) moves with the
  sphere repository.
