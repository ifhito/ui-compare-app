# ドメインイベント配信計画

## 背景
`VoteSubmitted` や `ComparisonPublished` などのドメインイベントを非同期に処理し、集計キャッシュ更新・通知・異常検知を安定的に実行するため、Cloudflare Queues を利用したイベント配送を検討する。

## 方針
1. **イベントエンベロープ**
   - `id`, `type`, `occurredAt`, `payload`, `metadata` を持つ JSON 形式で統一
   - `payload` には必要最小限の ID 情報を含め、詳細データはリードモデルから再取得
2. **発行**
   - アプリケーション層 (ユースケース) でドメインイベントを生成後、同期処理完了時にキューへ enqueue
   - 失敗時はリトライ付きのフォールバックキューに送る
3. **消費者**
   - Cloudflare Workers (Queue Consumer) でイベントを受信し、用途別ハンドラへルーティング
   - 例: `VoteSubmitted` → 集計更新 / 不正検知、`ComparisonPublished` → 通知トリガー
4. **冪等性**
   - 受信側ではイベント ID を KV で記録し、重複処理を防止
5. **監視**
   - Queue の失敗回数や遅延を監視し、アラートを設定

## Terraform への組み込み
- `infra/terraform/modules/cloudflare_queues` (仮) を作成し、Queue と Consumer Binding を IaC で管理
- Queue 名やバインディングは環境ごとに `tfvars` で指定

## 今後の TODO
- Queue モジュールの Terraform 実装
- Consumer Worker の設計 (拡張 Hono or 専用 Worker)
- 既存ユースケースからのイベント発行コード実装
- 監視メトリクスとアラートポリシーの策定
