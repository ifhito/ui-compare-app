variable "account_id" {
  type        = string
  description = "Cloudflare account ID"
}

variable "project_name" {
  type        = string
  description = "Pages project name"
}

variable "repo_owner" {
  type        = string
  description = "GitHub repository owner"
}

variable "repo_name" {
  type        = string
  description = "GitHub repository name"
}

variable "production_branch" {
  type        = string
  description = "Production branch name"
}

variable "build_command" {
  type        = string
  description = "Build command"
}

variable "build_directory" {
  type        = string
  description = "Directory containing build output"
}

variable "env_vars" {
  type        = map(string)
  default     = {}
  description = "Environment variables for the Pages project"
}

variable "preview_branch_includes" {
  type        = list(string)
  default     = []
  description = "Branch patterns that should trigger preview builds"
}
