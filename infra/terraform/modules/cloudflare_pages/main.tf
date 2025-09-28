resource "cloudflare_pages_project" "this" {
  account_id   = var.account_id
  name         = var.project_name
  production_branch = var.production_branch
  source {
    type = "github"
    config {
      owner              = var.repo_owner
      repo_name          = var.repo_name
      production_branch  = var.production_branch
      deployments_enabled = true
    }
  }

  build_config {
    build_command   = var.build_command
    destination_dir = var.build_directory
  }

  env_vars = var.env_vars

  preview_branch_includes = var.preview_branch_includes
}
