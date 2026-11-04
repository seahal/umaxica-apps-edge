# TanStack Start 1.168.60 → 1.169.1 (stable) upgrade

Date: 2026-10-14. Branch `feature`, on top of uncommitted display-locale /
rate-limit work. Decision record: `adr/026-tanstack-start-stable-caret-range.md`.

## Resolved versions

| Package                       | Before         | After          |
| ----------------------------- | -------------- | -------------- |
| `@tanstack/react-start`       | 1.168.60 (`~`) | 1.169.1 (`^`)  |
| `@tanstack/react-router`      | 1.170.41 (`~`) | 1.170.44 (`^`) |
| `@tanstack/start-server-core` | 1.169.39       | 1.169.42       |

`pnpm install`: +14 −16 packages. The lockfile has one resolved version of each
of Router and Start.

## Baseline before the upgrade

`pnpm run check` exit 0. The root invariant suite ran 643 passed, 1 skipped.

## Malformed percent-encoded path

Probed with `curl -i --path-as-is` against `vite dev` (`app/info` :5403,
`app/core` :5405), paths `/%E0%A4%A` and `/en/%E0%A4%A`.

| Version / entry               | `app/info`                                                        | `app/core`                |
| ----------------------------- | ----------------------------------------------------------------- | ------------------------- |
| 1.168.60, `createServerEntry` | 400, CSP + HSTS + nosniff + `x-request-id`, `edge_request` logged | 400, same headers, logged |
| 1.169.1, `createServerEntry`  | 400 with none of those headers, nothing logged                    | 400, same headers, logged |
| 1.169.1, plain `{ fetch }`    | 400 with headers, asserted by `api/malformed-path.hurl`           | unchanged                 |

Source of the bare 400: `@tanstack/start-server-core@1.169.42`
`dist/esm/internal-request-response.js`. It returns `new Response(null, { status:
400 })` when `pathname.includes("%")` and the decode fails.

The third row was checked through Hurl only, not curl. The Hurl file was not run
against the `createServerEntry` build. Its expected failure there comes from
the curl observation in the second row.

## After the upgrade and the entry change

- `pnpm run check`: exit 0. Root invariant suite: 645 passed, 1 skipped; the new
  `test/tanstack-router-single-version.test.ts` passes. Its matcher was also run
  against a lockfile copy with a second Router version injected, and it listed
  both versions.
- `pnpm run build`: exit 0, all seventeen units.
- `pnpm run check:size`: exit 0. Satellites 121.18–121.2 kB gzipped and Cores
  129.15–132.24 kB, against a 150 kB limit. Apexes 53.5 kB against 59 kB.
- `pnpm run test:api`: exit 0. All 32 Hurl runs report `Failed files: 0`.
  `malformed-path.hurl` succeeded in all twelve cells.
- `src/routeTree.gen.ts`: no diff in any frame.

## Not done

- No deployment and no `vite preview` run; dev server only.
- No Playwright (`test:e2e`).
- No live Rails or Workers VPC.
