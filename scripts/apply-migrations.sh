#!/usr/bin/env bash
set -euo pipefail

if ! command -v turso >/dev/null 2>&1; then
  echo "error: turso CLI is required. Install via 'brew install tursodatabase/tap/turso' or refer to docs/turso-local.md" >&2
  exit 1
fi

DATABASE_URL="${DATABASE_URL:-http://127.0.0.1:8080}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-db/migrations}"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "error: migrations directory '$MIGRATIONS_DIR' not found" >&2
  exit 1
fi

files=$(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print | sort)

if [ -z "$files" ]; then
  echo "warning: no migration files found in $MIGRATIONS_DIR" >&2
  exit 0
fi

IFS=$'\n'
for file in $files; do
  echo "Applying migration: $file"
  turso db shell "$DATABASE_URL" < "$file"
done
unset IFS

echo "Migrations applied successfully"
