#!/usr/bin/env bash
#
# eReseta+ DEAMHI single-org Hyperledger Fabric network (v2.5).
# Runs inside WSL/Ubuntu. Generates crypto, brings up an etcdraft orderer + peer0.deamhi.example.com,
# creates channel 'ereseta-channel', and deploys the prescription chaincode.
#
#   ./deamhi.sh up         # crypto + network + channel
#   ./deamhi.sh deployCC   # package/install/approve/commit the repo chaincode
#   ./deamhi.sh down       # tear everything down
#
# Crypto/artifacts are written to a WSL-native run dir (default ~/ereseta-fabric) to avoid
# /mnt/c file-permission issues. The gateway should set CRYPTO_PATH=<RUN_DIR>/organizations.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FABRIC_HOME="${FABRIC_HOME:-$HOME/fabric-samples}"
RUN_DIR="${RUN_DIR:-$HOME/ereseta-fabric}"
CHANNEL_NAME="ereseta-channel"
CC_NAME="prescription"
CC_SRC="${CC_SRC:-$SCRIPT_DIR/../chaincode/prescription}"
export PATH="$FABRIC_HOME/bin:$PATH"

ORDERER_CA="$RUN_DIR/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem"
PEER_CA="$RUN_DIR/organizations/peerOrganizations/deamhi.example.com/tlsca/tlsca.deamhi.example.com-cert.pem"

peerEnv() {
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID=DEAMHIMSP
  export CORE_PEER_TLS_ROOTCERT_FILE="$PEER_CA"
  export CORE_PEER_MSPCONFIGPATH="$RUN_DIR/organizations/peerOrganizations/deamhi.example.com/users/Admin@deamhi.example.com/msp"
  export CORE_PEER_ADDRESS=localhost:7051
  export FABRIC_CFG_PATH="$FABRIC_HOME/config"   # core.yaml for the peer CLI
}

up() {
  command -v cryptogen >/dev/null || { echo "FATAL: fabric bin not on PATH ($FABRIC_HOME/bin)"; exit 1; }
  mkdir -p "$RUN_DIR" "$RUN_DIR/peercfg" "$RUN_DIR/channel-artifacts"
  cp "$SCRIPT_DIR/crypto-config.yaml" "$SCRIPT_DIR/configtx.yaml" "$SCRIPT_DIR/compose-deamhi.yaml" "$RUN_DIR/"
  cp "$FABRIC_HOME/test-network/compose/docker/peercfg/core.yaml" "$RUN_DIR/peercfg/core.yaml"
  cd "$RUN_DIR"

  echo "==> cryptogen"
  rm -rf organizations
  cryptogen generate --config=crypto-config.yaml --output=organizations || { echo "cryptogen failed"; exit 1; }
  # the gateway reads signcerts/cert.pem; cryptogen names it Admin@deamhi.example.com-cert.pem
  local ADMINSC="organizations/peerOrganizations/deamhi.example.com/users/Admin@deamhi.example.com/msp/signcerts"
  cp "$ADMINSC/Admin@deamhi.example.com-cert.pem" "$ADMINSC/cert.pem"

  echo "==> configtxgen (channel genesis block)"
  FABRIC_CFG_PATH="$RUN_DIR" configtxgen -profile EResetaChannel \
    -outputBlock "channel-artifacts/${CHANNEL_NAME}.block" -channelID "$CHANNEL_NAME" \
    || { echo "configtxgen failed"; exit 1; }

  echo "==> docker compose up"
  docker compose -f compose-deamhi.yaml up -d || { echo "compose up failed"; exit 1; }

  echo "==> osnadmin channel join (orderer)"
  local OCERT="$RUN_DIR/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt"
  local OKEY="$RUN_DIR/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key"
  local rc=1 i=1
  while [ "$rc" -ne 0 ] && [ "$i" -le 12 ]; do
    sleep 3
    osnadmin channel join --channelID "$CHANNEL_NAME" \
      --config-block "channel-artifacts/${CHANNEL_NAME}.block" \
      -o localhost:7053 --ca-file "$ORDERER_CA" --client-cert "$OCERT" --client-key "$OKEY" && rc=0
    i=$((i+1))
  done
  [ "$rc" -eq 0 ] || { echo "FATAL: osnadmin channel join failed"; docker logs orderer.example.com 2>&1 | tail -20; exit 1; }

  echo "==> peer channel join"
  peerEnv
  local rc2=1 j=1
  while [ "$rc2" -ne 0 ] && [ "$j" -le 12 ]; do
    sleep 3
    peer channel join -b "channel-artifacts/${CHANNEL_NAME}.block" && rc2=0
    j=$((j+1))
  done
  [ "$rc2" -eq 0 ] || { echo "FATAL: peer channel join failed"; docker logs peer0.deamhi.example.com 2>&1 | tail -20; exit 1; }

  echo "==> channels on peer:"; peer channel list
  echo "==> DEAMHI network is UP."
}

deployCC() {
  [ -d "$RUN_DIR/organizations" ] || { echo "FATAL: run './deamhi.sh up' first"; exit 1; }
  cd "$RUN_DIR"
  peerEnv

  echo "==> vendoring chaincode (WSL-native copy)"
  rm -rf chaincode && mkdir -p chaincode
  cp -r "$CC_SRC/." chaincode/
  ( cd chaincode && go mod vendor ) || { echo "go mod vendor failed"; exit 1; }

  echo "==> package + install"
  rm -f "${CC_NAME}.tar.gz"
  peer lifecycle chaincode package "${CC_NAME}.tar.gz" --path chaincode --lang golang --label "${CC_NAME}_1.0" || exit 1
  # Tolerate "already successfully installed" (status 500) — the package-id query below validates it.
  peer lifecycle chaincode install "${CC_NAME}.tar.gz" || echo "    (install returned non-zero — likely already installed; continuing)"
  local PKGID
  PKGID=$(peer lifecycle chaincode queryinstalled | sed -n "s/Package ID: \(${CC_NAME}_1.0:[a-f0-9]*\), Label:.*/\1/p")
  [ -n "$PKGID" ] || { echo "FATAL: could not determine package id"; exit 1; }
  echo "    package id: $PKGID"

  echo "==> approve + commit"
  peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
    --channelID "$CHANNEL_NAME" --name "$CC_NAME" --version 1.0 --package-id "$PKGID" --sequence 1 \
    --tls --cafile "$ORDERER_CA" || exit 1
  peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
    --channelID "$CHANNEL_NAME" --name "$CC_NAME" --version 1.0 --sequence 1 \
    --tls --cafile "$ORDERER_CA" --peerAddresses localhost:7051 --tlsRootCertFiles "$PEER_CA" || exit 1

  peer lifecycle chaincode querycommitted --channelID "$CHANNEL_NAME" --name "$CC_NAME" --cafile "$ORDERER_CA"
  echo "==> chaincode '$CC_NAME' committed on '$CHANNEL_NAME'."
}

smoke() {
  cd "$RUN_DIR"
  peerEnv
  echo "==> invoke CreatePrescription(RX-SMOKE-1)"
  peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
    --tls --cafile "$ORDERER_CA" -C "$CHANNEL_NAME" -n "$CC_NAME" \
    --peerAddresses localhost:7051 --tlsRootCertFiles "$PEER_CA" --waitForEvent \
    -c '{"function":"CreatePrescription","Args":["RX-SMOKE-1","1","1","2026-06-02T00:00:00Z","[{\"drug\":\"Amoxicillin\",\"dosage\":\"500mg\"}]"]}' || exit 1
  sleep 2
  echo "==> query QueryPrescriptionById(RX-SMOKE-1)"
  peer chaincode query -C "$CHANNEL_NAME" -n "$CC_NAME" \
    -c '{"function":"QueryPrescriptionById","Args":["RX-SMOKE-1"]}' || exit 1
}

start() {
  [ -d "$RUN_DIR/organizations" ] || { echo "FATAL: no existing network; run './deamhi.sh up' first"; exit 1; }
  cd "$RUN_DIR"
  echo "==> starting existing network (ledger/crypto preserved)"
  docker compose -f compose-deamhi.yaml up -d || { echo "compose up failed"; exit 1; }
  sleep 6
  peerEnv
  peer channel list
  echo "==> network started."
}

stop() {
  [ -f "$RUN_DIR/compose-deamhi.yaml" ] && ( cd "$RUN_DIR" && docker compose -f compose-deamhi.yaml stop ) || true
  echo "==> network stopped (volumes preserved; use 'start' to resume)."
}

down() {
  if [ -f "$RUN_DIR/compose-deamhi.yaml" ]; then
    ( cd "$RUN_DIR" && docker compose -f compose-deamhi.yaml down -v ) || true
  fi
  docker ps -aq --filter "name=dev-peer0.deamhi" | xargs -r docker rm -f 2>/dev/null || true
  docker images -q "dev-peer0.deamhi*" | xargs -r docker rmi -f 2>/dev/null || true
  rm -rf "$RUN_DIR/organizations" "$RUN_DIR/channel-artifacts" "$RUN_DIR/chaincode" "$RUN_DIR/${CC_NAME}.tar.gz" 2>/dev/null || true
  echo "==> DEAMHI network down."
}

case "${1:-}" in
  up)       up ;;
  deployCC) deployCC ;;
  smoke)    smoke ;;
  start)    start ;;
  stop)     stop ;;
  down)     down ;;
  *) echo "usage: $0 {up|deployCC|smoke|start|stop|down}"; exit 1 ;;
esac
