# 実装タスクチェックリスト

各タスクの完了時に `[ ]` を `[x]` に変更し、進捗を管理してください。詳細な要件は関連する仕様書（`specs/*.md`）を参照します。

## 0. 環境準備
- [ ] `pnpm install` を実行し、依存パッケージを取得
- [ ] Turso CLI (`turso`) と Docker をセットアップ（Apple Silicon の場合は `platform: linux/amd64` を設定）
- [ ] `docker compose up -d turso` → `./scripts/apply-migrations.sh` でローカル DB を初期化
- [ ] `pnpm generate:api` / `pnpm lint:openapi` / `pnpm test` が通ることを確認

## 1. フロントエンド (Vite + React)
- [ ] Vite プロジェクト雛形を作成し、`src/` 配下に配置
- [ ] ルーティング（トップ、比較詳細、投稿、ダッシュボード）を定義
- [ ] StackBlitz プレビューコンポーネント (`PreviewFrame`) を実装
- [ ] 投票画面 UI（最大4案対応、コメント入力、Turnstile連携）を実装
- [ ] Firebase Authentication を組み込み、ログインモーダル・セッション管理を実装
- [ ] API クライアント層で OpenAPI 生成型を利用し、エラー処理・リトライを実装
- [ ] Vitest + React Testing Library で主要コンポーネントの単体テストを追加

## 2. バックエンド (Cloudflare Workers + Hono)
- [ ] Wrangler プロジェクトを作成し、DDD レイヤ構成（domain/application/infrastructure/interfaces）に沿ってディレクトリを構築
- [ ] 認証ミドルウェア（Firebase ID トークン検証）を実装
- [ ] Turso 接続ラッパとリポジトリ（Comparison / Vote / VoteSession）を実装
- [ ] `SubmitVote` ユースケースで冪等性キーと Turnstile 検証フラグを適用
- [ ] StackBlitz Webhook エンドポイントに署名検証ミドルウェアを適用
- [ ] Cloudflare Queues 連携の enqueue 処理を追加（`specs/domain-events.md` を参照）
- [ ] Miniflare / Vitest でユースケース・ミドルウェアのテストを作成

## 3. インフラ / IaC
- [ ] Terraform の `cloudflare_pages` モジュールを使って Pages プロジェクトを作成
- [ ] Terraform の `cloudflare_workers` モジュールで Worker スクリプト・ルート・シークレットを管理
- [ ] Terraform の `turso` モジュールで DB とレプリカを作成
- [ ] Terraform state のリモート保存（Terraform Cloud や S3 + KMS）を設定
- [ ] Cloudflare Queues 用のモジュールとコンシューマ Worker を追加

## 4. CI/CD
- [ ] OpenAPI Lint / 型生成チェックに加え、アプリのビルド・テストを GitHub Actions に登録
- [ ] Turso マイグレーションを CI/CD で適用するワークフローを追加
- [ ] Preview/Production へのデプロイフローと手動承認プロセスを整備

## 5. テスト / 品質保証
- [ ] E2E テスト（Playwright 等）でログイン → 投票 → 結果閲覧のハッピーパスを自動化
- [ ] StackBlitz プレビューの表示確認チェックリスト/自動化
- [ ] Cloudflare Queues を使ったイベント配送の統合テスト

## 6. ドキュメンテーション / 運用
- [ ] README に開発手順（フロント/バック実行方法）を追記
- [ ] `specs/` 内の設計書を実装内容に合わせて更新
- [ ] 運用ハンドブック（障害対応、ロールバック手順、アラートフロー）を作成
- [ ] リリースノートテンプレートと変更管理ルールを策定

---
進捗管理に合わせて本チェックリストを更新し、完了タスクにはチェックを入れてください。
