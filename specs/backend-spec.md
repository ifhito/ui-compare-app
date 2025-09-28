# バックエンド構築仕様 (Cloudflare Workers + Hono, DDD構成)

UI比較投票アプリのバックエンドは、ドメイン駆動設計 (DDD) を採用し、Cloudflare Workers 上で稼働する Hono アプリケーションとして実装する。ドメイン知識をコードへ反映し、拡張容易性と保守性を重視する。

## 1. レイヤ構成 / ディレクトリ
```
apps/api/
  src/
    domain/              # エンティティ・値オブジェクト・ドメインサービス
      comparison/
      voting/
      user/
    application/         # ユースケース（コマンド/クエリ）、DTO、サービス境界
      comparison/
      voting/
      shared/
    infrastructure/      # 外部システムとの連携（Turso, Firebase, StackBlitz, Turnstile）
      persistence/
      auth/
      messaging/
    interfaces/          # Hono ルート、HTTPハンドラ、DTO変換
      http/
    middleware/
    config/
    bootstrap.ts         # アプリ初期化（DIコンテナ組み立て）
    worker.ts            # Cloudflare Worker エントリ
wrangler.toml
package.json
```
- 各ドメインフォルダは `entities`, `value-objects`, `repositories`, `services`, `events` サブフォルダを持つ。
- インフラ層ではドメイン層のインターフェースを実装し、`interfaces` 層からはアプリケーション層のみを参照する。

## 2. バウンデッドコンテキスト
- **Comparison コンテキスト**: UI比較案件の作成・管理（Aggregate Root: `Comparison`、包含する `UiVariant` 最大4件）
- **Voting コンテキスト**: 投票行為と集計（Aggregate Root: `VoteSession`、`Vote` 値オブジェクト）
- **User コンテキスト**: Firebase ユーザ情報の同期、投稿者/閲覧者の役割
- **Analytics コンテキスト（将来）**: 集計・レポート機能を独立させる拡張ポイント

各コンテキストはアプリケーション層のユースケースを通じて連携し、ドメインイベント（例: `ComparisonPublished`, `VoteSubmitted`）で疎結合な通知を行う。

## 3. ドメイン設計要素
- `Comparison` エンティティ
  - ID, タイトル, 概要, 公開期間, ステータス, 作成者ID, `UiVariant` コレクション (2〜4件)
  - 不変条件: Variant数は 2〜4、StackBlitz URL はユニーク
- `UiVariant` 値オブジェクト
  - Variant ID, ラベル, StackBlitz URL, サムネイルURL, 表示順序
- `VoteSession` アグリゲート
  - セッションID, ユーザID, ComparisonID, `SelectedVariant` 値オブジェクト, コメント, タイムスタンプ
  - 多重投票防止ロジックを内包
- ドメインサービス
  - `VotingPolicyService`: Turnstile検証結果やレート制限を判定
  - `ComparisonPublicationService`: 公開・終了条件を管理

ドメインイベントはアプリケーション層で購読し、必要に応じて Sentry/Logflare へ記録や通知を行う。

## 4. アプリケーション層
- コマンドユースケース
  - `CreateComparisonCommandHandler`
  - `UpdateComparisonCommandHandler`
  - `PublishComparisonCommandHandler`
  - `SubmitVoteCommandHandler`
- クエリユースケース
  - `GetComparisonQueryHandler`
  - `ListComparisonsQueryHandler`
  - `GetResultsQueryHandler`
  - `GetMyComparisonsQueryHandler`
- DTO マッピング層でドメインモデルと HTTP レスポンスを変換
- 例外は `ApplicationError`（ドメイン例外を内包）に変換し、インターフェース層で HTTP ステータスへ写像

## 5. インフラ層
- 永続化
  - `TursoComparisonRepository` (`ComparisonRepository` インターフェース実装)
  - `TursoVotingRepository`
  - `TursoVoteSessionRepository`
- 外部 API クライアント
  - `FirebaseAuthVerifier` : IDトークン検証
  - `StackBlitzMetadataClient` : プロジェクトサムネイル取得（任意）
  - `TurnstileValidator`
- Webhook セキュリティ
  - `StackBlitzSignatureVerifier`: `X-StackBlitz-Signature` ヘッダを検証。`t=<unix time>,v1=<signature>` 形式を解析し、`secret` と `timestamp.payload` の HMAC-SHA256 で照合
  - デフォルトの許容遅延は 300 秒。経過時間が閾値を超えた場合は拒否し、リプレイ攻撃を防止
  - 署名検証ユーティリティは `src/webhooks/stackblitz.js` に配置し、Vitest による単体テストでカバー
- DI 容器（軽量ファクトリ）で依存性を束ね、`bootstrap.ts` で初期化

## 6. インターフェース層 (Hono)
- `interfaces/http/routes.ts`
  - `registerComparisonRoutes(app, handlers)` などとしてユースケースを注入
- 1 ルート = 1 ユースケース呼び出しを基本とし、リクエストDTO → アプリケーション → ドメイン
- OpenAPI 定義のソースは `specs/openapi.yaml`。`pnpm generate:api` でルートハンドラの型を同期し、CI では `spectral lint specs/openapi.yaml` でバリデーション
- StackBlitz Webhook ルートは `StackBlitzSignatureVerifier` ミドルウェアを適用し、署名/タイムスタンプ検証で失敗した場合は 401 を返却

### 6.1 API（変更なし）
- 公開API
  - `GET /api/v1/comparisons`
  - `GET /api/v1/comparisons/:id`
  - `GET /api/v1/comparisons/:id/results`
- 認証必須 API
  - `POST /api/v1/comparisons`
  - `PATCH /api/v1/comparisons/:id`
  - `POST /api/v1/comparisons/:id/publish`（公開操作を明示化）
  - `POST /api/v1/votes`
  - `GET /api/v1/me/comparisons`
  - `GET /api/v1/me/analytics`
- Webhook / 内部 API
  - `POST /api/v1/webhooks/stackblitz`
  - `POST /api/v1/admin/recalculate`

## 7. バリデーション戦略
- インターフェース層: `zod` でリクエストDTOを検証
- アプリケーション層: ユースケースでドメインオブジェクトへ変換、ドメイン例外 (`DomainError`) をスロー
- ドメイン層: 値オブジェクト生成時に不変条件を確認
- 投票DTO: `selectedVariant` は `['variant-1','variant-2',...]` の中から1つ

## 8. TursoDB 設計とリポジトリ
- ERD (抜粋)
  - `comparisons` (id, owner_id, title, summary, status, published_at, expires_at, created_at)
  - `comparison_variants` (id, comparison_id, label, stackblitz_url, thumbnail_url, display_order)
  - `votes` (id, comparison_id, variant_id, user_id, comment, created_at)
  - `vote_sessions` (id, comparison_id, user_id, submitted_at)
- リポジトリインターフェース
  - `ComparisonRepository` : `save`, `findById`, `findPublished`, `listByOwner`
  - `VoteRepository` : `save`, `countByComparison`, `listRecent`
  - `VoteSessionRepository` : `existsByComparisonAndUser`
- インフラ実装では SQL テンプレートを `sql/` に分離し、Prepared Statement を利用
- アプリケーション層ではトランザクション境界を明示し、複数リポジトリ操作時は `executeInTransaction` を利用

## 9. 認証・認可
- Firebase IDトークン検証結果を `AuthUser` 値オブジェクトに変換
- 所有者チェックはアプリケーション層で行い、ドメイン層では `Comparison` の `isOwnedBy(user)` を利用
- Turnstile 検証結果は `VotingPolicyService` が評価し、ボット判定時は `DomainError('vote_not_allowed')`

## 10. レート制限・ボット対策
- インターフェース層で `@hono/rate-limit` を適用
- ドメインイベント `VoteSubmitted` 発行時に監査ログを記録
- 異常スパイクは `AnomalyDetected` ドメインイベント発火 → Sentry 連携

## 11. エラーハンドリング
- エラー分類
  - `DomainError` → 400/409
  - `AuthError` → 401/403
  - `RateLimitError` → 429
  - `InfrastructureError` → 502/503
- 共通レスポンス `{ code, message, traceId }`
- `traceId` は Cloudflare `cf-ray` を利用しログと関連付け

## 12. ロギング & 監査
- `interfaces/middleware/logging.ts` で request/response ログを JSON 出力
- ドメインイベントを `AuditLogger` に渡し、`comparison_published`, `vote_submitted` を Workers KV / Logflare へ記録

## 13. テスト戦略
- ドメイン層: 純粋なユニットテスト（Vitest）で不変条件、値オブジェクト検証
- アプリケーション層: ユースケーステスト。リポジトリはテストダブル（メモリ実装）で差し替え
- インフラ層: Miniflare + Turso sqlite エミュレータで接続テスト
- インターフェース層: Contractテスト + Playwright APIテスト
- ドメインイベントのテスト: 購読者への伝播を検証
- OpenAPI 契約テスト: `schemathesis` などで `specs/openapi.yaml` と実装の差異を検出

## 14. デプロイ/運用
- `wrangler deploy` 時に DI 設定が正常であることを `bootstrap.ts` で検証
- `/health` エンドポイントでは依存サービス状態をアプリケーション層経由で確認（Turso 接続、Firebase 設定）
- ロールバックは前バージョン Worker へ切替

## 15. 将来拡張
- ドメインイベントを Durable Objects / Queue へ配信し、非同期処理を追加
- Voting 集計を Analytics コンテキストへ分離し、別サービス化
- CQRS を採用し、クエリを専用リードモデルへ切り出し
