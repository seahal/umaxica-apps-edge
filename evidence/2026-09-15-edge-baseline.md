# Edge baseline — 2026-09-15

作業rootは `/home/edge/workspace`、branchは `develop`、HEADは
`3bc0edbed69ffb6548d23b8aeba78913df0c08a3`。baseline取得前に
`pnpm install --frozen-lockfile` を実行し、成功した。

## 実行結果

- `pnpm run check`: 既存FAIL。最初のformat:checkで、無視対象のAstro生成物
  `app/{docs,help,info,news}/.astro/*` にformat差分があり停止。
- `pnpm run check:architecture`: PASS。dependency-cruiserは29 modules / 51 deps。
- `pnpm run check:deps`: PASS。
- `pnpm run check:spelling`: 既存FAIL。12 Hurlのpublic-id fixture markerと
  `scripts/check-ai-tools`のsandbox tool tokenの合計16件。
- `pnpm run test`: 20 unit suiteはPASS。root invariantは622 passed / 1 skipped / 1 failedで、
  `test/dependency-architecture-invariants.test.ts`のdepcruise spawnが`EPERM`。
  同じ検査を直接実行する`pnpm run check:architecture`はPASS。

この記録は変更前に実行した結果だけを示す。未実行のAPI、browser、build、VPC、Rails統合は
成功扱いにしていない。
