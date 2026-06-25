#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${BASE_URL:-}}"

if [ -z "$BASE_URL" ]; then
  echo "Usage: BASE_URL=https://your-domain.com bash deploy/scripts/smoke-test.sh"
  echo "   or: bash deploy/scripts/smoke-test.sh https://your-domain.com"
  exit 1
fi

BASE_URL="${BASE_URL%/}"

echo "==> Checking API health"
curl -fsS "$BASE_URL/api/health" | grep -q '"status":"ok"'

echo "==> Checking frontend"
curl -fsSI "$BASE_URL" | grep -qi '^HTTP/.* 200'

echo "==> Checking PWA manifest"
curl -fsSI "$BASE_URL/manifest.webmanifest" | grep -qi '^HTTP/.* 200'

echo "==> Checking service worker"
curl -fsSI "$BASE_URL/sw.js" | grep -qi '^HTTP/.* 200'

echo "==> Checking security headers"
headers="$(curl -fsSI "$BASE_URL/api/health")"
printf '%s\n' "$headers" | grep -qi '^x-frame-options:'
printf '%s\n' "$headers" | grep -qi '^x-content-type-options:'
printf '%s\n' "$headers" | grep -qi '^referrer-policy:'

echo "Smoke test passed for $BASE_URL"

