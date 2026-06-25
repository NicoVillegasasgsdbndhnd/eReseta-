#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/ereseta/current}"
ENV_FILE="${ENV_FILE:-/var/www/ereseta/shared/.env}"
PHP_BIN="${PHP_BIN:-php}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

cd "$APP_DIR"

echo "==> Syncing ${DEPLOY_BRANCH}"
git fetch origin
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

echo "==> Linking production env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy api/.env.production.example there and fill production values first."
  exit 1
fi
ln -sfn "$ENV_FILE" "$APP_DIR/api/.env"

echo "==> Installing backend dependencies"
cd "$APP_DIR/api"
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

echo "==> Installing frontend dependencies and building"
cd "$APP_DIR/web"
npm ci
npm run build

echo "==> Running database migrations"
cd "$APP_DIR/api"
"$PHP_BIN" artisan migrate --force
"$PHP_BIN" artisan storage:link || true

echo "==> Optimizing Laravel"
"$PHP_BIN" artisan optimize:clear
"$PHP_BIN" artisan config:cache
"$PHP_BIN" artisan route:cache
"$PHP_BIN" artisan view:cache

echo "==> Fixing permissions"
sudo chown -R www-data:www-data "$APP_DIR/api/storage" "$APP_DIR/api/bootstrap/cache" "$APP_DIR/web/dist"
sudo find "$APP_DIR/api/storage" "$APP_DIR/api/bootstrap/cache" -type d -exec chmod 775 {} \;
sudo find "$APP_DIR/api/storage" "$APP_DIR/api/bootstrap/cache" -type f -exec chmod 664 {} \;

echo "==> Reloading services"
sudo systemctl reload php8.4-fpm
sudo systemctl reload nginx
sudo systemctl restart ereseta-queue.service || true

echo "==> Deployment complete"
