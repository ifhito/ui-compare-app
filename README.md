# UI Compare App

StackBlitz WebContainers 上で動作する UI バリアントを共有し、投票によって評価できるプラットフォームです。本リポジトリには、フロントエンド（Vite + React）とバックエンド（Cloudflare Workers + Hono）の実装に向けた仕様書や設計ドキュメントが整備されています。

## プロジェクト概要
- **目的**: UI デザイン案を手軽に公開・比較し、定量的なフィードバックを得られる環境を提供すること。
- **主な機能**
  - StackBlitz プロジェクトを最大4案まで登録し、比較ページでプレビュー
  - 人気・新着・締切間近などのフィルタで比較案件を一覧表示
  - Firebase Authentication と Cloudflare Turnstile による認証・ボット対策
  - 投票結果や推移をダッシュボードで可視化し、CSV としてエクスポート
  - StackBlitz Webhook によるプロジェクト更新検知とメタデータの再取得

## アーキテクチャ概要
- **フロントエンド**: Vite + React を Cloudflare Pages にデプロイ。StackBlitz のプレビューを iframe で分離し、OpenAPI 仕様から生成した型を利用。
- **バックエンド**: Cloudflare Workers 上で Hono を動作させ、DDD（domain/application/infrastructure/interfaces）構成でユースケースを実装。TursoDB を利用して比較・バリアント・投票データを管理。
- **インフラ**: Cloudflare Pages / Workers、TursoDB、Firebase Authentication、Cloudflare Turnstile、StackBlitz WebContainers。CI により OpenAPI 仕様の検証と型生成を自動化予定。

## 参考ドキュメント
- `specs/product-spec.md` – ページ構成や利用フロー
- `specs/tech.spec.md` – 採用技術の一覧と理由
- `specs/frontend-spec.md` / `specs/backend-spec.md` / `specs/infrastructure-spec.md` – 各層の構築仕様
- `specs/design-tasks.md` – 実装タスクのチェックリスト
- `specs/domain-model.md`, `specs/use-cases.md`, `specs/diagrams.md` – DDD モデル、ユースケース、ERD/シーケンス図
- `specs/openapi.yaml` – API 契約（OpenAPI 3.0）
- `specs/domain-events.md` – Cloudflare Queues によるドメインイベント配送計画

## API 契約とツールチェーン
- ソース・オブ・トゥルースは `specs/openapi.yaml`
- 型生成: `pnpm generate:api`（`openapi-typescript` を想定）
- 契約検証: `spectral lint specs/openapi.yaml`、Contract Test は Schemathesis/Dredd などを利用

## 開発の進め方
1. `specs/design-tasks.md` のタスクを確認し、担当と期限を決める
2. フロントエンドは生成された API 型を利用しつつ `AGENTS.md` のコーディング規約を遵守
3. バックエンドは `specs/backend-spec.md` の DDD 指針に沿って実装
4. 仕様変更時は必ず該当する `specs/` 内のドキュメントと OpenAPI を更新

### インフラ構築
- IaC: `infra/terraform/` に Terraform 定義を格納。`terraform apply -var-file=<env>.tfvars` で Cloudflare Pages/Workers と Turso をプロビジョニング
- ローカル DB: `docker compose up turso` → `./scripts/apply-migrations.sh` で起動・マイグレーション（詳細は `docs/turso-local.md`）

## 環境構築手順

### 必要ツール
- Node.js 20 以上（`node -v` で確認）
- pnpm 10 以上
- Docker / Docker Compose（ローカル DB 用）
- Terraform 1.7 以上（IaC 適用時）
- Turso CLI (`turso`)

### 初回セットアップ
```
pnpm install             # 依存パッケージを取得
pnpm generate:api        # OpenAPI から型を生成
pnpm lint:openapi        # OpenAPI の静的検証
pnpm test                # Vitest でユーティリティのテスト実行
```

### ローカル DB の起動
```
docker compose up -d turso           # Turso (libSQL) を起動
./scripts/apply-migrations.sh        # マイグレーション適用（turso CLI が必要）
```

- 初回マイグレーションで `db/migrations/0001_schema.sql` と `0002_add_turnstile_verified.sql` が適用されます。
- 詳細は `docs/turso-local.md` を参照してください。
- Apple Silicon (ARM) 環境では、`docker-compose.yml` 内の `platform: linux/amd64` 指定によりイメージを正しく起動できます。

### Terraform による本番/ステージング構築
```
cd infra/terraform
terraform init
terraform plan  -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
```
- `dev.tfvars` には Cloudflare/Turso/Firebase などのシークレットを設定します。
- Terraform state は Terraform Cloud もしくは暗号化されたリモートストレージで管理することを推奨します。

### ローカル動作確認（暫定）
- 現在は仕様とユーティリティのみが整備されています。実装追加後は以下を目安に動作確認してください。
  - フロントエンド: `pnpm dev` などで Vite 開発サーバを起動
  - バックエンド: `wrangler dev` で Workers をローカル実行（Miniflare 利用）
  - API 変更時は OpenAPI → 型生成 → テスト → ドキュメント更新の順で整合性を保つ

## コントリビューション
- ルールは `AGENTS.md` を参照（命名規則やフォーマッタ運用など）
- 作業は `feature/<topic>` ブランチで行い、PR 前に lint / test を実行
- API を変更した場合は OpenAPI と生成コードを最新化し、レビューワへ共有

## 現状ステータス
現在は設計フェーズであり、実装コードは未着手です。ドキュメント群をレビューし、`specs/design-review.md` の指摘事項を解決しながら開発タスクを進めてください。
