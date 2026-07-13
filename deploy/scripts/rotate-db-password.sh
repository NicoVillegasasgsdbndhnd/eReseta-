#!/usr/bin/env bash
#
# Rotate the eReseta+ application database password.
#
#   sudo deploy/scripts/rotate-db-password.sh [--dry-run]
#
# Run as root: it needs an admin MySQL login (root via unix socket) and systemctl.
# Normally driven by ereseta-db-rotate.timer (monthly).
#
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/ereseta/current}"
SHARED_ENV="${SHARED_ENV:-/var/www/ereseta/shared/.env}"
STATE_DIR="${STATE_DIR:-/var/lib/ereseta}"
LOG_FILE="${LOG_FILE:-/var/log/ereseta-db-rotate.log}"
FPM_SERVICE="${FPM_SERVICE:-php8.4-fpm}"
QUEUE_SERVICE="${QUEUE_SERVICE:-ereseta-queue}"
APP_USER="${APP_USER:-www-data}"
PHP_BIN="${PHP_BIN:-/usr/bin/php}"
API_DIR="$APP_DIR/api"

# Admin login used to run ALTER USER. Ubuntu's mysql-server authenticates root
# via the unix socket, so no password is stored anywhere for this.
# shellcheck disable=SC2206
MYSQL_ADMIN=(${MYSQL_ADMIN_CMD:-mysql --protocol=socket -uroot})

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

log()  { printf '%s  %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG_FILE"; }
die()  { log "FAILED: $*"; exit 1; }

# --------------------------------------------------------------------------
# env file helpers
# --------------------------------------------------------------------------

# Same parser as backup-db.sh, so both scripts read the file identically.
read_env() {
  local key="$1" file="$2" value
  value="$(grep -E "^${key}=" "$file" | tail -n 1 | cut -d '=' -f 2- || true)"
  value="${value%%[[:space:]]#*}"
  value="${value%$'\r'}"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

# Rewrite DB_PASSWORD in place. Writes to a temp file in the same directory and
# renames it, so a crash mid-write can never leave a half-written .env.
write_env_password() {
  local file="$1" newpass="$2" tmp
  tmp="$(mktemp "${file}.rotate.XXXXXX")"
  chmod --reference="$file" "$tmp"
  chown --reference="$file" "$tmp"
  awk -v pw="$newpass" '
    /^DB_PASSWORD=/ { if (!seen) { print "DB_PASSWORD=" pw; seen = 1 } ; next }
                    { print }
    END             { if (!seen) print "DB_PASSWORD=" pw }
  ' "$file" > "$tmp"
  mv -f "$tmp" "$file"
}

ENV_FILES=()
add_env_file() {
  local f="$1" real existing
  [ -e "$f" ] || return 0
  # Resolve symlinks: deploy.sh points api/.env at shared/.env. Editing the link
  # itself would replace it with a regular file and break the deploy layout.
  real="$(readlink -f "$f")"
  for existing in "${ENV_FILES[@]:-}"; do
    [ "$existing" = "$real" ] && return 0
  done
  grep -qE '^DB_PASSWORD=' "$real" || return 0
  ENV_FILES+=("$real")
}

# --------------------------------------------------------------------------
# database helpers
# --------------------------------------------------------------------------

# Connect exactly the way the app does (TCP to 127.0.0.1), not via the socket,
# so a successful check here really means the app can log in.
db_login_ok() {
  local user="$1" pass="$2"
  MYSQL_PWD="$pass" mysql --protocol=TCP \
    -h"$DB_HOST" -P"${DB_PORT:-3306}" -u"$user" \
    -e 'SELECT 1' "$DB_DATABASE" >/dev/null 2>&1
}

sql_admin() { "${MYSQL_ADMIN[@]}" -N -B -e "$1"; }

gen_password() {
  local pw
  # Hex: alphanumeric by construction, so it needs no escaping in .env, in SQL,
  # or in the shell. 24 bytes = 192 bits of entropy.
  pw="$(openssl rand -hex 24)"
  [ "${#pw}" -ge 24 ] || die "generated password is too short"
  printf '%s' "$pw"
}

# --------------------------------------------------------------------------
# rollback
# --------------------------------------------------------------------------

ALTER_APPLIED=0
BACKUP_DIR=""

rollback() {
  log "!! rolling back to the previous password"

  if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
    local i=0 f
    for f in "${ENV_FILES[@]}"; do
      if [ -f "$BACKUP_DIR/$i.env" ]; then
        cat "$BACKUP_DIR/$i.env" > "$f"   # '>' keeps the original inode/owner/mode
        log "   restored $f"
      fi
      i=$((i + 1))
    done
  fi

  if [ "$ALTER_APPLIED" = 1 ]; then
    sql_admin "ALTER USER '${DB_USERNAME}'@'localhost' IDENTIFIED BY '${OLD_PASSWORD}';" \
      && log "   restored the MySQL password" \
      || log "   !! could not restore the MySQL password — see manual recovery below"
    sql_admin "ALTER USER '${DB_USERNAME}'@'localhost' DISCARD OLD PASSWORD;" >/dev/null 2>&1 || true
  fi

  sudo -u "$APP_USER" "$PHP_BIN" artisan config:cache --no-interaction >/dev/null 2>&1 || true
  systemctl reload "$FPM_SERVICE"  >/dev/null 2>&1 || true
  systemctl restart "$QUEUE_SERVICE" >/dev/null 2>&1 || true

  log "!! rollback done — the OLD password is in effect and the app should be serving"
  log "   manual recovery, if needed: previous password is in $STATE_DIR/db-password.previous"
}

fail() { rollback; die "$*"; }

# --------------------------------------------------------------------------
# preflight
# --------------------------------------------------------------------------

[ "$(id -u)" -eq 0 ] || die "must run as root (needs MySQL admin + systemctl)"
[ -d "$API_DIR" ]    || die "missing API dir: $API_DIR"
command -v mysql   >/dev/null || die "mysql client not found"
command -v openssl >/dev/null || die "openssl not found"

mkdir -p "$STATE_DIR" && chmod 700 "$STATE_DIR"
touch "$LOG_FILE" && chmod 600 "$LOG_FILE"

log "=== db password rotation starting${DRY_RUN:+ (dry run)} ==="

add_env_file "$API_DIR/.env"
add_env_file "$SHARED_ENV"
[ "${#ENV_FILES[@]}" -gt 0 ] || die "no .env file containing DB_PASSWORD was found"

# The app reads api/.env, so that is the source of truth for the current creds.
PRIMARY_ENV="${ENV_FILES[0]}"
DB_HOST="$(read_env DB_HOST "$PRIMARY_ENV")"
DB_PORT="$(read_env DB_PORT "$PRIMARY_ENV")"
DB_DATABASE="$(read_env DB_DATABASE "$PRIMARY_ENV")"
DB_USERNAME="$(read_env DB_USERNAME "$PRIMARY_ENV")"
OLD_PASSWORD="$(read_env DB_PASSWORD "$PRIMARY_ENV")"

[ -n "$DB_USERNAME" ] || die "DB_USERNAME is empty in $PRIMARY_ENV"
[ -n "$DB_DATABASE" ] || die "DB_DATABASE is empty in $PRIMARY_ENV"
[ -n "$OLD_PASSWORD" ] || die "DB_PASSWORD is empty in $PRIMARY_ENV — refusing to rotate from an unknown state"

if [ "$DB_USERNAME" = "root" ]; then
  die "refusing to rotate the 'root' account — point DB_USERNAME at the app user (e.g. ereseta_app)"
fi

log "user=$DB_USERNAME db=$DB_DATABASE host=$DB_HOST:${DB_PORT:-3306}"
log "env files to update: ${ENV_FILES[*]}"

# Warn if shared/.env has drifted from api/.env. Rotation writes the same new
# password to both, which also repairs the drift.
for f in "${ENV_FILES[@]:1}"; do
  if [ "$(read_env DB_PASSWORD "$f")" != "$OLD_PASSWORD" ]; then
    log "WARNING: $f had a DIFFERENT DB_PASSWORD than $PRIMARY_ENV (backups may have been failing); it will be re-synced"
  fi
done

sql_admin 'SELECT 1' >/dev/null 2>&1 || die "cannot log in to MySQL as admin (${MYSQL_ADMIN[*]})"

# Never rotate from a state we do not understand: if the password on file does
# not actually work, rolling back would not restore a working app.
db_login_ok "$DB_USERNAME" "$OLD_PASSWORD" \
  || die "the current DB_PASSWORD in $PRIMARY_ENV does not work — fix that first, then rotate"
log "current password verified"

# MySQL 8 can hold a primary AND a secondary password at once, so old and new
# both work during the swap = zero downtime. MariaDB cannot; there the app has a
# brief window (a second or two) where new connections fail.
SERVER_VERSION="$(sql_admin 'SELECT VERSION()')"
DUAL_PASSWORD=1
case "$SERVER_VERSION" in
  *MariaDB*) DUAL_PASSWORD=0 ;;
  5.*)       DUAL_PASSWORD=0 ;;
esac
log "server=$SERVER_VERSION dual-password=$DUAL_PASSWORD"
[ "$DUAL_PASSWORD" = 1 ] || log "WARNING: no dual-password support — expect a brief connection gap during the swap"

if [ "$DRY_RUN" = 1 ]; then
  log "dry run: would rotate '$DB_USERNAME', rewrite ${#ENV_FILES[@]} env file(s), re-cache config, reload $FPM_SERVICE, restart $QUEUE_SERVICE"
  log "=== dry run complete — nothing was changed ==="
  exit 0
fi

# --------------------------------------------------------------------------
# rotate
# --------------------------------------------------------------------------

NEW_PASSWORD="$(gen_password)"

BACKUP_DIR="$STATE_DIR/backup-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR" && chmod 700 "$BACKUP_DIR"
i=0
for f in "${ENV_FILES[@]}"; do
  cp -p "$f" "$BACKUP_DIR/$i.env"
  i=$((i + 1))
done
printf '%s\n' "$OLD_PASSWORD" > "$STATE_DIR/db-password.previous"
chmod 600 "$STATE_DIR/db-password.previous"
log "backed up env files to $BACKUP_DIR"

if [ "$DUAL_PASSWORD" = 1 ]; then
  sql_admin "ALTER USER '${DB_USERNAME}'@'localhost' IDENTIFIED BY '${NEW_PASSWORD}' RETAIN CURRENT PASSWORD;" \
    || die "ALTER USER failed — nothing changed"
  ALTER_APPLIED=1
  log "new password set; old one still accepted (dual password)"
else
  sql_admin "ALTER USER '${DB_USERNAME}'@'localhost' IDENTIFIED BY '${NEW_PASSWORD}';" \
    || die "ALTER USER failed — nothing changed"
  ALTER_APPLIED=1
  log "new password set (old one is now rejected)"
fi

db_login_ok "$DB_USERNAME" "$NEW_PASSWORD" || fail "the new password does not authenticate"
log "new password verified against the database"

for f in "${ENV_FILES[@]}"; do
  write_env_password "$f" "$NEW_PASSWORD" || fail "could not write $f"
  log "updated $f"
done

cd "$API_DIR"
sudo -u "$APP_USER" "$PHP_BIN" artisan config:clear --no-interaction >/dev/null 2>&1 || true
sudo -u "$APP_USER" "$PHP_BIN" artisan config:cache --no-interaction >/dev/null \
  || fail "config:cache failed"

# Prove Laravel itself can connect with the new cached config, not just the CLI.
sudo -u "$APP_USER" "$PHP_BIN" artisan db:show --no-interaction >/dev/null 2>&1 \
  || fail "the app cannot connect with the new password"
log "app verified against the new password"

# php-fpm caches the compiled config in opcache; the queue worker holds it in
# memory. Both must be recycled or they keep using the old password.
systemctl reload "$FPM_SERVICE"    || fail "could not reload $FPM_SERVICE"
systemctl restart "$QUEUE_SERVICE" || log "WARNING: could not restart $QUEUE_SERVICE — restart it manually"
log "reloaded $FPM_SERVICE and restarted $QUEUE_SERVICE"

if [ "$DUAL_PASSWORD" = 1 ]; then
  sql_admin "ALTER USER '${DB_USERNAME}'@'localhost' DISCARD OLD PASSWORD;" \
    || log "WARNING: could not discard the old password — it may still be accepted"
  log "old password discarded"
fi

# Keep the last 6 env backups.
find "$STATE_DIR" -maxdepth 1 -type d -name 'backup-*' -printf '%T@ %p\n' 2>/dev/null \
  | sort -rn | tail -n +7 | cut -d' ' -f2- | xargs -r rm -rf

log "=== rotation complete ==="
