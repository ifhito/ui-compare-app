# 設計レビュー（2024-XX-XX）

## 1. 全体評価
- DDD を採用したレイヤリングは、Comparison / Voting / User コンテキストの責務分離が明確で保守性が高い
- StackBlitz WebContainers をメール UI プレビューに活用し、認証・サンドボックスの要件が技術仕様へ反映されている
- フロント・バック・インフラの仕様が個別に整理されており、ドキュメント間の整合性が概ね保たれている

## 2. リスク・改善ポイント
1. **投票集計の整合性**
   - `VoteSession` と `Vote` のトランザクション境界が明記されているが、Workers + Turso のトランザクション制限に留意が必要
   - バッチ集計や再計算の頻度を決め、整合性とコストを両立する運用ルールが追加で必要
2. **StackBlitz Webhook 署名検証**
   - Webhook の署名・リプレイ防止策を仕様に追記するとセキュリティが向上
3. **Turnstile トークンの保存**
   - 対応済み: `vote_sessions` に `turnstile_verified` を保持し、生トークンは永続化しない
4. **API バージョニング / Contract 管理**
   - OpenAPI をソースオブトゥルースにすることで、フロント・バックのズレや破壊的変更を検知できる
5. **ドメインイベントの配送**
   - イベント駆動設計を想定しているが、Workers での配送基盤（QueuesやDurable Objects）の採用方針を早期に決める

## 3. 推奨アクション
- Turso のトランザクションサポート範囲を再確認し、必要に応じて投票処理に冪等キーを追加
- StackBlitz Webhook には署名付与を前提とし、Allowed IP 範囲や timestamp チェックを仕様に明記
- Turnstile トークンはハッシュ化、もしくは `verification_status` として保存
- OpenAPI (`specs/openapi.yaml`) を CI でバリデーションし、`openapi-typescript` で型を自動生成
- ドメインイベントを Cloudflare Queues で配送する PoC をタスク化

以上を踏まえ、各仕様書とタスクに反映することを推奨する。
