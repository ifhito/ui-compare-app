variable "database_name" {
  type        = string
  description = "Name of the Turso database"
}

variable "location" {
  type        = string
  description = "Primary location for the Turso database"
}

variable "replicas" {
  type        = list(string)
  default     = []
  description = "List of replica locations"
}

variable "migrations_directory" {
  type        = string
  description = "Path to migration scripts (used by external pipeline)"
}
