#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script with sudo."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y software-properties-common ca-certificates curl gnupg unzip git nginx mysql-server supervisor certbot python3-certbot-nginx

add-apt-repository -y ppa:ondrej/php
apt-get update
apt-get install -y \
  php8.4 php8.4-fpm php8.4-cli php8.4-common php8.4-mysql php8.4-xml php8.4-mbstring \
  php8.4-curl php8.4-zip php8.4-gd php8.4-bcmath php8.4-intl php8.4-readline

if ! command -v composer >/dev/null 2>&1; then
  curl -fsSL https://getcomposer.org/installer -o /tmp/composer-setup.php
  php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer
  rm -f /tmp/composer-setup.php
fi

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

mkdir -p /var/www/ereseta/shared /var/www/ereseta/backups
chown -R www-data:www-data /var/www/ereseta
usermod -aG www-data "${SUDO_USER:-ubuntu}" || true

systemctl enable --now nginx
systemctl enable --now php8.4-fpm
systemctl enable --now mysql

echo "Bootstrap complete. Clone the repo into /var/www/ereseta/current and configure /var/www/ereseta/shared/.env next."

