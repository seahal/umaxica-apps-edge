# shared/ 廃止 — frame 所有への移管計画

## Context

`shared/` は所有者不明の共有領域であり、frame（= pnpm workspace）間の変更独立性を損なっている。方針: 共通化ではなく所有権を優先し、`shared/` の実装を利用 frame へ複製・移管し、`shared/` を削除する。重複は許容する。

## 調査結果

### A. frame 一覧（= pnpm workspace、21 個）

| frame 群                                        | shared 依存                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `{app,com,net,org}/apex` (Hono)                 | `shared/apex/*`(create-apex-app, seo, brand, security-headers の型)             |
| `{app,com,org}/core` (Next.js)                  | `shared/next/*`, `shared/cloudflare/{rails-client,rails-health,health-request}` |
| `{app,com,org}/{docs,news,help,info}` (Next.js) | `shared/next/{image-config,security-headers}`(next.config.ts のみ)              |
| `dev/acme`, `dev/apex`                          | **shared 依存なし**                                                             |

- frame 間の直接 import: **ゼロ**(既に達成済み)
- `shared/` は workspace ではない。package.json なし、path alias なし、全て深い相対 import(`../../../shared/...`)
- root `tsconfig.json` は `shared/**` を **exclude** — shared は typecheck 対象外(vitest でのみ実行される)
- barrel / re-export: なし
- "use client" / React context / frame 名分岐: なし。差異は env binding と routes callback で注入

### B. shared inventory

| ファイル                                                                         | 種別               | 利用 frame                 | 移管先                                           | 備考                                                                    |
| -------------------------------------------------------------------------------- | ------------------ | -------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `apex/create-apex-app.ts`                                                        | Hono factory       | 4 apex                     | 各 apex に複製                                   | csrf/health-page/rate-limit/renderer/security-headers/seo を内部 import |
| `apex/{csrf,health-page,rate-limit,inline-style,title}.ts`                       | middleware/util    | (transitive) 4 apex        | 各 apex に複製                                   | 直接 import する frame なし                                             |
| `apex/renderer.tsx`                                                              | Hono JSX renderer  | 4 apex + net テスト        | 各 apex に複製                                   |                                                                         |
| `apex/seo.tsx`, `apex/brand.ts`, `apex/security-headers.ts`                      | util/型            | 4 apex                     | 各 apex に複製                                   |                                                                         |
| `next/image-config.ts`                                                           | Next config 値     | 12 Next frame              | 各 frame の next.config.ts 側に複製              | 17 行の定数                                                             |
| `next/security-headers.ts`                                                       | Next headers 値    | 12 Next frame              | 同上                                             | 23 行                                                                   |
| `cloudflare/rails-client.ts`                                                     | API client         | 3 core                     | 各 core の `src/lib/` に複製                     | 各 core に既に wrapper `src/lib/rails-client.ts` あり                   |
| `cloudflare/rails-health.ts`                                                     | API client         | 3 core                     | 各 core に複製                                   |                                                                         |
| `cloudflare/health-request.ts`                                                   | util               | 3 core (worker.ts)         | 各 core に複製                                   |                                                                         |
| `cloudflare/secrets-store.ts`                                                    | util               | **なし(dead)**             | 削除                                             | 自テストのみ                                                            |
| `web/jit-url.ts`                                                                 | util               | **なし(dead)**             | 削除                                             | 各 core に既に同一実装 `src/lib/jit-url.ts` が存在(複製済み)            |
| `CookieConsentBanner.tsx`, `consentState.ts`, `cookie.ts`, `cookieConsentApi.ts` | HTML string / util | **なし(dead)**             | 削除(要確認)                                     | どの frame からも未使用。参照する client script も repo に存在しない    |
| 各 `*.test.ts(x)`                                                                | test               | —                          | 実装と共に各 frame の `test/` へ複製、または削除 |                                                                         |
| `test/coverage-boundaries.test.ts` (root)                                        | test               | shared 数ファイルを import | 書き換え                                         | coverage 100% 閾値を満たすための補完テスト                              |

### C. 危険な共有(優先度順)

1. `apex/create-apex-app.ts` — 4 frame の HTTP パイプライン全体を単一実装が握る。1 frame の要件変更(例: net だけ locale 追加)が他 3 frame に波及する構造。
2. `apex/brand.ts` と `apex/title.ts` — ブランド名解決の実装が 2 系統併存(`'UMAXICA'` vs `'Umaxica'`)。既に共有内で意味が割れている。
3. dead code 群(cookie-consent、jit-url、secrets-store)— coverage 100% 制約のためだけにテストが存在。

### 補足

- `page-content.tsx`(各 apex)には既に frame 固有実装があり、`buildApexTitle` は各 frame にローカル定義済み — 複製方針の先行事例。
- dependency-cruiser v18 が devDependencies に存在(config はほぼデフォルト、lefthook/scripts 未接続)→ boundary enforcement に利用可能。
- coverage thresholds 100%(root vitest)のため、複製したコードにはテストも複製必須。

## 確定した方針(ユーザー回答済み)

1. **shared/apex は 4 apex frame に完全複製**(CLAUDE.md の「意図的共有」記述は本移行で更新)
2. **dead code は全削除**: CookieConsentBanner.tsx / consentState.ts / cookie.ts / cookieConsentApi.ts / web/jit-url.ts / cloudflare/secrets-store.ts + 各テスト
3. **brand.ts と title.ts は複製時に各 frame で 1 系統に統合**(未使用パス削除)
4. **boundary enforcement は oxlint `no-restricted-imports`**(.oxlintrc.json 変更の許可取得済み)

## 実装手順

### Phase 1: baseline

`pnpm install` → `pnpm run format:check` / `lint:check` / `typecheck` / `test` を実行し結果を記録。既存失敗があれば変更前失敗として記録。

### Phase 2: characterization

既存 shared テスト(csrf/rate-limit/security-headers/health-page/seo/title/rails-client/rails-health/health-request/image-config/next security-headers)が挙動を捕捉済み — これらを複製先で流用する。新規追加は不要と判断するが、複製後に各 frame のテストが green であることを fail-fast で確認。

### Phase 3–5: frame 群単位の段階移行(コピー → adaptation → import 切替を frame 群ごとに完結)

**① apex 4 frame** (`app/apex`, `com/apex`, `net/apex`, `org/apex`)

- `shared/apex/{create-apex-app,csrf,health-page,rate-limit,renderer,security-headers,seo,inline-style}` を各 frame の `src/` へ複製
- brand.ts + title.ts → 各 frame で単一の frame-local 実装に統合(例: `src/title.ts`、`DEFAULT_BRAND_NAME` を一本化)。`page-content.tsx` の既存 local `buildApexTitle` と整合させる
- テスト(`csrf.test.ts`, `rate-limit.test.ts`, `security-headers.test.ts`, `health-page.test.ts`, `__tests__/{seo,title}`)を各 frame の `test/` へ複製
- `src/index.tsx`, `src/page-content.tsx`, `net/apex/test/renderer.test.tsx` の import を frame-local に切替
- 注意: coverage 100% 閾値のため、複製コードは複製テストで全パスをカバーすること

**② core 3 frame** (`app/core`, `com/core`, `org/core`)

- `shared/cloudflare/{rails-client,rails-health,health-request}` を各 frame の `src/lib/` へ複製(既存 wrapper `src/lib/rails-client.ts` と統合可)
- 対応テストを各 frame の `test/` へ複製。`app/core/test/rails-health.test.tsx` の import 切替
- `src/worker.ts`, `rails-health/page.tsx`, `rails-health/rails-health.tsx` の import 切替

**③ Next 12 frame の next.config.ts**

- `sharedImageConfig`(17 行の定数)と `imageFontSecurityHeaders`(23 行)を各 frame にローカル化。40 行程度なので next.config.ts に直接インライン化するか、frame 内 `image-config.ts` として複製
- 対応テストは各 core frame にのみ複製(docs/news/help/info はテストディレクトリの有無を確認して判断)

**④ dead code 削除**

- cookie-consent 一式・jit-url・secrets-store とテストを削除
- root `test/coverage-boundaries.test.ts` から shared import(cookie/consentState/rails-health/jit-url)を除去。rails-health のカバレッジ補完が必要なら各 core のテストへ移設

### Phase 6: shared 削除と設定クリーンアップ

- `shared/` ディレクトリ全削除
- `vitest.config.ts` の include から `'shared/**/*.test.{ts,tsx}'` を削除
- root `tsconfig.json` の `"exclude": ["shared/**/*"]` を削除
- CLAUDE.md の `shared/apex` に関する記述を frame-local 所有の説明に更新
- knip / .dependency-cruiser.cjs / lefthook.yml に shared 固有記述はなし(確認済み)

### Phase 7: boundary enforcement

- `.oxlintrc.json` に `no-restricted-imports` を追加: `**/shared/**` パターンおよび frame 間相対 import(`../../{app,com,org,net,dev}/`)を禁止
- 曖昧な共有ディレクトリ(common/base 等)の新設禁止はレビュー規約として CLAUDE.md に明記

## 検証

- Phase 1 のコマンド一式を再実行し、baseline と比較(coverage 100% 閾値を含む)
- `rg "shared/" --glob '!node_modules' --glob '!coverage' .` / `rg "@/shared" .` がゼロ件
- 代表 frame の build: `pnpm --filter app/apex run deploy --dry-run` 相当、または wrangler dev の起動確認 + `pnpm --filter app/core run build`(存在するスクリプトを package.json で確認してから実行)
- Server/Client 境界: shared には "use client" が存在しなかったため境界影響なし(確認済み)

## 残存リスク

- coverage 100% 閾値: 複製で分岐が 4 倍になるため、テスト複製漏れは即 CI 失敗になる(fail-fast として機能)
- CLAUDE.md の「shared/apex は意図的共有」という現行記述との矛盾 → 同一変更セットで更新
- 4 apex frame の意図的な同一挙動(security headers 等)は今後 frame ごとに乖離しうる — これは本方針の意図した帰結
