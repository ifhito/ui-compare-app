resource "cloudflare_worker_script" "this" {
  account_id         = var.account_id
  name               = var.api_name
  content            = file(var.script_path)
  compatibility_date = var.compatibility_date
}

resource "cloudflare_worker_route" "api" {
  count       = var.zone_id != null ? 1 : 0
  account_id  = var.account_id
  zone_id     = var.zone_id
  script_name = cloudflare_worker_script.this.name
  pattern     = var.route_pattern
}

resource "cloudflare_worker_secret" "secrets" {
  for_each   = var.secrets
  account_id = var.account_id
  script_name = cloudflare_worker_script.this.name
  name        = each.key
  text        = each.value
}

# Environment variables stored via worker deployments (will be uploaded using wrangler publish with vars). Placeholder for documentation.
