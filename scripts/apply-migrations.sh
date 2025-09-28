#!/usr/bin/env bash
set -euo pipefail

if ! command -v libsql >/dev/null 2>&1; then
  echo "error: libsql CLI is required. Install via 'brew install libsql' or refer to docs/turso-local.md" >&2
  exit 1
fi

DATABASE_URL="${DATABASE_URL:-http://127.0.0.1:8080}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-db/migrations}"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "error: migrations directory '$MIGRATIONS_DIR' not found" >&2
  exit 1
fi

shopt -s nullglob
mapfile -t files < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' | sort)
shopt -u nullglob

if [ "${#files[@]}" -eq 0 ]; then
  echo "warning: no migration files found in $MIGRATIONS_DIR" >&2
  exit 0
fi

for file in "${files[@]}"; do
  echo "Applying migration: $file"
  libsql execute "$DATABASE_URL" "$(cat "$file")"
done

echo "Migrations applied successfully"
