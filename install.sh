#!/usr/bin/env bash
# ===========================================================================
#  eReseta+ - Automated Installer (Linux / macOS)
#
#  Healthcare Appointment Booking and Patient Record Management System
#  with Digital Prescription using Hyperledger Fabric
#  Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI)
#
#  USAGE:  bash install.sh
# ===========================================================================
set -uo pipefail
cd "$(dirname "$0")"

ok()   { printf '       \033[1;32m[OK]\033[0m %s\n' "$*"; }
bad()  { printf '       \033[1;31m[X]\033[0m  %s\n' "$*"; }
warn() { printf '       \033[1;33m[!]\033[0m  %s\n' "$*"; }
step() { printf '\n\033[1;36m %s\033[0m\n' "$*"; }

echo
echo " =========================================================="
echo "   eReseta+ Installer"
echo " =========================================================="

# ------------------------------------------------------------------ checks
step "[1/7] Checking prerequisites..."
missing=0
for cmd in php composer node npm; do
  if command -v "$cmd" >/dev/null 2>&1; then
    ok "$cmd found"
  else
    bad "$cmd not found"
    missing=1
  fi
done

if [ "$missing" = 1 ]; then
  echo
  echo " Install the missing software above, then run this installer again."
  echo "   PHP 8.4+, Composer 2.x, Node.js 20+, npm 10+"
  exit 1
fi

# ----------------------------------------------------------------- backend
step "[2/7] Installing backend dependencies (this may take a few minutes)..."
cd api
composer install --no-interaction || { bad "composer install failed"; exit 1; }
ok "Backend dependencies installed"

# --------------------------------------------------------------------- env
step "[3/7] Preparing configuration..."
if [ ! -f .env ]; then
  cp .env.example .env
  ok "Created api/.env from the template"
else
  ok "api/.env already exists (left unchanged)"
fi

php artisan key:generate --force >/dev/null || { bad "Could not generate the application key"; exit 1; }
ok "Application key generated"

# ---------------------------------------------------------------- database
step "[4/7] Setting up the database..."
echo "       Make sure your MySQL server is RUNNING."
echo "       The installer will create a database named: ereseta"
echo
read -r -p "       MySQL username [root]: " DBUSER
DBUSER="${DBUSER:-root}"
read -r -s -p "       MySQL password (blank if none): " DBPASS
echo

if command -v mysql >/dev/null 2>&1; then
  if [ -z "$DBPASS" ]; then
    mysql -u "$DBUSER" -e "CREATE DATABASE IF NOT EXISTS ereseta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null \
      && ok "Database 'ereseta' ready" || warn "Could not create the database automatically"
  else
    MYSQL_PWD="$DBPASS" mysql -u "$DBUSER" -e "CREATE DATABASE IF NOT EXISTS ereseta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null \
      && ok "Database 'ereseta' ready" || warn "Could not create the database automatically"
  fi
else
  warn "mysql client not found - create the database manually:"
  echo "         CREATE DATABASE ereseta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
fi

# Write credentials into .env (portable in-place edit)
sed -i.bak \
  -e "s/^DB_DATABASE=.*/DB_DATABASE=ereseta/" \
  -e "s/^DB_USERNAME=.*/DB_USERNAME=${DBUSER}/" \
  -e "s/^DB_PASSWORD=.*/DB_PASSWORD=${DBPASS}/" .env && rm -f .env.bak
ok "Database settings written to api/.env"

# ---------------------------------------------------------------- migrate
step "[5/7] Creating tables and demo data..."
php artisan migrate --force || { bad "Migration failed - is MySQL running with the right credentials?"; exit 1; }
php artisan db:seed --force
php artisan storage:link >/dev/null 2>&1
ok "Database ready with demo data"

cd ..

# ---------------------------------------------------------------- frontend
step "[6/7] Installing frontend dependencies (this may take a few minutes)..."
cd web
npm install || { bad "npm install failed"; exit 1; }
ok "Frontend dependencies installed"
cd ..

# -------------------------------------------------------------------- done
step "[7/7] Installation complete."
echo
echo " =========================================================="
echo "   INSTALLATION SUCCESSFUL"
echo " =========================================================="
echo
echo "   To start the system, run:  bash start.sh"
echo
echo "     Frontend  http://localhost:5173"
echo "     API       http://localhost:8000"
echo
echo "   Log in using the accounts in the Credentials document."
echo
echo "   NOTE: locally, emails (OTP codes, activation links) are written"
echo "         to api/storage/logs/laravel.log instead of being sent."
echo
