# Visual identity matrix — checks actually run

Date: 2026-09-21

Work landed in the working tree: TLD canvas wash (`--ui-tint` / `--ui-canvas` / `bg-canvas`), satellite lockup and current-nav chip, list/search/detail width carrier, twelve `test/ui-shell-contract.test.tsx` files, contract and proposal updates.

## Ran

- `pnpm --dir app/docs exec vitest run test/ui-shell-contract.test.tsx` — 7 passed
- `pnpm --dir app/docs exec vitest run test/publishing-pages.test.tsx` — 31 passed
- `pnpm --dir app/core exec vitest run test/ui-shell-contract.test.tsx` — 18 passed
- `pnpm --dir app/apex exec vitest run` — 19 files, 110 passed
- `pnpm exec vitest run --dir test publishing-cells.test.ts` — 54 passed (tint line normalised; audience map asserted)
- `pnpm --dir app/docs exec oxlint` on the edited satellite sources — 0 errors

## Not run (this record)

- `pnpm run check` (full monorepo static + unit)
- `pnpm run build && pnpm run check:size`
- `pnpm run test:api` / `pnpm run test:e2e` (Playwright smoke with 320 viewport is in tree, not executed here)
- Contrast re-measure of `gray-900` on mixed canvases

Those remain to be run before calling the change complete in CI terms.
