# フロントエンド構築仕様 (Vite + React)

UI比較投票アプリのフロントエンド層に関する詳細仕様。Vite + React + TypeScript をベースに、StackBlitz プレビューとの統合と Firebase 認証を考慮する。

## 1. プロジェクト初期設定
- パッケージマネージャ: `pnpm`
- テンプレート: `pnpm create vite@latest ui-compare -- --template react-ts`
- ディレクトリ構成（抜粋）
  - `src/app/` ルートレイアウト、ルーティング設定
  - `src/pages/` ページコンポーネント（`home`, `compare/[id]`, `submit`, `dashboard`）
  - `src/components/` 再利用可能 UI（`VoteButton`, `PreviewFrame`, `ScoreCard` など）
  - `src/features/` 機能別フォルダ（`auth`, `votes`, `submissions`）
  - `src/lib/` ユーティリティ（APIクライアント、Firebase初期化など）
  - `src/hooks/` カスタムフック
  - `src/styles/` グローバルスタイル、トークン
- ESLint/Prettier 設定を追加し、CI の lint と同期
- Git hooks に `lint-staged` を設定（`pnpm lint` `pnpm test -- --run`）

## 2. ルーティング
- `react-router-dom` v6 を採用
- パス設計
  - `/` : 最新比較のリスト、特集
  - `/compare/:id` : プレビュー + 投票画面（最大4案対応）
  - `/submit` : 新規UI投稿フォーム
  - `/dashboard` : 投稿者向け結果ダッシュボード（認証必須）
  - `/auth/callback` : Firebase OAuth リダイレクト
- エラーハンドリング用の ErrorBoundary と NotFound ページを用意

## 3. 状態管理
- グローバル状態: `@tanstack/react-query` でサーバステートを管理
- クライアントステート: React Context + hooks（例: AuthContext, ToastContext）
- キャッシュポリシー: 投票結果は 5 秒程度で再フェッチ（リアルタイム感）、サブミッションリストは 60 秒

## 4. UI/スタイリング
- UIライブラリ: `tailwindcss` + `@tailwindcss/forms` を導入
- デザインシステム: カラートークン・タイポグラフィを `src/styles/tokens.ts` に定義
- ダークモード対応: `prefers-color-scheme` + トグルスイッチ
- アクセシビリティ指針
  - 主要コントロールに `aria-*` を付与
  - キーボード操作可能／フォーカスリング明示
  - スクリーンリーダー用のライブリージョンで結果更新

## 5. Firebase 認証統合
- `src/lib/firebase.ts` に初期化コードを配置
- AuthContext を作成し、`onAuthStateChanged` でユーザ情報を保持
- `SignInModal` コンポーネントで Google/GitHub/Email の各プロバイダをサポート
- トークンは `currentUser.getIdToken(true)` で取得し、`Authorization: Bearer` ヘッダとして API 呼び出しに付与
- 非認証ユーザが保護ルートにアクセスした場合、ログインダイアログを表示し、成功後リダイレクト

## 6. API クライアント
- `src/lib/apiClient.ts` に `fetch` ラッパを実装
  - リクエスト時に Firebase トークンを付与
  - 429/5xx の場合は指数バックオフで 3 回まで再試行
  - JSON 以外のレスポンスはエラーハンドリング
- エンドポイント定義を `src/features/*/api.ts` に配置（`listComparisons`, `getComparison`, `submitVote` etc.）
- `specs/openapi.yaml` から `openapi-typescript` で型を生成し、`src/generated/api-types.ts` を自動生成。ローカル開発では `pnpm generate:api` で最新化

## 7. UIプレビュー統合
- `PreviewFrame` コンポーネントで iframe 埋め込み
  - `src/features/preview/embedParams.ts` で StackBlitz パラメータを集中管理
  - `sandbox="allow-scripts allow-same-origin"`, `allow="clipboard-read; clipboard-write"` 等を指定
  - ローディングスケルトン表示、タイムアウト時のフォールバック
- `postMessage` を受信し、ロード完了・エラーを通知（StackBlitz 側が対応している場合）
- 投票ボタンはプレビュー準備完了イベント後に活性化し、最大4案から単一選択

## 8. 画面別仕様
### 8.1 ホーム(`/`)
- 公開中の比較カード表示（タイトル、タグ、締切日時、StackBlitzサムネイル）
- 人気／新着タブ切り替え
- ログイン状態に応じて投稿ボタン表示

### 8.2 比較詳細(`/compare/:id`)
- ヘッダー: UIメタ情報（説明、投稿者、作成日、公開期間、タグ）
- メイン: 最大4件の `PreviewFrame` をレスポンシブグリッド（2×2、2列×1行など）で表示
- 投票フォーム: ラジオグループで 2〜4案から1つ選択、任意コメント入力、Turnstile 対応
- 結果タブ: 案ごとの得票率円グラフ、時系列ラインチャート、コメントハイライト

### 8.3 投稿フォーム(`/submit`)
- 入力項目: タイトル、概要、最大4件の StackBlitz URL、カテゴリ、公開期間、タグ
- フォームバリデーション（Zod）による同期/非同期検証
- プレビューサムネイル自動取得（StackBlitz API もしくは og-image）
- 成功時はダッシュボードへリダイレクト

### 8.4 ダッシュボード(`/dashboard`)
- 自分の投稿一覧、投票数、コンバージョングラフ
- 日次 CSV ダウンロードボタン
- 投票ステータス（公開中/終了）切り替え

## 9. 国際化 / ローカリゼーション
- `@lingui/core` など軽量 i18n ライブラリを検討
- MVPは日本語版、英語対応はキーを抽出しやすいよう `t()` を導入

## 10. テスト
- 単体テスト: Vitest + React Testing Library
  - コンポーネント（`VoteButton`, `PreviewFrame`）のレンダリング・状態
  - API呼び出しのモックでハッピーパス/エラーパス
- Storybook を導入し、主要コンポーネントの UIレビューと Visual Regression Test（Chromatic）を活用
- Playwright による E2E テストシナリオ
  - 未ログイン → ログイン → 投票
  - 投稿フォームバリデーション
  - プレビュー未ロード時のフォールバック表示

## 11. パフォーマンス最適化
- Vite のコード分割（`react-router` の lazy routes）を活用
- プレビュー iframe は IntersectionObserver で遅延ロード
- 画像は `@cloudflare/images` などの最適化サービスを検討
- Web Vitals（LCP/FID/CLS）を Sentry + Vite プラグインでモニタリング

## 12. ビルド・デプロイ
- Pages 向けに `pnpm build` で `dist/` を生成
- `pnpm preview --host` をローカル確認
- デプロイ後、Cloudflare Pages Preview URL で E2E テストを実行
