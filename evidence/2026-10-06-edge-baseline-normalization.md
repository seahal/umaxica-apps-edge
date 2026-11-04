# Edge baseline normalization: Workers Cache off, one observability policy, 429 locale

Date: 2026-10-06. Branch `develop`, working tree (uncommitted). Nothing was
deployed; every result below is local.

## What was checked

| Check                                                      | Command                                          | Result                                 |
| ---------------------------------------------------------- | ------------------------------------------------ | -------------------------------------- |
| Workers config guard                                       | `pnpm run check:workers`                         | OK, 17 workers validated               |
| Guard fails before the change                              | same, with the guard added and configs untouched | FAIL, 48 failure lines                 |
| Lint, types, generated, knip, deps, architecture, spelling | `pnpm run check:static`                          | exit 0                                 |
| Unit + repository tests                                    | `pnpm run test`                                  | exit 0, 17 units + 20 repository files |
| Build                                                      | `pnpm run build`                                 | exit 0, 17 units                       |
| Bundle budget                                              | `pnpm run check:size`                            | exit 0                                 |
| HTTP contract + isolation canary                           | `pnpm run test:api`                              | exit 0, 32 Hurl passes, 0 failed files |
| Deploy validation                                          | `wrangler deploy --dry-run` in `app/docs`        | config accepted, bindings listed       |

The red run was not broken down by cause; it is recorded only as proof that the
guard failed before the configuration changed.

## Generated configuration, read back from `dist/` after `pnpm run build`

Counted over all 17 output `wrangler.json` files:

- `observability` deep-equal to the repository policy (logs 100%, traces
  `head_sampling_rate: 0.2`, `issues.enabled`, `redact_query_string`, persist):
  **17/17**
- `upload_source_maps: true`: **17/17**
- `cache.enabled === false`: **12/12** public content cells; the 3 Cores and 2
  apex Workers declare no `cache` key (5/5), as before
- `.map` files under `dist/client`: **0** across all units
- Worker output directory contains at least one `.map`: **17/17**

Wrangler 4.147.0 was read to confirm the keys rather than assumed:
`observability.issues.enabled`, `observability.redact_query_string`, top-level
`upload_source_maps` and `cache.enabled` are all in `config-schema.json`;
`observability`, `upload_source_maps` and `cache` are inheritable, and
`cache: { enabled: false }` is sent in the upload metadata as `cache_options`.

## 429 locale

Driven with an injected refusing limiter (no HTTP client can produce one):

- Public content (12 units, identical): `/en/…` → `lang="en"`, `/ja/…` →
  `lang="ja"`, `/` with `Accept-Language: en` → `en`, `/fr/…` and
  `/robots.txt` → `ja`. `Cache-Control: no-store`, `text/html; charset=UTF-8`,
  security headers and `X-Request-ID` present on each.
- Core (3 units): `?lx=en` → `en`; `Cookie: language=en` → `en`; `?lx=ja` with
  the cookie → `ja`; neither → `ja`.
- Apex (2 units): `?lang=ja`, `Cookie: language=ja`, `Accept-Language: ja` →
  `ja`; nothing → `en`; `/revision` (never language-negotiated) → `en`; no
  `Set-Cookie` on any of them.

`rateLimitKey()` is byte-unchanged in all 17 units, and no `namespace_id`,
`limit` or `period` line appears in the `wrangler.jsonc` diff.

## workerd isolation canary

`api/isolation/nonce-isolation.hurl` in the 15 TanStack frames, run by
`api/run.mjs` as `--repeat 50 --jobs 10` against the built Worker in workerd
(`vite preview`). It asserts the CSP header nonce equals the nonce on the
rendered document within each response. 15 units × 50 runs, 0 failures.

Not asserted, because nothing local observes it honestly:

- Request-ID AsyncLocalStorage isolation — the response header comes from a
  local variable, so a leak is invisible over HTTP. It needs a test inside the
  Worker. `@cloudflare/vitest-plugin@1.3.7` and
  `@cloudflare/vitest-pool-workers@0.22.0` both peer `vitest ^4.1.0`; this
  repository runs Vitest 5.0.3, so neither was installed.
- Rate Limiting binding semantics — the local simulator does not reproduce the
  distributed counter.
- The apex Workers have no canary: they were not checked for a per-request
  nonce in this pass.

## Dependencies

- `@tanstack/react-start` `~1.168.60`, `@tanstack/react-router` `~1.170.41`;
  the lockfile resolves the same versions as before (Start 1.168.60 depends on
  exactly Router 1.170.41).
- `vitest` and `@vitest/coverage-v8` both exact `5.0.3`; the provider's peer is
  `vitest: 5.0.3`. `peerDependencyRules` removed; `pnpm install` printed no peer
  warning and `syncpack lint` reported no issues.
- Catalog entries `astro`, `@astrojs/cloudflare`, `@astrojs/react` removed; the
  lockfile contains no `astro` string.

## Not verified

- **That `cache.enabled: false` stops cache lookups on Cloudflare.** Only the
  configuration and its upload metadata were checked. Confirm at the next
  deploy: read the Worker's settings back, and fetch an Entry detail twice.
- **Source map upload.** The maps are emitted beside the Worker modules and
  `upload_source_maps` is true; no upload was performed.
- **The Rails CSP telemetry schema.** The Rails repository was not readable
  from this workspace, so `adr/025` leaves the classification field name open.
- `pnpm run test:e2e` was not run.

## Formatting of historical records

`pnpm run format:check` failed at `HEAD` on 16 Markdown files this change did
not otherwise touch — 3 under `adr/`, 9 under `evidence/`, 4 under `plans/`.
With the owner's explicit approval they were run through `oxfmt`: whitespace
and table alignment only, no wording, number or date changed.
