# TanStack Service Worker offline boundary

実施日: 2026-09-15

対象: `{app,com,org}/{core,info,docs,news,help}` の15 deployment units

## 実装した契約

- SWは同一originのGET navigationだけを対象にし、通常のfetch failureだけを固定offline HTMLへ置換する。
- 404/500などHTTP responseはそのままブラウザへ渡す。JS、CSS、RPC、POST navigation、cross-origin requestは対象外にした。
- `/api`、`/web/v0`、`/edge/v0`、`/oidc`、`/sign/out`、`/.well-known`、health、metadata等の予約経路はoffline fallbackから除外した。CoreのRails-owned pathをSWが横取りしない。
- Cache Storageには認証・Preference・request nonce・アプリHTMLを保存せず、SW内の固定HTMLを`umaxica-offline-v2`の`/offline`キーへ一件だけ保存する。旧自分用cacheだけを削除し、origin上の無関係なcacheは削除しない。
- 固定HTMLは外部stylesheet、script、cookie、JWT、session、request nonceに依存せず、`no-store`、`nosniff`、`DENY`、`noindex`、CSPを返す。
- オンラインの`/offline` TanStack routeはHTTP契約のため残し、SWのcache内容とは分離した。

## TDDと検証

- red: 新しい15面のSW asset契約テストは、現行`offline-v1`・全navigation fallback・origin全cache削除実装で失敗した。
- green: 15面のVitest全suiteはpass（public各290、Core各354/354/361）。SW asset契約とpublic metadata契約も全passした。
- green: public12面の`pnpm run test:e2e`は各15 tests、Core3面は各10 testsで全pass。ChromiumでSW登録/activation、network failure fallback、HTTP 404保持、予約API navigation非介入を確認した。
- green: public12面の共有`src`/`test`/`e2e`とCore3面の同一SW sourceをhashで確認した。
- SWとroute/test/e2e変更のOxfmtを実施した。

## 実行環境と未実施

通常sandboxではWranglerのlocal bindが`EPERM`、Wrangler logが`EROFS`となったため、専用local serverを承認付きで一unitずつ起動した。途中の15面並列Vitest試行ではOSのthread/process上限によりEAGAIN/SIGABRTが発生したが、並列度を1にして全対象を再実行しpassした。

実Rails、production Cloudflare、実workerd bindingは使用していない。初回訪問から完全offlineになる保証は置いていない。
