# Docker での開発

このディレクトリには Docker Compose を使った開発環境が用意されています。

## 前提条件

- Docker
- Docker Compose

## 利用可能なサービス

### 1. dev - 開発サーバー（Vite）

Vite の開発サーバーを起動します。HMR（Hot Module Replacement）が有効です。

```bash
docker compose up dev
```

アクセス: http://localhost:5173 または http://localhost:5174

### 2. wrangler - Cloudflare Workers ローカルプレビュー

Cloudflare Workers の環境でローカルプレビューを起動します。

```bash
docker compose --profile wrangler up wrangler
```

アクセス: http://localhost:8787

### 3. build - プロダクションビルド

プロダクション用にビルドします。

```bash
docker compose --profile build run --rm build
```

## よく使うコマンド

### 依存関係のインストール

```bash
docker compose run --rm dev bun install
```

### コマンドの実行

```bash
# 開発サーバーを起動
docker compose up dev

# バックグラウンドで起動
docker compose up -d dev

# ログを表示
docker compose logs -f dev

# コンテナを停止
docker compose down

# ビルド
docker compose --profile build run --rm build

# カスタムコマンドを実行
docker compose run --rm dev bun run <command>

# シェルに入る
docker compose run --rm dev bash
```

### ボリュームのクリーンアップ

node_modules や キャッシュをクリアしたい場合：

```bash
docker compose down -v
```

## トラブルシューティング

### 外部ネットワークに接続できない

社内ネットワークやプロキシ環境では、ホストの proxy 環境変数を Compose に引き継ぐ必要があります。
このリポジトリでは `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY`（大文字・小文字）を
コンテナに渡す設定を入れています。

確認手順:

```bash
# ホスト側
env | grep -Ei 'http_proxy|https_proxy|no_proxy|all_proxy'

# コンテナ側
docker compose exec dev env | grep -Ei 'http_proxy|https_proxy|no_proxy|all_proxy'
```

必要に応じて、起動前にホストで環境変数を設定してください。

### ポートが既に使用されている

ポート番号を変更する場合は、docker-compose.yml の `ports` セクションを編集してください。

```yaml
ports:
  - '3000:5173' # ホスト側のポートを 3000 に変更
```

### 依存関係が見つからない

```bash
docker compose run --rm dev bun install
```

### コンテナを再ビルド

Dockerfile や依存関係を大幅に変更した場合：

```bash
docker compose build --no-cache
docker compose up dev
```

## 開発ワークフロー

1. 依存関係をインストール:

   ```bash
   docker compose run --rm dev bun install
   ```

2. 開発サーバーを起動:

   ```bash
   docker compose up dev
   ```

3. ブラウザで http://localhost:5173 を開く

4. コードを編集すると自動的にリロードされます

5. プロダクションビルド:

   ```bash
   docker compose --profile build run --rm build
   ```

6. Cloudflare Workers でプレビュー:
   ```bash
   docker compose --profile wrangler up wrangler
   ```
