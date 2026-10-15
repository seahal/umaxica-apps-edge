# 2026-10-14 — app/com/org apex reintroduction (ADR 027)

Base: `feature` at `739a34a9` with ~200 uncommitted working-tree changes left in
place (none reverted, stashed or committed). Retirement commit `c7f2e5ae`,
last pre-retirement tree `3077f584`.

## Method

- Each unit = current `dev/apex` working tree (tracked + untracked, no ignored
  files) + `git diff 3077f584:dev/apex 3077f584:<brand>/apex` applied with
  `--reject`; rejects (vite config, size budget path, wrangler name/ids, routes
  Hurl, one rate-limit test title) resolved by hand. `plans/` copy dropped.
- `/` changed from 301 to 302 (ADR 027 §4).
- Repository contracts: `git show c7f2e5ae` hunks for workspace, Compose, Dev
  Container, CI, scripts, eight root tests and the manifest reverse-applied with
  `--reject` (one hunk rejected: a Playwright revision test that no longer
  exists). `test/retired-apex-units.test.ts` replaced by `test/apex-units.test.ts`.
- `scripts/check-local` and `scripts/check-apex-domains` moved off the removed
  `/health.json` (they were already stale for `net/apex`).

## Results

Tracked-file checks (`check:workers`, `html-title-contract`) read the git index,
so root runs used a copy of the index (`GIT_INDEX_FILE`) with the new paths
`git add -N`; the real index was not changed.

| Command                                                                  | Result                                                                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `pnpm --dir {app,com,org}/apex run check`                                | pass, 19 files / 117 tests each (before host test add)                       |
| `pnpm --dir {app,com,org}/apex exec vitest run test/host-policy.test.ts` | pass, 5 tests each                                                           |
| `pnpm run check` (root, temp index)                                      | pass; `check-workers: OK (20 workers validated)`; root 663 passed, 1 skipped |
| `pnpm run check` (root, real index)                                      | FAIL by design: `check-workers` rejects untracked `public/*`                 |
| `pnpm --dir {app,com,org}/apex run build` + `check:size`                 | pass, 53.48–53.49 kB gzip / 59 kB                                            |
| `pnpm run build && pnpm run check:size` (temp index)                     | pass, 20 size reports                                                        |
| `pnpm run test:api`                                                      | pass, 20 units, 0 failed files                                               |
| `pnpm --dir {app,com,org}/apex run test:e2e`                             | pass, 2 tests each (chromium)                                                |

## Not done

- No Cloudflare, DNS, Tunnel or Access state read or changed. Hostnames are not
  served by these Workers; `"routes": []` everywhere.
- `scripts/deploy-edge-preview com/apex` was run once by mistake while checking
  the allowlist; it stopped at its `wrangler whoami` guard ("You are not
  authenticated"), before build or upload.
