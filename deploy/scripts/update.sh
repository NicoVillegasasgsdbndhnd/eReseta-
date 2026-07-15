#!/usr/bin/env bash
#
# eReseta+ safe update/deploy — pulls latest, builds, migrates, reloads.
#
#   bash deploy/scripts/update.sh            # full update (recommended)
#   bash deploy/scripts/update.sh --skip-clone-test   # skip the migration dry-run on a DB clone
#
# Run as the deploy user (e.g. ubuntu); it uses sudo internally for MySQL-admin
# and systemctl. Aborts on the first error so a bad step never half-deploys.
#
# It DOES NOT re-link api/.env (unlike deploy.sh) — the live .env stays as-is, so
# email (Brevo) and blockchain config are preserved.
#
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/ereseta/current}"
PHP_BIN="${PHP_BIN:-/usr/bin/php}"
FPM_SERVICE="${FPM_SERVICE:-php8.4-fpm}"
QUEUE_SERVICE="${QUEUE_SERVICE:-ereseta-queue}"
DOMAIN="${DOMAIN:-deamhi.ph}"
SKIP_CLONE_TEST=0
[ "${1:-}" = "--skip-clone-test" ] && SKIP_CLONE_TEST=1

API_DIR="$APP_DIR/api"
WEB_DIR="$APP_DIR/web"
ENV_FILE="$API_DIR/.env"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m    ✓ %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31m!! %s\033[0m\n' "$*" >&2; exit 1; }

# Same parser as backup-db.sh, so both read the live .env identically.
read_env() {
  local key="$1" value
  value="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d '=' -f 2- || true)"
  value="${value%%[[:space:]]#*}"; value="${value%$'\r'}"
  value="${value%\"}"; value="${value#\"}"
  printf '%s' "$value"
}

# --------------------------------------------------------------------------
[ -d "$API_DIR" ] || die "missing $API_DIR — set APP_DIR"
[ -f "$ENV_FILE" ] || die "missing $ENV_FILE"
[ -L "$ENV_FILE" ] && printf '\033[1;33m    WARNING: api/.env is a symlink — the live config may be the stale shared one.\033[0m\n'

cd "$APP_DIR"

say "1/7  Pulling latest main"
git pull --ff-only origin main
git log --oneline -1

say "2/7  Installing PHP dependencies"
( cd "$API_DIR" && composer install --no-dev --optimize-autoloader --no-interaction )
ok "composer done"

say "3/7  Building the frontend"
( cd "$WEB_DIR" && npm ci && npm run build )
ok "web build done"

# --------------------------------------------------------------------------
DB_DATABASE="$(read_env DB_DATABASE)"
DB_USERNAME="$(read_env DB_USERNAME)"
[ -n "$DB_DATABASE" ] || die "DB_DATABASE empty in .env"

if [ "$SKIP_CLONE_TEST" = 0 ]; then
  say "4/7  Dry-running migrations on a CLONE of $DB_DATABASE (production untouched)"
  CLONE="${DB_DATABASE}_migtest"
  DUMP="$(mktemp /tmp/ereseta-clone.XXXXXX.sql)"
  sudo mysqldump --single-transaction --no-tablespaces "$DB_DATABASE" > "$DUMP"
  sudo mysql -e "DROP DATABASE IF EXISTS \`$CLONE\`; CREATE DATABASE \`$CLONE\`;"
  sudo mysql "$CLONE" < "$DUMP"
  [ -n "$DB_USERNAME" ] && sudo mysql -e "GRANT ALL ON \`$CLONE\`.* TO '${DB_USERNAME}'@'localhost';" || true

  ( cd "$API_DIR" && "$PHP_BIN" artisan config:clear >/dev/null \
      && DB_DATABASE="$CLONE" "$PHP_BIN" artisan migrate --force ) \
    || { sudo mysql -e "DROP DATABASE IF EXISTS \`$CLONE\`;"; rm -f "$DUMP"; die "migrations FAILED on the clone — production not touched. Fix and re-run."; }

  sudo mysql -e "DROP DATABASE IF EXISTS \`$CLONE\`;"
  rm -f "$DUMP"
  ok "migrations run clean on real MySQL"
else
  say "4/7  Skipping clone migration test (--skip-clone-test)"
fi

say "5/7  Migrating production + caching config"
cd "$API_DIR"
"$PHP_BIN" artisan migrate --force
"$PHP_BIN" artisan optimize:clear
"$PHP_BIN" artisan config:cache
"$PHP_BIN" artisan route:cache
"$PHP_BIN" artisan view:cache
"$PHP_BIN" artisan migrate:status | grep -i pending && die "there are STILL pending migrations" || ok "no pending migrations"

say "6/7  Reloading services"
sudo systemctl reload "$FPM_SERVICE"
sudo systemctl reload nginx
sudo systemctl restart "$QUEUE_SERVICE" || printf '    (queue restart skipped)\n'
ok "php-fpm + nginx reloaded, queue restarted"

say "7/7  Health check"
if curl -sf "https://$DOMAIN/api/health" >/dev/null; then
  ok "site is up: https://$DOMAIN"
else
  die "health check FAILED — site may be down, investigate immediately"
fi

printf '\n\033[1;32m✅ Update complete.\033[0m\n'
