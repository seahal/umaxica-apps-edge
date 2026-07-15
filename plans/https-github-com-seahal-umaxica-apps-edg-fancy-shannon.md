# umaxica-apps-edge-apex 統合計画

## Context

apex ドメイン (`umaxica.{com,app,org,net}` のルート) を扱う Hono ワーカー群は、
「Hono と Next.js を混ぜたくない」という理由で別リポジトリ
(https://github.com/seahal/umaxica-apps-edge-apex) に分離されていたが、今回このリポジトリに
再統合する。方針は **Next.js に吸収しない**。`app/apex` のような独立ワークスペースとして
Hono ワーカーを復活させる。

git 履歴の調査でかつての仕組みが判明した:

- コミット `461d48c` (2026-05-28) 以前は、まさに `app/apex, com/apex, org/apex, net/apex,
dev/apex` + `shared/apex/*` がこのリポジトリに存在し、`app/core` 等と**共存していた**
  (pnpm-workspace.yaml に apex と core が両方登録)。
- ドメイン分担は「apex = ルートドメイン (`umaxica.app`)、core = 地域サブドメイン
  (`jp.umaxica.app` / `us.umaxica.app` へ 301 リダイレクト)」。ユーザー確認済み。
  ドメイン衝突はそもそも無い。
- `461d48c` で apex 一式が削除され、別リポジトリ化された (今回それを戻す)。
- apex リポジトリ側はその後も開発が続いており (最終 push 2026-06-15)、
  `createApexApp` ファクトリ復活・Rails ヘルスチェック統合 (ADR 001)・
  `/health.json` 契約 (Pulsetic 監視) 等が**このリポジトリの旧履歴より新しい**。
  → **移植元は apex リポジトリの main を正とする** (git 履歴からの復元ではなく)。

## 統合方針

apex リポジトリの `{app,com,org,net}` + `shared/` を、本リポジトリの
`{app,com,org,net}/apex` + `shared/apex/` として取り込む。`dev/apex` は apex リポジトリ側で
「実装後に不要と判断され削除済み」(ADR 002 の Note on Deletion) のため**対象外**
(umaxica.dev は既存の `dev/acme` / Vercel のまま)。

### 主な変更

1. **ワークスペース追加** — apex repo の `com`→`com/apex`、`app`→`app/apex`、
   `org`→`org/apex`、`net`→`net/apex` にコピー。`shared/` → `shared/apex/`
   (既存 `shared/` の cookie-consent, next/ 等とは併存、import パスを書き換え)。
   `pnpm-workspace.yaml` の packages に 4 件追加。`net/*` は本リポジトリ初のドメイン
   ファミリーになる。

2. **vp (Vite+) の除去** — ユーザー決定: vp は不採用。apex repo の package.json スクリプト
   (`vp exec wrangler ...` 等) を本リポジトリ流の直接呼び出しに書き換える:
   - `dev`: `wrangler dev --config wrangler.jsonc --env development`(既存 core 系の流儀に合わせる)
   - `deploy` / `deploy:upload` / `deploy:promote`: `wrangler deploy` 等を直接
   - `typecheck`: `tsgo --noEmit`
   - テストは root の vitest に統合 (`vitest run`)。apex repo は
     `vite-plus/test` から import している箇所があれば `vitest` に戻す。
   - root `package.json` の `typecheck` フィルタ列挙に 4 ワークスペースを追加。

3. **依存関係** — root もしくは各 apex ワークスペースに `hono@^4` を追加
   (catalog に載せるのが本リポジトリ流)。`vite-plus` / `@voidzero-dev/*` catalog エントリは
   持ち込まない。

4. **wrangler.jsonc はほぼそのまま移植** — Worker 名 `umaxica-apps-edge-apex-{com,app,org,net}`
   は Cloudflare 上で稼働中のデプロイ済みワーカー名なので**変更しない** (リネームすると
   ドメインバインディング・デプロイ履歴が切れる)。KV (`BREAKER_KV`) / Ratelimit
   namespace ID もそのまま (同一 Cloudflare アカウント前提 — 要確認事項 §)。

5. **Dev ポート** — 旧構成どおり apex は x01 番: `com/apex`=5101, `net/apex`=5201,
   `org/apex`=5301, `app/apex`=5401。README / CLAUDE.md のワークスペース表に追記。

6. **CI** — `.github/workflows/integration.yaml` の build matrix に apex 4 件を追加。
   apex は OpenNext ビルド不要 (wrangler が直接バンドル) なので、build ステップは
   `wrangler deploy --dry-run --outdir dist` 相当にする (apex repo の `build` スクリプトと同じ)。
   ※ 過去に「存在しない apex ターゲットを参照する dead CI job」が残って清掃された経緯が
   あるので、matrix とワークスペースの整合を必ず取る。

7. **lint/format/tsgo 設定** — 本リポジトリの `.oxlintrc.json` / `.oxfmtrc.json` を正とし、
   apex repo 側の設定は持ち込まない (CLAUDE.md の「設定変更禁止」原則)。apex コードが
   本リポジトリの oxlint ルールで落ちる場合はコード側を直す。tsconfig は apex repo の
   各 workspace tsconfig を持ち込み、root tsconfig との整合だけ確認。

8. **ドキュメント** — README / CLAUDE.md のワークスペース表・ドメイン表を更新
   (`umaxica.net` ファミリー追加を含む)。apex repo の ADR (001–003) を本リポジトリの
   `adr/` に取り込む (履歴保全)。

### 発見した不整合 (統合時に直すべき)

- `app/core/wrangler.jsonc` の production `NEXT_PUBLIC_APP_URL` が `https://umaxica.app` に
  なっているが、ユーザー確認によれば core は `{jp,en,...}.umaxica.app` のはず。
  com/org/core も同様の可能性。統合と同時に正しい地域サブドメイン URL へ修正するか、
  別課題として issue 化する (ユーザーのワークフロー的には issue 化が良さそう)。
- apex repo の `com/src/index.tsx` は `createApexApp` を使っており、ADR 003
  (direct composition 化, Completed) と食い違う。apex repo の**現行コードをそのまま正**とし、
  ADR は歴史記録として取り込むだけにする。

## 未確認事項 (実装前に要回答)

1. apex リポジトリと本リポジトリは同じ Cloudflare アカウントか (KV/Ratelimit ID・
   Worker 名をそのまま使ってよいか)。→ Yes なら wrangler.jsonc 無変更で移植。
2. `net/apex` (umaxica.net) も今回のスコープに含める認識でよいか
   (ユーザーの列挙 `{com,org,dev,net,app}/apex` に含まれていたので含める前提)。
   `dev/apex` は apex repo 側で削除済みなので対象外の認識でよいか。
3. 統合完了後、apex リポジトリはアーカイブする想定か (デプロイの二重管理防止)。

## 実装ステップ

1. apex repo を clone し、`{com,app,org,net}` → `{com,app,org,net}/apex`、
   `shared/` → `shared/apex/` にコピー。import パス (`../../shared/...` →
   `../../shared/apex/...`) を修正。
2. 各 `package.json` から vp を除去し pnpm/wrangler/tsgo 直接呼び出しに書き換え。
   名前は `umaxica-apps-edge-{com,app,org,net}-apex` 等 workspace 名の慣例に合わせる
   (※ wrangler.jsonc の Worker 名は既存デプロイ名のまま)。
3. `pnpm-workspace.yaml` (packages + catalog に hono)、root `package.json`
   (typecheck フィルタ) を更新し `pnpm install`。
4. vitest がテストを拾うことを確認 (`<workspace>/test/` 配置は既存規約と同一)。
   `vite-plus/test` import があれば `vitest` に置換。
5. `pnpm run format:check && pnpm run lint:check && pnpm run typecheck && pnpm run test`
   を全て通す。
6. CI matrix・README・CLAUDE.md・ADR 取り込みを更新。
7. 動作確認: `pnpm --filter <apex ws> run dev` で 5101/5201/5301/5401 を起動し、
   `/` (301 → jp.サブドメイン)、`/health`, `/health.json`, `/about`, 404 fallback を curl で確認。

## 検証

- Lefthook pre-commit (format/lint/typecheck/test/gitleaks) が通ること
- 各 apex dev サーバーで `/health.json` が Pulsetic 契約
  `{status:"OK", service, version, edge:"cloudflare", time}` を返すこと
- `wrangler deploy --dry-run` が 4 ワークスペースとも成功すること (CI build 相当)
