# インフラ構築仕様

このドキュメントは UI比較投票アプリを運用するためのインフラ層の構築手順と設定仕様を記載する。Cloudflare Workers/Pages、TursoDB、Firebase Authentication、StackBlitz WebContainers を中心に構成する。

## 1. 全体構成
- クライアント: Cloudflare Pages で配信される Vite + React アプリ
- API: Cloudflare Workers（Hono）による REST エンドポイント
- データストア: TursoDB（libSQL互換）。Workers から HTTP/WebSocket 接続
- 認証: Firebase Authentication（クライアント SDK・Workers からのトークン検証）
- UIプレビュー: StackBlitz WebContainers でホストされる埋め込み iframe
- 監視: Cloudflare Analytics, Sentry/Logflare

## 2. Cloudflare 環境
### 2.1 Pages
- リポジトリと連携し、自動デプロイを設定
- Build コマンド: `pnpm install && pnpm build`
- Build Output: `dist/`
- 環境変数
  - `VITE_FIREBASE_API_KEY` などクライアントに公開される値は Pages デプロイ設定から付与
  - `VITE_STACKBLITZ_EMBED_ORIGIN=https://embed.stackblitz.com`
- Branch マッピング
  - `main`: Production
  - `develop`: Preview/Staging

### 2.2 Workers
- `wrangler.toml` をルートに配置し、以下を定義
  - `name`: `ui-compare-api`
  - `main`: `dist/worker/index.mjs`
  - `compatibility_date`: 毎月更新
  - `routes`: `api.example.com/*`
- Secrets 管理
  - `wrangler secret put FIREBASE_PROJECT_ID`
  - `wrangler secret put TURSO_CONNECTION_URL`
  - `wrangler secret put TURSO_AUTH_TOKEN`
  - `wrangler secret put STACKBLITZ_WEBHOOK_SECRET`
- KV / Durable Objects
  - キャッシュ用に Workers KV を利用する場合は `wrangler.toml` にバインディングを追加

### 2.3 セキュリティ設定
- Cloudflare Access / Turnstile を利用する場合はポリシーとサイトキーを設定
- Firewall Rules で特定地域・ボットトラフィックを制限
- HTTPS リダイレクトと HSTS を有効化

## 3. TursoDB
### 3.1 インスタンス作成
- `turso db create ui-compare` でデータベースを作成
- 地理的レプリカを必要に応じて追加（例: `turso db replicate ui-compare fra`）

### 3.2 接続設定
- 総当たり攻撃防止のため IP allowlist を設定（Workers 経由のみ）
- 認証トークンは Cloudflare Workers の Secret として保存
- 接続 URI 例: `libsql://ui-compare-<hash>.turso.io`

### 3.3 バックアップ/メンテナンス
- 毎日スナップショットを取得し、90日保管
- スキーマ変更は `migrations/` ディレクトリの SQL を `turso db shell` から適用
- 本番適用前にステージングで検証
- ローカル開発では `docker compose up turso` で libSQL サーバを起動し、`scripts/apply-migrations.sh` でマイグレーションを流す (`libsql` CLI を使用)

## 4. Firebase Authentication
### 4.1 プロジェクト設定
- Firebase Console で新規プロジェクトを作成
- Authentication → Sign-in method で Email/Password と主要な OAuth プロバイダ（Google/GitHub 等）を有効化
- Web App を登録し、APIキー・プロジェクトIDを取得

### 4.2 セキュリティ
- 許可ドメインに Cloudflare Pages の Production/Staging URL を追加
- 認証ログの BigQuery エクスポートを有効化（必要に応じて）
- パスワード要件・メール検証を強制

## 5. StackBlitz WebContainers
### 5.1 テンプレート準備
- UI投稿者向けにベーステンプレートプロジェクトを StackBlitz 上で公開
- Vite + React / CSS Modules などを初期セットとして提供

### 5.2 埋め込み設定
- iframe URL 例: `https://stackblitz.com/edit/<project>?embed=1&view=preview&ctl=0&hideNavigation=1`
- 埋め込み元ドメイン `embed.stackblitz.com` を CSP の `frame-src` に追加
- プレビュー専用プロジェクトに対して WebContainers の自動シャットダウン（アイドルタイム）を利用

### 5.3 同期・更新
- 投稿者が URL を更新した際は Workers API に Webhook で通知し、DB を更新
- 必要なら StackBlitz API でプロジェクトのメタデータを取得

## 6. Secrets / 証明書管理
- Secrets は Cloudflare Secrets Manager、Turso CLI、Firebase Console のみで管理し、Git に含めない
- StackBlitz のアクセスキーが必要な場合は env var として Workers に渡さず、クライアント側で公開可能なもののみ利用
- Backups の暗号化キーを専用の Vault（1Password, AWS KMS 等）で管理

## 7. CI/CD
- GitHub Actions で以下のワークフローを構築
  1. Lint/Test（PR単位で実行）
  2. Build & Deploy（`main` マージ時に Cloudflare Pages/Workers へ）
- Lint/Test ワークフロー内で `spectral lint specs/openapi.yaml` と `pnpm generate:api --check` を実行し、API契約を検証
- Secrets は GitHub Actions Secrets で安全に渡し、`wrangler` CLI からデプロイ
- ステージングデプロイ後に自動E2Eテストを実行し、成功で本番に昇格

## 8. 監視・ログ
- Sentry の DSN を Pages & Workers に設定し、リリースタグを付与
- Cloudflare Logs を Logflare などにストリーミング
- Turso のメトリクス（接続数、クエリレイテンシ）を月次レビュー
- 任意で Statuspage / UptimeRobot を用いて外形監視

## 9. コスト・スケーリング
- Cloudflare Free/Pro プランの制限（Workers リクエスト数、KV書き込み）を把握し、閾値超過時のプラン変更基準を設定
- Turso のプラン（ストレージ/クエリ数）を監視し、増加時はレプリカ追加やプランアップを検討
- StackBlitz の組織向けプランが必要な場合のコスト試算を記録
