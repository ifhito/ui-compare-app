variable "account_id" {
  type        = string
  description = "Cloudflare account ID"
}

variable "api_name" {
  type        = string
  description = "Worker script name"
}

variable "script_path" {
  type        = string
  description = "Path to Worker script bundle"
}

variable "compatibility_date" {
  type        = string
  description = "Cloudflare Worker compatibility date"
}

variable "zone_id" {
  type        = string
  default     = null
  description = "Optional zone ID for binding routes"
}

variable "route_pattern" {
  type        = string
  default     = null
  description = "Route pattern (e.g. api.example.com/*)"
}

variable "environment_vars" {
  type        = map(string)
  default     = {}
  description = "Runtime environment variables (documented for wrangler)"
}

variable "secrets" {
  type        = map(string)
  default     = {}
  description = "Secrets to provision via Cloudflare"
}
