# Terraform Infrastructure

このディレクトリには Cloudflare Pages / Workers と Turso DB を Terraform で管理するための定義を格納しています。

## 構成
- `main.tf` : 各モジュールを呼び出すルート定義
- `modules/cloudflare_pages` : Cloudflare Pages プロジェクト作成
- `modules/cloudflare_workers` : Worker スクリプト・ルート・シークレット
- `modules/turso` : Turso DB とレプリカ

## 事前準備
- Terraform 1.7+ をインストール
- Cloudflare API Token（Pages/Workers 管理権限）と Account ID を取得
- Turso API Token を取得
- Firebase, StackBlitz 等のシークレットを環境変数で用意

## 実行
```bash
cd infra/terraform
terraform init
terraform plan -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
```

## 注意
- Worker の `script_path` はビルド済みバンドルを指定してください（例: `dist/worker/index.js`）。
- Turso のマイグレーションは `migrations_directory` を参照し、外部 CI/CD 内で `turso` CLI を使って適用する想定です。
- Secrets は Terraform state に平文で保存されるため、バックエンドには `cloudflare_worker_secret` リソースで設定。State 管理は注意してください。
