# Apex request boundary — 2026-09-15

P2を、Rails参照を必要としないapex 5面のP2aへ分割して実装した。
対象は `app/apex`、`com/apex`、`org/apex`、`net/apex`、`dev/apex`。
P2のHost allowlist、Core、public frame、TanStack入口はこの工程に含めていない。

## 実装

- 固定版Honoの `requestId({ limitLength: 0 })` でrequestごとに新しいIDを生成し、
  外部 `X-Request-ID` を採用しないようにした。
- Honoの一部apex handlerがbare `Response`を返すため、response collectionをhandler前に
  初期化して、最終レスポンスにも生成IDを引き継ぐようにした。
- loggerの入力型を閉じ、service、環境、method、固定route ID、request ID、最終status、
  duration、粗いoutcomeだけを出力するようにした。raw path、query、header、body、例外名・
  message・stackは出力しない。
- `app.onError` の直接console出力を削除し、sanctioned structured loggerのerror hookだけで
  最終statusを記録するようにした。unexpected errorの一件につき一行であることをVitestで固定した。
- 正常と404の実HTTP応答で `X-Request-ID` の形式をHurlで確認した。

## TDDで判明したことと修正

- 新しいHurl assertionの初回実行は、Hurlがregex末尾の`i` flagを受け付けずparse errorになった。
  Hurlの固定文法へ修正した。
- 次の実HTTP実行ではIDがない応答が見つかった。Hono標準middlewareはcontextへIDを設定するが、
  bare `Response`の置換時にprepared headerが落ちるため、handler前にresponse collectionを
  生成する実装へ変更した。
- その実装のVitestでは、bare `app.request()`のtest環境にbindingがないためloggerの直接
  `c.env`参照が18件の既存境界を500へ変えた。runtime guardを加え、全件greenへ戻した。

## 最終検証

- 各apexの `pnpm run test`: app/com/orgは各100 tests、net/devは各81 testsでPASS。
- 各apexの専用portをrunnerが起動した `pnpm run test:api`: app/com/orgは各78 requests、
  net/devは各77 requestsで全ファイルPASS。既存サーバーへは接続していない。
- 各apexの `format:check`、`lint`、`lint:types`、`knip`、Wrangler型生成を含む`typecheck`: PASS。
- 各apexのproduction `build` と `check:size`: PASS。gzip後Worker bundleは47.41〜47.51 kBで、
  各unitの52 kB budget内。
- `git diff --check`: PASS。

ブラウザ、Cloudflare、VPC、Rails、remote GitHubは使用・変更していない。Rails参照コピーが
この環境にないため、Preference、TanStack `lx`、SEO、Core JWT、Core/publicの入口境界は保留した。
独立した別agent reviewerは利用できず、本工程のレビューは差分と実行結果による自己レビューである。
