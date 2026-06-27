#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script with sudo."
  exit 1
fi

APP_USER="${APP_USER:-${SUDO_USER:-ubuntu}}"
APP_HOME="$(getent passwd "$APP_USER" | cut -d: -f6)"
FABRIC_VERSION="${FABRIC_VERSION:-2.5.15}"
CA_VERSION="${CA_VERSION:-1.5.12}"
GO_VERSION="${GO_VERSION:-1.22.12}"
FABRIC_HOME="${FABRIC_HOME:-$APP_HOME/fabric-samples}"
RUN_DIR="${RUN_DIR:-$APP_HOME/ereseta-fabric}"

if [ -z "$APP_HOME" ] || [ ! -d "$APP_HOME" ]; then
  echo "Could not find home directory for APP_USER=$APP_USER"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl git jq tar gzip docker.io docker-compose-v2 build-essential

systemctl enable --now docker
usermod -aG docker "$APP_USER" || true

arch="$(dpkg --print-architecture)"
case "$arch" in
  amd64) go_arch="amd64" ;;
  arm64) go_arch="arm64" ;;
  *) echo "Unsupported architecture for Go install: $arch"; exit 1 ;;
esac

if ! command -v go >/dev/null 2>&1; then
  echo "==> Installing Go ${GO_VERSION}"
  curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-${go_arch}.tar.gz" -o /tmp/go.tgz
  rm -rf /usr/local/go
  tar -C /usr/local -xzf /tmp/go.tgz
  rm -f /tmp/go.tgz
  cat >/etc/profile.d/go.sh <<'EOF'
export PATH=/usr/local/go/bin:$PATH
EOF
fi

echo "==> Installing Hyperledger Fabric ${FABRIC_VERSION} assets for ${APP_USER}"
sudo -u "$APP_USER" bash -lc "
  set -euo pipefail
  cd '$APP_HOME'
  if [ ! -d '$FABRIC_HOME/bin' ]; then
    curl -fsSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh -o install-fabric.sh
    chmod +x install-fabric.sh
    PATH=/usr/local/go/bin:\$PATH ./install-fabric.sh binary docker samples -f '$FABRIC_VERSION' -c '$CA_VERSION'
  fi
"

mkdir -p "$RUN_DIR"
chown -R "$APP_USER:$APP_USER" "$RUN_DIR" "$FABRIC_HOME"

echo "Fabric bootstrap complete."
echo "Log out and back in, or run 'newgrp docker', before running Docker as ${APP_USER}."

