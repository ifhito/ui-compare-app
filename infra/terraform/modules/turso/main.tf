resource "turso_database" "this" {
  name     = var.database_name
  location = var.location
}

resource "turso_database_replica" "replicas" {
  for_each   = toset(var.replicas)
  database_id = turso_database.this.id
  location    = each.value
}

# Placeholder for migration execution; actual application done via external script or CI pipeline using turso CLI
