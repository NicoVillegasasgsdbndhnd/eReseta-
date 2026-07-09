#!/bin/bash
# Independent proof: query the Fabric ledger directly via the peer CLI (no web app, no MySQL).
# Portable: uses the current machine's HOME (server = /home/ubuntu, laptop = /home/nico).
# Override the locations if needed:  FABRIC_HOME=… RUN_DIR=… bash _prove.sh RX-…
FABRIC_HOME="${FABRIC_HOME:-$HOME/fabric-samples}"
export PATH="$FABRIC_HOME/bin:/usr/local/bin:/usr/bin:/bin"
RUN="${RUN_DIR:-$HOME/ereseta-fabric}"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=DEAMHIMSP
export CORE_PEER_TLS_ROOTCERT_FILE="$RUN/organizations/peerOrganizations/deamhi.example.com/tlsca/tlsca.deamhi.example.com-cert.pem"
export CORE_PEER_MSPCONFIGPATH="$RUN/organizations/peerOrganizations/deamhi.example.com/users/Admin@deamhi.example.com/msp"
export CORE_PEER_ADDRESS=localhost:7051
export FABRIC_CFG_PATH="$FABRIC_HOME/config"

REF="${1:-RX-2026-0006}"

echo "================================================================"
echo " PROOF 1 — current state on the ledger for $REF"
echo " (asked directly to the Fabric peer, NOT the web app/DB)"
echo "================================================================"
peer chaincode query -C ereseta-channel -n prescription \
  -c "{\"function\":\"QueryPrescriptionById\",\"Args\":[\"$REF\"]}"
echo ""
echo "================================================================"
echo " PROOF 2 — full immutable history for $REF"
echo " (Fabric GetHistoryForKey: every tx that ever touched this key)"
echo "================================================================"
peer chaincode query -C ereseta-channel -n prescription \
  -c "{\"function\":\"GetPrescriptionHistory\",\"Args\":[\"$REF\"]}"
echo ""
echo "================================================================"
echo " PROOF 3 — ledger block height (rises with every transaction)"
echo "================================================================"
peer channel getinfo -c ereseta-channel
