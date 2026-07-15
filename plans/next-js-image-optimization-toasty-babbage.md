# Next.js Image / Font Optimization 導入プラン

## Context

Cloudflare Workers (OpenNext) 上の Next.js 16 マルチアプリ monorepo に、Next.js 標準の Image Optimization と Font Optimization を導入する。現状は `*/core` 3 アプリだけに自前の画像パイプライン(custom loader → `/api/image` → IMAGES binding)が存在するが UI では未使用で、OpenNext 公式のネイティブ IMAGES binding 方式と競合・二重化している。フォントは core 3 アプリのみ `next/font/google` の Inter(latin) を `className` 直付けで使用し、他 12 アプリは未設定。CSP は存在しない。

## ユーザー承認済みの設計判断

1. **画像**: 自前 custom loader / `/api/image` / `shared/cloudflare/image.ts` を撤去し、**OpenNext ネイティブの IMAGES binding 方式**(`/_next/image` が binding を使う)へ統一。
2. **フォント**: `next/font/google` の **Inter (latin のみ)** を継続し、全アプリへ展開。CSS Variable 化。日本語グリフは含めない(system-ui フォールバック)。
3. **適用範囲**: Cloudflare 全 15 アプリ(`{app,com,org}/{core,docs,help,news,info}`)。`dev/acme`(Vercel)はフォントのみ適用、画像設定は Vercel 標準のまま。
4. **remotePatterns**: 空(外部画像は全拒否)。リポジトリ内画像の static import のみ。
5. **formats**: `['image/avif', 'image/webp']`。`qualities: [75]`(Next 16 で必須)。
6. **CSP**: 最小限の `font-src 'self'` / `img-src 'self' data:` を今回追加(script-src 等のフル CSP は別作業)。
7. SVG は `dangerouslyAllowSVG` を使わない(`.svg` は自動 unoptimized)。

## 実装ステップ

### 0. Baseline(変更前に記録)

`pnpm install` → `pnpm run format:check` / `lint:check` / `typecheck` / `test` を実行し結果を記録。代表アプリで `pnpm --filter @umaxica/app-core run build`(OpenNext build)。

### 1. 共有設定モジュール(テストファースト)

- 新規 `shared/next/image-config.ts`: `images` 設定オブジェクトをエクスポート
  `{ formats: ['image/avif','image/webp'], qualities: [75], remotePatterns: [], dangerouslyAllowSVG: false, contentDispositionType: 'attachment' }`
- 新規 `shared/next/security-headers.ts`: `Content-Security-Policy: font-src 'self'; img-src 'self' data:` を返す `headers()` 用ヘルパ。
- 先に `test/`(または `shared/` 併設)へ設定値を検証するユニットテストを追加し、実装前に失敗することを確認(カバレッジ 100% 閾値があるため必須)。

### 2. フォント導入(全 16 アプリ)

- 各 `src/app/layout.tsx`: `Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' })` とし、`<html className={inter.variable}>` に付与。
- `globals.css` の `font-family` を `var(--font-sans), ui-sans-serif, system-ui, ...` に変更。
- core 3 アプリは既存 `inter.className`(body 直付け)から variable 方式へ移行。
- テスト: layout レンダリングで `--font-sans` variable クラスが `<html>` に付くことを検証。

### 3. 画像設定の統一

- 全 15 Cloudflare アプリの `next.config.ts` に `images: sharedImageConfig` と `headers()`(CSP)を適用。
- **削除**: `{app,com,org}/core/src/image-loader.ts`、`{app,com,org}/core/src/app/api/image/route.ts`、`shared/cloudflare/image.ts`、core の `loader: 'custom' / loaderFile` 設定。
- 付随整理: root `vitest.config.ts` の `shared/cloudflare/image.ts` カバレッジ除外を削除、`test/coverage-boundaries.test.ts` 等の参照を確認・更新。`ALLOWED_IMAGE_HOSTS` 参照の除去。
- wrangler の `images: { binding: "IMAGES" }` は全アプリ設定済みのため変更不要。

### 4. 検証

- `pnpm run format:check` / `lint:check` / `typecheck` / `pnpm run test`
- 代表 2 アプリ(app/core, app/docs)で production build(`opennextjs-cloudflare build`)成功を確認し、`.open-next/assets` にフォント woff2 が含まれ、HTML に fonts.googleapis.com への参照が無いことを確認。
- `wrangler dev` によるローカル preview で `/_next/image` 経路と font 配信を確認(可能な範囲で)。
- ビルド成果物サイズ・フォント合計サイズを記録し、baseline と比較。

## 主要変更ファイル(パターン)

- `shared/next/image-config.ts`, `shared/next/security-headers.ts`(新規)
- `{app,com,org}/{core,docs,help,news,info}/next.config.ts`(15 件、同一パターン)
- 全 16 アプリの `src/app/layout.tsx` と `globals.css`
- 削除: `*/core/src/image-loader.ts`, `*/core/src/app/api/image/route.ts`, `shared/cloudflare/image.ts`
- `vitest.config.ts`, `test/coverage-boundaries.test.ts`(除外・参照の整理)

## リスク / 注意

- `next/font/google` はビルド時に Google へ通信 → CI オフライン時はビルド失敗(承認済みのトレードオフ)。
- OpenNext ネイティブ方式は `minimumCacheTTL` 非対応(キャッシュは immutable/dynamic の 2 値)。static import 画像は content hash で immutable。
- Cloudflare Images 課金: unique transformation 5,000/月無料、以降 $0.50/1,000。現状 UI に画像が無いため導入直後の課金はゼロ。
- oxlint/oxfmt/tsgo/vitest の設定変更は image.ts カバレッジ除外の削除のみ(削除ファイルに対応する整理であり、事前にユーザーへ明示)。

## ロールバック

共有モジュール追加 + 各アプリ設定変更のみで、git revert で完全に戻せる。wrangler / パッケージバージョンは変更しない。
