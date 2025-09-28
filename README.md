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

## API 契約とツールチェーン
- ソース・オブ・トゥルースは `specs/openapi.yaml`
- 型生成: `pnpm generate:api`（`openapi-typescript` を想定）
- 契約検証: `spectral lint specs/openapi.yaml`、Contract Test は Schemathesis/Dredd などを利用

## 開発の進め方
1. `specs/design-tasks.md` のタスクを確認し、担当と期限を決める
2. フロントエンドは生成された API 型を利用しつつ `AGENTS.md` のコーディング規約を遵守
3. バックエンドは `specs/backend-spec.md` の DDD 指針に沿って実装
4. 仕様変更時は必ず該当する `specs/` 内のドキュメントと OpenAPI を更新

### ローカル DB (Turso / libSQL)
- `docker compose up turso` でローカル DB を起動
- `DATABASE_URL=http://127.0.0.1:8080 ./scripts/apply-migrations.sh` でマイグレーション適用
- 詳細は `docs/turso-local.md` を参照

## コントリビューション
- ルールは `AGENTS.md` を参照（命名規則やフォーマッタ運用など）
- 作業は `feature/<topic>` ブランチで行い、PR 前に lint / test を実行
- API を変更した場合は OpenAPI と生成コードを最新化し、レビューワへ共有

## 現状ステータス
現在は設計フェーズであり、実装コードは未着手です。ドキュメント群をレビューし、`specs/design-review.md` の指摘事項を解決しながら開発タスクを進めてください。
