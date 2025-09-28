# 技術要件

## インフラ
- アプリデプロイ
    - Cloudflare Workers（投票APIおよびSSR/Edge Functionsを配置）
    - 必要に応じて Cloudflare Pages でフロントをホスト
- UIプレビューサンドボックス
    - StackBlitz WebContainers（`embed.stackblitz.com` を `view=preview` で iframe 埋め込みし、UIのみを表示）
- CDN/配信
    - Cloudflare CDN（静的アセットのキャッシュと高速配信）

## データストア
- TursoDB（libSQL互換。UI投稿情報・投票ログを保存）

## 認証
- Firebase Authentication（メール+SNSログインを想定。Cloudflare Workers から REST API でトークン検証）

## アプリケーション
- フロントエンド
    - Vite + React（StackBlitz WebContainers で素早く起動し、プレビューを切り出しやすい）
    - iframe経由で StackBlitz プレビューを読み込み、投票画面と分離
- バックエンド
    - Cloudflare Workers + Hono（軽量フレームワーク。Firebaseトークン検証後に TursoDB へアクセス）
    - 認証不要のUIプレビュー取得APIと、認証必須の投票/コメントAPIを分離
    - OpenAPI (Swagger) 仕様を `specs/openapi.yaml` で管理し、フロント/バック双方で型生成に利用
- レート制御・ボット対策（任意）
    - Cloudflare Turnstile や Upstash Rate Limiting で多重投票を抑止

## 運用/監視（任意）
- Sentry や Logflare でエラートラッキング
- Cloudflare Analytics でトラフィック監視
