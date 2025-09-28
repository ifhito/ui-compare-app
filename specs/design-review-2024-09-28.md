# 設計レビューサマリー (2024-09-28)

## 要件整合性チェック
- `specs/idea.spec.md` (UI 比較・投票プラットフォームの目的) と `specs/tech.spec.md` (技術選定) の内容は整合しており、StackBlitz プレビュー + Cloudflare Workers 構成に対して矛盾なし
- `specs/product-spec.md` に定義したページ構成（最大 4 案比較、投稿・ダッシュボード等）は OpenAPI に反映済みで、エンドポイントから逸脱していない
- 認証・ボット対策は Firebase Auth + Turnstile に統一されており、仕様書全体で整合
- DDD ドメインモデル (`specs/domain-model.md`) と Use Case (`specs/use-cases.md`) の内容が API スキーマおよびデータ構造に一致している

## 残課題
1. **文書間の冪等性記述**: Vote の冪等性戦略を全ての仕様 (`frontend-spec`, `backend-spec`, `design-tasks`) に周知済みか要確認。→ Backend/Use Case/Design Taskには追記済み、Frontend含む他 doc の整合確認が必要
2. **Webhook セキュリティ**: StackBlitz署名検証をバックエンド仕様と実装ガイドに追記済み。OpenAPI も更新済みのためクリア
3. **IaC への移行**: 現状 docker-compose をベースとした手動構築。要件追加により IaC (Terraform/CDK) へ記述移行が必要

## 推奨事項
- 仕様に対して網羅的な TODO を `specs/design-tasks.md` のチェックボックスで管理し、完了状況を可視化する
- 新しい IaC 方針に沿って Cloudflare / Turso のプロビジョニングコードを作成し、登録された Secrets も IaC で扱う
- docs/turso-local.md はローカル検証用として残し、本番環境構築手順は IaC に委譲する
