terraform {
  required_version = ">= 1.7.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = ">= 4.0"
    }
    turso = {
      source  = "tursodatabase/turso"
      version = ">= 0.1.4"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "turso" {
  api_token = var.turso_api_token
}

module "cloudflare_pages" {
  source                  = "./modules/cloudflare_pages"
  account_id              = var.cloudflare_account_id
  project_name            = var.cloudflare_pages_project
  repo_url                = var.github_repo_url
  production_branch       = var.slug_main_branch
  build_command           = "pnpm install && pnpm build"
  build_directory         = "dist"
  preview_branch_includes = ["feature/*", "fix/*", "chore/*"]
  env_vars = {
    VITE_FIREBASE_API_KEY      = var.vite_firebase_api_key
    VITE_STACKBLITZ_EMBED_ORIGIN = "https://embed.stackblitz.com"
  }
}

module "cloudflare_workers" {
  source             = "./modules/cloudflare_workers"
  account_id         = var.cloudflare_account_id
  api_name           = var.cloudflare_worker_name
  script_path        = var.worker_script_path
  compatibility_date = var.worker_compatibility_date
  environment_vars = {
    TURSO_DATABASE_URL       = var.turso_database_url
    TURSO_AUTH_TOKEN         = var.turso_auth_token
    STACKBLITZ_WEBHOOK_SECRET = var.stackblitz_webhook_secret
    FIREBASE_PROJECT_ID      = var.firebase_project_id
  }
  secrets = {
    FIREBASE_CLIENT_EMAIL = var.firebase_client_email
    FIREBASE_PRIVATE_KEY  = var.firebase_private_key
  }
}

module "turso" {
  source       = "./modules/turso"
  database_name = var.turso_database_name
  location      = var.turso_primary_location
  replicas      = var.turso_replicas
  migrations_directory = "${path.module}/../db/migrations"
}
