# AWS Lightsail Hyperledger Fabric Deployment

This guide prepares the optional live ledger anchoring path for the thesis demo and hospital pilot.
The clinical system works without Fabric when `BLOCKCHAIN_ENABLED=false`; enable Fabric only after
the network, gateway, queue worker, and smoke test are green.

## What Runs

- Docker Compose Fabric network:
  - `orderer.example.com`
  - `peer0.deamhi.example.com`
  - channel `ereseta-channel`
  - chaincode `prescription`
- Node gateway:
  - binds to `127.0.0.1:3001`
  - talks to Fabric over gRPC/TLS
  - accepts Laravel requests only from localhost
  - can require `X-Fabric-Gateway-Token`
- Laravel queue worker:
  - processes `RecordPrescriptionOnLedger`
  - writes tx ids back to MySQL

## One-Time Bootstrap

Run this after `deploy/scripts/bootstrap-ubuntu.sh` and after the repo is cloned:

```bash
cd /var/www/ereseta/current
sudo APP_USER=ubuntu bash deploy/scripts/bootstrap-fabric-ubuntu.sh
```

Log out and back in after Docker group membership changes, or run:

```bash
newgrp docker
```

## First Network Creation

Run `up` only once. It regenerates crypto and starts a new ledger.

```bash
cd /var/www/ereseta/current/blockchain/network
RUN_DIR=/home/ubuntu/ereseta-fabric FABRIC_HOME=/home/ubuntu/fabric-samples ./deamhi.sh up
RUN_DIR=/home/ubuntu/ereseta-fabric FABRIC_HOME=/home/ubuntu/fabric-samples ./deamhi.sh deployCC
```

After a reboot or normal restart, use `start`, never `up`:

```bash
RUN_DIR=/home/ubuntu/ereseta-fabric FABRIC_HOME=/home/ubuntu/fabric-samples ./deamhi.sh start
```

## Gateway Secret

Generate one shared secret for Laravel and the Node gateway:

```bash
openssl rand -hex 32
```

Put it in `/var/www/ereseta/shared/.env`:

```env
BLOCKCHAIN_ENABLED=true
FABRIC_GATEWAY_URL=http://127.0.0.1:3001
FABRIC_GATEWAY_TIMEOUT=10
FABRIC_GATEWAY_TOKEN=<same-secret>
```

Create `/var/www/ereseta/shared/fabric-gateway.env`:

```env
FABRIC_GATEWAY_TOKEN=<same-secret>
```

Secure it:

```bash
sudo chown root:www-data /var/www/ereseta/shared/fabric-gateway.env
sudo chmod 640 /var/www/ereseta/shared/fabric-gateway.env
```

## Build Gateway

```bash
cd /var/www/ereseta/current/blockchain/gateway
npm ci
npm run build
```

## Install Services

The Fabric network service assumes the Ubuntu user is `ubuntu`. If your instance user differs,
edit `User=`, `Group=`, `FABRIC_HOME`, `RUN_DIR`, and `CRYPTO_PATH` in the service files.

```bash
sudo cp /var/www/ereseta/current/deploy/systemd/ereseta-fabric-network.service /etc/systemd/system/
sudo cp /var/www/ereseta/current/deploy/systemd/ereseta-fabric-gateway.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ereseta-fabric-network.service
sudo systemctl enable --now ereseta-fabric-gateway.service
sudo systemctl restart ereseta-queue.service
```

## Smoke Test

```bash
source /var/www/ereseta/shared/fabric-gateway.env
APP_DIR=/var/www/ereseta/current \
RUN_DIR=/home/ubuntu/ereseta-fabric \
FABRIC_HOME=/home/ubuntu/fabric-samples \
GATEWAY_URL=http://127.0.0.1:3001 \
bash /var/www/ereseta/current/deploy/scripts/fabric-smoke-test.sh
```

Then issue, verify, and dispense a demo prescription in the app. Confirm:

- `prescriptions.blockchain_tx_id` is filled.
- each prescription event has a `blockchain_tx_id`.
- the admin blockchain explorer shows gateway online.

## Backup Notes

MySQL remains the source of truth. For Fabric, preserve:

- `/home/ubuntu/ereseta-fabric/organizations`
- Docker volumes `orderer.example.com` and `peer0.deamhi.example.com`

Do not run `./deamhi.sh down` on a real ledger unless you intend to wipe it.

Use Lightsail snapshots before demo day and before any pentest.

