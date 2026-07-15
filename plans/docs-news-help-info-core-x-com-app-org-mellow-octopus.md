# {core,docs,news,help,info} × {com,app,org} の15ワークスペース整備

## Context

15箇所の Next.js ワークスペースの存在確認を行ったところ:

- **完備 (6)**: `{com,app,org}/{core,docs}` — package.json / next.config.ts / src / tsconfig / wrangler.jsonc すべて有り
- **不完全 (6)**: `{com,app,org}/{news,help}` — package.json のみ(scripts・依存は定義済み)。next.config.ts, src/, tsconfig.json, wrangler.jsonc, open-next.config.ts 等が欠落
- **欠落 (3)**: `{com,app,org}/info` — フォルダ自体なし。pnpm-workspace.yaml 未登録

ユーザーの決定: info を含め全15箇所を完全な Next.js ワークスペースとして整備する。

## テンプレート

`com/docs` を雛形とする(完全な OpenNext + Cloudflare Workers 構成)。各ワークスペースに置くファイル:

- `next.config.ts` — `com/docs/next.config.ts` と同一(汎用)
- `open-next.config.ts` — 同一
- `tsconfig.json` — 同一(`../../tsconfig.json` を extends)
- `.gitignore` — 同一
- `.dev.vars.example` — `NEXTJS_ENV=development`
- `src/app/layout.tsx` / `page.tsx` / `style.css` — docs 版をコピーし、タイトル・文言をワークスペース名に置換(例: "UMAXICA News", "UMAXICA Help", "UMAXICA Info")
- `public/_headers` — docs 版をコピー
- `wrangler.jsonc` — docs 版をベースに、`name` を `umaxica-apps-edge-<tld>-<sub>`、`WORKER_SELF_REFERENCE.service` を同名に、`NEXT_PUBLIC_APP_URL` を dev: `http://<tld>.localhost:<port>` / prod: `https://<sub>.umaxica.<tld>` に置換

## 作業内容

### 1. news/help ×6 の補完

対象: `com/news` `com/help` `app/news` `app/help` `org/news` `org/help`
package.json は既存のものをそのまま使用(scripts/deps 定義済み)。上記テンプレートファイルを追加するのみ。

### 2. info ×3 の新規作成

対象: `com/info` `app/info` `org/info`

- `package.json` を `com/news` 等と同パターンで新規作成。name: `umaxica-apps-edge-<tld>-info`
- Dev ポートは既存規則 (core=x02, docs=x06, news=x07, help=x08) に従い **info=x09**: com=5109, app=5409, org=5309
- テンプレートファイル一式を配置

### 3. ワークスペース登録

- `pnpm-workspace.yaml` の `packages:` に `app/info`, `com/info`, `org/info` を追加(アルファベット順を維持)
- `pnpm install` を実行

### 4. ドキュメント更新

- `CLAUDE.md` のワークスペース表に info ×3 行を追加 (info.umaxica.{com,app,org}, ポート 5109/5409/5309)

## 検証

- `pnpm install` が成功し、info ×3 がワークスペースとして認識されること (`pnpm -r ls --depth -1` 等)
- `pnpm run format:check` / `pnpm run lint:check` / `pnpm run typecheck` / `pnpm run test` が通ること
- 代表として `pnpm --filter umaxica-apps-edge-com-info run build:next` (next build) が成功すること
- 15箇所すべてに package.json + next.config.ts + src/ が揃っていることを再確認

## 注意

- oxlint / oxfmt / tsgo / vitest の設定ファイルは変更しない(CLAUDE.md の制約)
- 未コミットの変更(worker.ts 追加、wrangler.jsonc 変更など)が既にあるため、それらには触れない
