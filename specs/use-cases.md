# アプリケーションユースケース定義

DDDアーキテクチャで実装する主要ユースケースをコマンド/クエリに分類し、関係するドメインコンテキストとフローを整理する。

## 1. コマンドユースケース

### 1.1 CreateComparison
- **コンテキスト**: Comparison
- **アクター**: 認証済み UI投稿者
- **事前条件**:
  - ユーザが Firebase 認証済み
  - 投稿可能なロール (`creator` 以上) を保持
- **主シナリオ**:
  1. UI投稿者が投稿フォームからタイトル、概要、最大4件の StackBlitz URL、公開期間、タグを送信
  2. アプリケーション層が DTO をドメインモデルへ変換し、バリデーション実施
  3. `Comparison` 集約が生成され、不変条件（2〜4 variants、URL重複なし）を満たしているか検証
  4. Turso の `ComparisonRepository` が保存
  5. `ComparisonCreated` イベントを発火
- **例外シナリオ**:
  - StackBlitz URL 不正 → `DomainError('invalid_variant_url')`
  - Variant が1件以下 → `DomainError('insufficient_variants')`

### 1.2 UpdateComparison
- **コンテキスト**: Comparison
- **アクター**: Comparison 所有者
- **事前条件**: Comparison が draft もしくは published（公開中でも期間内であれば更新可）
- **主シナリオ**:
  1. 所有者が編集リクエストを送信
  2. アプリケーション層で所有者チェック `comparison.isOwnedBy(user)`
  3. 変更差分を適用し、`Comparison` が状態遷移を検証
  4. `ComparisonUpdated` イベントを発火（必要な場合 StackBlitz メタ情報更新）

### 1.3 PublishComparison
- **コンテキスト**: Comparison
- **アクター**: Comparison 所有者
- **事前条件**: Comparison が draft 状態、必要な variant 数を満たす
- **主シナリオ**:
  1. 所有者が公開リクエストを送信
  2. `ComparisonPublicationService` が公開条件（公開期間・StackBlitz 応答チェック）を評価
  3. ステータスを published に更新し、`ComparisonPublished` イベントを発火
  4. Voting コンテキストがイベントを購読し、投票許可情報を更新

### 1.4 SubmitVote
- **コンテキスト**: Voting
- **アクター**: 認証済み投票者
- **事前条件**:
  - Comparison が published かつ公開期間内
  - Turnstile 検証成功
  - 該当ユーザが未投票
- **主シナリオ**:
  1. 投票者が比較詳細ページで variant を選択しコメントを入力
  2. `VotingPolicyService` が Turnstile とレート制限を確認
  3. `VoteSession` 集約が生成され、`Vote` 値オブジェクトを保持
  4. `VoteSessionRepository` と `VoteRepository` へ永続化（トランザクション）
  5. `VoteSubmitted` イベントを発火し、集計更新をトリガー
- **代替シナリオ**:
  - 既に投票済み → `DomainError('duplicate_vote')`
  - 公開期間外 → `DomainError('comparison_closed')`

### 1.5 HandleStackBlitzWebhook
- **コンテキスト**: Comparison
- **アクター**: StackBlitz Webhook
- **目的**: プロジェクト更新時にサムネイルやメタ情報を再取得
- **主シナリオ**:
  1. Webhook が `X-StackBlitz-Signature` ヘッダ付きでイベントを送信
  2. HMAC-SHA256 署名とタイムスタンプを検証し、リプレイ保護閾値（既定 5 分）を満たさない場合は 401 応答
  3. 署名が有効な場合のみ該当 `Comparison` を検索し、最新サムネイルを取得して `ComparisonUpdated` イベント発火

### 1.6 RecalculateAnalytics (管理者)
- **コンテキスト**: Voting/Analytics
- **目的**: 異常検知や集計の再生成
- **主シナリオ**:
  1. 管理者が再集計APIを呼び出す
  2. 投票データを再読み込みし、キャッシュ更新

## 2. クエリユースケース

### 2.1 GetComparison
- **コンテキスト**: Comparison
- **主シナリオ**:
  1. `ComparisonQueryService` が `ComparisonRepository` から取得
  2. `UiVariant` 情報を含む DTO を返却（プレビュー埋め込み用）

### 2.2 ListComparisons
- **目的**: トップページ向け一覧（人気/新着/締切間近）
- **主シナリオ**:
  1. フィルタ/ソート条件を受け取り、リードモデルを参照
  2. ページネーション付きでレスポンス

### 2.3 GetResults
- **コンテキスト**: Voting
- **主シナリオ**:
  1. `VoteRepository` から variant 別集計を取得
  2. 投票総数、得票率、時系列データを計算
  3. コメントの最新数件を添えて返却

### 2.4 GetMyComparisons
- **アクター**: 投稿者
- **主シナリオ**:
  1. 所有者IDで `ComparisonRepository.listByOwner`
  2. ステータスと期間を付与しダッシュボード表示用 DTO を返却

### 2.5 GetMyAnalytics
- **目的**: 投稿者向け分析
- **主シナリオ**:
  1. 投票数の推移、コンバージョン率などを計算
  2. CSV エクスポート用データを同梱

## 3. イベントハンドリングユースケース
- **ComparisonPublishedHandler**: Votingポリシー更新、通知送信
- **VoteSubmittedHandler**: 集計キャッシュの再計算、異常検知
- **AnomalyDetectedHandler**: Sentry/Slack等へのアラート

## 4. ユースケース間の依存関係
- コマンドユースケースはドメインエンティティを通じて状態変更
- クエリユースケースは読み取り最適化されたビュー（必要なら今後CQRS導入）を利用
- イベントハンドラーは最終的な整合性を保ちながら非同期処理を実施

これらのユースケース定義を基に、アプリケーション層の実装とテストケース設計を進める。
