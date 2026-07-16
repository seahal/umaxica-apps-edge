# Fix broken CI on main/develop (format + knip only)

## Context

CI (`.github/workflows/integration.yaml`) has been red on both `main` and `develop`
(`test`, `knip`, `format` jobs failing). User has scoped this down after reviewing
findings:

- **`format`**: real, trivial issue — fix it.
- **`test` (coverage)**: confirmed via local repro that coverage sits around ~22%
  regardless of any config change (it's not specific to the three `worker.ts`
  files — reverting the earlier trial `coverage.exclude` addition made no
  difference, baseline is the same). This is a pre-existing, much larger gap
  than what CI's 77% figure suggested, and is **explicitly out of scope** —
  user said to leave it alone for now as long as the GitHub Actions YAML itself
  has no syntax/structural problems.
- **`knip`**: user wants this one actually fixed — `RangeError: Array buffer
allocation failed` inside `oxc-parser`, crashing the whole job.

This plan only covers `format` and `knip`. The Cloudflare deploy-CLI work
remains deferred to a separate session, as previously agreed.

## Diagnosis recap (run `29454446350`, main, 2026-07-15)

1. **`format` job fails** — `oxfmt --check .` flags two unformatted files:
   `plans/http-127-0-0-1-5401-fuzzy-pizza.md` and
   `plans/next-js-typescript-composed-key.md`.

2. **`knip` job fails** — crashes with `RangeError: Array buffer allocation
failed` inside `oxc-parser`. `knip.json` has no unusual config, and no
   abnormally large source file was found in the repo (checked). The `knip`
   job runs on `runs-on: ubuntu-slim` (`.github/workflows/integration.yaml:44`)
   — a constrained runner — which is the most likely trigger: a memory-hungry
   native buffer allocation inside `oxc-parser` failing under low available
   heap/memory, not a real unused-code finding.

## Fix

1. **format**: run `pnpm run format` so oxfmt rewrites the two flagged files
   in `plans/`.

2. **knip**: bump available memory for the `knip` step in
   `.github/workflows/integration.yaml` via `NODE_OPTIONS=--max-old-space-size=4096`
   on that step's `env`. Verify the `integration.yaml` YAML is otherwise
   structurally valid (job/step syntax, indentation) since the user asked to
   confirm there's no grammar issue in the workflow file itself. If the crash
   is confirmed (via a real CI run) to persist after the heap bump, the
   fallback is switching that job's `runs-on` off the `ubuntu-slim` runner to
   the standard `ubuntu-latest` runner, since `ubuntu-slim` is the most likely
   source of the memory constraint — but try the heap bump first since it's
   the smaller, more targeted change.

## Files touched

- `plans/http-127-0-0-1-5401-fuzzy-pizza.md`, `plans/next-js-typescript-composed-key.md` (reformatted only)
- `.github/workflows/integration.yaml` (knip step: add `NODE_OPTIONS` heap size env var)
- `vitest.config.ts` — revert the earlier trial edit (the `**/src/worker.ts`
  coverage-exclude addition); confirmed it doesn't move the coverage number,
  and coverage is out of scope for this fix.

## Out of scope

- Coverage/`test:cov` threshold gap (~22% vs required 100%) — left as-is per
  user instruction, as long as the workflow YAML has no syntax problems.
- The Cloudflare multi-app deploy CLI and related GitHub Actions deploy
  workflow — deferred to a separate follow-up.

## Verification

1. `pnpm run format:check` — passes (no diff).
2. `pnpm exec knip --include unlisted,unresolved,binaries` — completes without
   crashing locally (best-effort; the crash is runner-memory-specific and may
   not reproduce locally, so the real confirmation is a green `knip` job in
   CI).
3. Sanity-check `.github/workflows/integration.yaml` parses as valid YAML
   (e.g. `yq` or `python -c "import yaml,sys; yaml.safe_load(open(...))"`) and
   the `knip` job's structure (indentation, `env:` block) is correct.
4. `git diff vitest.config.ts` — confirm it's back to the original (no
   coverage-related change committed).
5. Push and confirm the `CI` GitHub Actions workflow's `format` and `knip`
   jobs go green on the branch (`gh run list` / `gh run view` on the new run);
   `test` job is expected to still fail on coverage, which is expected/accepted.
