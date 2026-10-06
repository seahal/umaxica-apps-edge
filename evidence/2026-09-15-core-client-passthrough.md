# Core Rails client and passthrough boundary

実施日: 2026-09-15

対象: `app/core`、`com/core`、`org/core`

## 実装した契約

- CoreのRails clientとRails-owned透過中継の外向き通信上限を2,000msに固定した。
- clientは同じAbortSignalをheader受信後のbody読み取りにも渡し、Health JSONはUTF-8 byte数で65,536 bytesに制限した。
- body readerはResponseをcloneせず、上限超過時のcancelを待って処理全体が停止しない構造にした。
- clientのtimeoutは`timeout`結果として扱い、Healthでは`unreachable`へ写像した。
- Coreの透過中継はAPI clientと分離し、Railsのstatus、`Location`、`Set-Cookie`、`Content-Type`、cache header、bodyを変更しない。POST bodyもbufferしない。
- Rails未設定・接続不能は503、外向きtimeoutは504とし、どちらもTanStack handlerへfall throughしない。
- 現行Coreのwrangler設定に`RAILS_ORIGIN`はまだなく、未設定時のfail-closedを維持した。VPC経路やInternet fallback、Rails変更は行っていない。

## TDDと検証

- red: Core 3面のbounded-readerテストは実装module追加前にmodule resolution errorとなった。実装後にgreen化した。
- red: 既存workerテストはtimeoutを503と固定していたため、504契約追加後に各Coreで1件ずつ失敗した。timeout caseのみ504へ更新し、接続不能・未設定の503回帰を維持した。
- green: `pnpm exec vitest run --maxWorkers=1` は`app/core` 354 tests、`com/core` 354 tests、`org/core` 361 testsで全pass。
- green: focused 5ファイルは各Core 126 testsで全pass。遅いheader、body途中停止、body timeout、2,000ms境界、透過中継failure分類を含む。
- green: root `pnpm exec vitest run --dir test test/core-dispatch-contract.test.ts test/rails-connection-invariants.test.ts` は205 testsで全pass。3 Core間とpublicを含むHealth実装の同一性、2,000ms契約を確認した。
- green: 各Coreの`pnpm run test:api`は7 Hurl files、34 requestsで全pass。実Railsには接続せず、専用local serverを使用した。
- green: 変更対象のOxfmt、Oxlint、type-aware Oxlint、各unitのlint、Knip、Wrangler typecheckは全passした。
- `git diff --check`を実施した。

## 未実施

production Cloudflare binding、実workerd、VPC、稼働中Rails、Chromium E2Eは実施していない。Hurlでは遅い上流を生成できないため、timeoutのheader/body境界はVitestのfake fetch・streamで検証した。
