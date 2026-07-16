# 公開系 surface のキャッシュ / ISR 方針

## 決定(2026-07-16)

- 公開系 surface(`{app,com,org}/{docs,news,help,info}` の 12 アプリ)は、完全 SSG ではなく **キャッシュされた動的レンダリング(ISR 相当)** を前提とする。
- 全 Next.js アプリで `cacheComponents: true`(Next 16 Cache Components)が有効なため、キャッシュ契約は route segment の `export const revalidate` **ではなく** `'use cache'` + `cacheLife()` で表現する。
- `'use cache'` の実適用は、各 surface に Rails からのコンテンツ取得実装が入るタイミングで同時に行う(先行適用しない)。

## cacheLife の初期値(目安)

| Surface | revalidate 目安 |
| ------- | --------------- |
| info    | 300 秒          |
| news    | 300 秒          |
| help    | 1800 秒         |
| docs    | 1800 秒         |

将来的には publication 起点の on-demand revalidation へ移行し、この TTL は「更新通知が失敗した場合の上限」として扱う。

## 未解決事項(production readiness チェック項目)

現状、全アプリの `open-next.config.ts` は `defineCloudflareConfig({})` であり、**書き込み可能な Incremental Cache が未設定**。Workers Static Assets は読み取り専用のため再生成できず、これが解決するまで本番での永続的な ISR キャッシュは効かない。

導入時にまとめて決めること:

- **R2 Incremental Cache** の採否(KV は eventual consistency のため非推奨)
- **Queue**(time-based revalidation の多重実行制御に必要。on-demand のみなら不要)
- **Tag Cache**(on-demand revalidation 用)

参照: https://opennext.js.org/cloudflare/caching

## Rails binding の方針

- binding 名は `UMAXICA_APPS_EDGE_CF_WORKERS_VPC` を維持する。
- binding は capability であり、Rails を fetch しない worker には付与しない。content surface が Rails からコンテンツを取得する実装を入れるとき、`*/core` の `src/lib/rails-client.ts` パターンをそのフレームへ複製し、binding 追加と同時に `tools/workers-manifest.json` の分類を `railsBacked` へ移す。
- 分類と wrangler 設定の整合は `pnpm run check:workers`(CI の `check-workers` ジョブ)が検査する。
- 将来課題: 現在 development/production が同一 VPC `service_id` + `remote: true` のため、ローカル開発から本番 Rails に到達できる。環境別に VPC Service を分離し、Wrangler environment ごとに `service_id` を分けることを検討する。
