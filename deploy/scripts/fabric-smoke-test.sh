#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/ereseta/current}"
FABRIC_HOME="${FABRIC_HOME:-$HOME/fabric-samples}"
RUN_DIR="${RUN_DIR:-$HOME/ereseta-fabric}"
GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:3001}"
FABRIC_GATEWAY_TOKEN="${FABRIC_GATEWAY_TOKEN:-}"

RX_ID="${RX_ID:-RX-SMOKE-$(date -u +%Y%m%d%H%M%S)}"
issued_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

header_args=()
if [ -n "$FABRIC_GATEWAY_TOKEN" ]; then
  header_args=(-H "X-Fabric-Gateway-Token: $FABRIC_GATEWAY_TOKEN")
fi

echo "==> Checking Fabric containers"
docker ps --format '{{.Names}}' | grep -q '^orderer.example.com$'
docker ps --format '{{.Names}}' | grep -q '^peer0.deamhi.example.com$'

echo "==> Checking peer channel membership"
cd "$APP_DIR/blockchain/network"
RUN_DIR="$RUN_DIR" FABRIC_HOME="$FABRIC_HOME" ./deamhi.sh start >/tmp/ereseta-fabric-start.log

echo "==> Checking gateway HTTP listener"
status="$(curl -s -o /dev/null -w '%{http_code}' "$GATEWAY_URL/")"
if [ "$status" = "000" ]; then
  echo "Gateway is not reachable at $GATEWAY_URL"
  exit 1
fi

echo "==> Creating smoke prescription on ledger: $RX_ID"
curl -fsS -X POST "$GATEWAY_URL/prescription" \
  -H 'Content-Type: application/json' \
  "${header_args[@]}" \
  -d "{\"prescriptionId\":\"$RX_ID\",\"patientId\":\"smoke-patient\",\"doctorId\":\"smoke-doctor\",\"issuedAt\":\"$issued_at\",\"drugList\":\"[{\\\"drug\\\":\\\"Amoxicillin\\\",\\\"dosage\\\":\\\"500mg\\\"}]\"}" \
  | grep -q '"txId"'

echo "==> Querying smoke prescription"
curl -fsS "$GATEWAY_URL/prescription/$RX_ID" "${header_args[@]}" | grep -q "\"prescriptionId\":\"$RX_ID\""

echo "Fabric smoke test passed: $RX_ID"

