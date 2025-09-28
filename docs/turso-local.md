# Turso / libSQL ローカル環境構築ガイド

本ドキュメントは UI Compare App の開発で使用する Turso (libSQL) データベースをローカル環境で再現する手順をまとめたものです。`docker` が利用可能であることを前提とします。

## 1. ディレクトリ構成
- `db/migrations/` : スキーマ定義 SQL ファイル。`0001_schema.sql` から順に実行します。
- `db/data/` : ローカルデータベースの永続化ディレクトリ。Docker コンテナと共有されます。

## 2. Docker Compose を利用した起動
```bash
# Turso (libSQL) サーバを起動
docker compose up turso
```

`docker compose` が使用できない場合は以下コマンドでも同様に起動できます。
```bash
docker run --rm \
  -p 8080:8080 \
  -p 5001:5001 \
  -v "$(pwd)/db/data:/var/lib/libsql" \
  -v "$(pwd)/db/migrations:/migrations" \
  ghcr.io/tursodatabase/libsql-server:latest \
  --http-listen-addr 0.0.0.0:8080 \
  --hrana-listen-addr 0.0.0.0:5001 \
  --dir /var/lib/libsql
```

- HTTP API: `http://127.0.0.1:8080`
- Hrana (libSQL) protocol: `ws://127.0.0.1:5001`
- 認証: ローカル環境ではトークン不要（空文字列でアクセス可）

## 3. マイグレーションの適用
Turso CLI (`turso` コマンド) もしくは `libsql` CLI を利用してマイグレーションを適用します。libSQL CLI を使用する例を掲載します。

```bash
# CLIのインストール (macOS Homebrew)
brew install libsql

# マイグレーション適用
for file in db/migrations/*.sql; do
  libsql execute http://127.0.0.1:8080 "$(cat "$file")"
done
```

> **メモ**: `scripts/apply-migrations.sh` を提供しているので、`libsql` CLI が導入済みであれば `DATABASE_URL` を設定して実行できます。

```bash
DATABASE_URL=${DATABASE_URL:-http://127.0.0.1:8080} ./scripts/apply-migrations.sh
```

## 4. 環境変数
`.env.example` を参考に、バックエンドから接続する際の環境変数を設定します。

```bash
TURSO_DATABASE_URL="http://127.0.0.1:8080"
TURSO_AUTH_TOKEN=""
```

Cloudflare Workers のローカル実行（Miniflare 等）では環境変数を `.env.local` や `wrangler.toml` の `[vars]` に設定してください。

## 5. トランザクションと冪等性
- 投票処理では `BEGIN IMMEDIATE` を発行して `vote_sessions` と `votes` への書き込みを同一トランザクションで行います。
- `vote_sessions` には `idempotency_key` (例: `comparisonId:userId`) を保存し、ユニーク制約で二重投票を防止します。
- 既に登録済みの場合は `ON CONFLICT(idempotency_key) DO NOTHING` で早期に処理を打ち切り、`409 Conflict` を返却する設計です。

## 6. データ初期化
開発用のサンプルデータが必要な場合は `db/migrations/0002_seed.sql` などを追加し、マイグレーションとして流してください。`.gitignore` により `db/data/` 配下の実データはリポジトリにコミットされません。

---
このガイドをベースに、ローカルでの API 実装・テストを進めてください。
