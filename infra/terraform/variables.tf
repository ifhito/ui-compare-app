variable "cloudflare_api_token" {
  type        = string
  description = "API token with permission to manage Cloudflare account"
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account ID"
}

variable "cloudflare_pages_project" {
  type        = string
  description = "Cloudflare Pages project name"
}

variable "github_repo_url" {
  type        = string
  description = "GitHub repository URL"
}

variable "slug_main_branch" {
  type        = string
  default     = "main"
  description = "Production branch name"
}

variable "vite_firebase_api_key" {
  type        = string
  description = "Firebase API key for Vite client"
  sensitive   = true
}

variable "cloudflare_worker_name" {
  type        = string
  description = "Cloudflare Worker script name"
}

variable "worker_script_path" {
  type        = string
  description = "Path to built worker script"
}

variable "worker_compatibility_date" {
  type        = string
  description = "Cloudflare Worker compatibility date"
}

variable "turso_api_token" {
  type        = string
  description = "Turso API token"
  sensitive   = true
}

variable "turso_database_name" {
  type        = string
  description = "Turso database name"
}

variable "turso_primary_location" {
  type        = string
  description = "Primary location for Turso DB"
}

variable "turso_replicas" {
  type        = list(string)
  default     = []
  description = "Replica locations for Turso DB"
}

variable "turso_database_url" {
  type        = string
  description = "Primary DB URL for Workers"
  sensitive   = true
}

variable "turso_auth_token" {
  type        = string
  description = "DB token for Workers"
  sensitive   = true
}

variable "stackblitz_webhook_secret" {
  type        = string
  description = "Webhook secret"
  sensitive   = true
}

variable "firebase_project_id" {
  type        = string
  description = "Firebase project ID"
}

variable "firebase_client_email" {
  type        = string
  description = "Firebase service account email"
  sensitive   = true
}

variable "firebase_private_key" {
  type        = string
  description = "Firebase private key"
  sensitive   = true
}
