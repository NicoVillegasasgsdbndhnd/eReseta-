#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/ereseta/current}"
ENV_FILE="${ENV_FILE:-/var/www/ereseta/shared/.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/www/ereseta/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

read_env() {
  local key="$1"
  local value
  value="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d '=' -f 2- || true)"
  value="${value%%[[:space:]]#*}"
  value="${value%$'\r'}"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

DB_CONNECTION="$(read_env DB_CONNECTION)"
DB_HOST="$(read_env DB_HOST)"
DB_PORT="$(read_env DB_PORT)"
DB_DATABASE="$(read_env DB_DATABASE)"
DB_USERNAME="$(read_env DB_USERNAME)"
DB_PASSWORD="$(read_env DB_PASSWORD)"

if [ "$DB_CONNECTION" != "mysql" ]; then
  echo "Only mysql backups are supported by this script. DB_CONNECTION=$DB_CONNECTION"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/${DB_DATABASE}-${timestamp}.sql.gz"

echo "==> Creating database backup: $target"
MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" \
  --port="${DB_PORT:-3306}" \
  --user="$DB_USERNAME" \
  --single-transaction \
  --no-tablespaces \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  "$DB_DATABASE" | gzip > "$target"

chmod 600 "$target"

echo "==> Pruning backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -type f -name "${DB_DATABASE}-*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "==> Backup complete"

