# OpenNext/ISR/Rails binding 方針の適応プラン

## Context

ChatGPT との会話で決めた方針(公開系 surface は ISR 前提、Rails VPC binding を 12 content surface へ先行付与、wrangler.jsonc 共通化、manifest + CI 検査など)を、このリポジトリに適応するかの調査・評価・実行プラン。

## 調査結果(現状)

- **項目 1,2,4,5,6,11,12 はほぼ導入済み**: 全 OpenNext アプリの `wrangler.jsonc` に `nodejs_compat` + `global_fetch_strictly_public`、`ASSETS`、`WORKER_SELF_REFERENCE`、`IMAGES` binding、`public/_headers`(immutable 静的アセット)、`cf-typegen`/`preview`/`deploy` スクリプトが既にある。提案の「共通の wrangler.jsonc」は概ね現状追認。
- **Rails 接続**: `*/core` 3 アプリのみ。binding 名は `UMAXICA_APPS_EDGE_CF_WORKERS_VPC`(提案の `RAILS_ORIGIN` とは別名)、`env.development`/`env.production` 配下に同一 `service_id` で宣言。アクセスは各 core の `src/lib/rails-client.ts`(getCloudflareContext 経由、ヘッダ剥離・パス検証・no-store 付き)で既に薄い adapter 化されている。
- **ISR**: `revalidate` / `dynamic` / `force-static` の使用ゼロ。`open-next.config.ts` は全アプリ `defineCloudflareConfig({})` で Incremental Cache / Queue / Tag Cache 一切なし。
- **重要な矛盾**: 全 `next.config.ts` に `cacheComponents: true`(Next 16 Cache Components)。このモードでは提案の `export const revalidate = 300` / `fetch(..., { next: { revalidate } })` という route segment ベースの ISR 契約はそのまま使えない — キャッシュは `'use cache'` + `cacheLife()` で表現する世界。ChatGPT 案はこの前提を見ていない。
- **CI**: `.github/workflows/integration.yaml` の build matrix は core/apex/dev のみで、**docs/help/info/news 12 アプリはビルド検査対象外**。wrangler 設定の検査や worker manifest は存在しない。
- **CLAUDE.md 制約**: shared モジュール禁止・フレーム間重複は意図的。提案の「共通 adapter」はリポジトリ横断の共有コードにはできず、フレームごとに複製する形になる(core は既にそうなっている)。

## 評価

1. **賛成(採用)**: manifest + CI 検査、公開系を ISR(キャッシュされた静的コンテンツ)前提にする方向性、R2/Queue/Tag Cache を保留にして production readiness 項目として残す判断、環境変数の役割固定。
2. **修正して採用**: ISR の契約は `export const revalidate` ではなく、`cacheComponents` 前提の `'use cache'` + `cacheLife`(または cacheComponents を切る判断)に置き換える必要がある。どちらにせよ**書き込み可能な Incremental Cache(R2)が無い限り本番で永続キャッシュは効かない**点は提案どおり。
3. **反対(不採用)**: 12 content surface への Rails binding **先行**付与。提案自身が「使わないが念のため binding だけ付与するは避ける。binding は capability」と書いており、Rails を fetch していない surface への先行付与はこの原則と自己矛盾。実際に Rails からコンテンツを取る実装が入るタイミングで、core の `rails-client.ts` パターンをそのフレームに複製して同時に binding を足すのが正しい。
4. **軽微な指摘**: binding 名は既存の `UMAXICA_APPS_EDGE_CF_WORKERS_VPC` を維持(改名はチャーンのみ)。dev/prod で同一 `service_id` + `remote: true` はローカルから本番 Rails に届く構成なので、環境別 VPC Service 分離は将来課題として manifest のチェック項目に記載。提案の `compatibility_date: 2026-07-17` は未来日付で不採用(現行 2026-05-13 を維持)。

## 実行内容

### 1. Worker manifest + 検査スクリプト(新規)

- `tools/workers-manifest.ts`(または `.json`): 全 worker を `railsBacked`(現時点は core 3 つ)/ `contentSurface`(docs/news/help/info 12)/ `standalone`(apex 4)/ `external`(dev/*)に分類。
- `tools/check-workers.mjs`: 各 `wrangler.jsonc` を読み、
  - railsBacked → `vpc_services` に `UMAXICA_APPS_EDGE_CF_WORKERS_VPC` があること
  - standalone/contentSurface → `vpc_services` が無いこと
  - 全 OpenNext → `nodejs_compat`、`ASSETS`、`WORKER_SELF_REFERENCE`、`IMAGES`、`_headers` 存在
- root `package.json` に `check:workers` script を追加。

### 2. CI 強化(`.github/workflows/integration.yaml`)

- build matrix に docs/help/info/news ×3 を追加(`opennextjs-cloudflare build` が通ることを担保)。
- `check:workers` を lint 系ジョブに追加。

### 3. ISR 準備(コード契約のみ、キャッシュ実体は保留)

- 決定を文書化: `docs/`(リポジトリ直下)or CLAUDE.md 追記で「公開系は Cache Components(`'use cache'` + `cacheLife`)でキャッシュ表現。目安 info/news 300s、help/docs 1800s。本番で効かせるには R2 Incremental Cache + Queue が必要(未導入・production readiness 項目)」を明記。
- 実ページへの `'use cache'` 適用は Rails コンテンツ取得実装と同時に行う(今回はしない)。

### 4. 整合性の小修正

- core 3 アプリに `.dev.vars.example`(`NEXTJS_ENV=development`)を追加し content アプリと揃える。

## やらないこと

- 12 content surface への `vpc_services` 先行追加(capability 原則により、Rails fetch 実装時に同時追加)。
- R2 / Queue / Tag Cache の導入(保留のまま。manifest ドキュメントに未解決事項として記録)。
- binding 改名(`RAILS_ORIGIN` 化)、compatibility_date 変更、共有 adapter モジュール化(CLAUDE.md の重複意図に反する)。

## 検証

- `pnpm run check:workers` が現状構成で green になること(core=binding あり、他=なし)。
- 故意に content アプリへ `vpc_services` を足して red になることを一時的に確認。
- `pnpm run format:check && pnpm run lint:check && pnpm run typecheck && pnpm run test`。
- CI 変更は push 後の Actions 実行で確認(docs/help/info/news の build が通ること)。
