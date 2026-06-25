# AWS Lightsail Production Deployment

Use this guide for the paid AWS deployment. It complements `deploy/README.md`, which contains
the server commands.

## Recommended Starting Instance

For a hospital pilot with pharmacy workflows:

- Platform: Linux/Unix
- Blueprint: Ubuntu 24.04 LTS
- Plan: 2 vCPU / 8 GB RAM or better
- Disk: 160 GB SSD or better
- Static IP: yes
- Backups/snapshots: enabled

Avoid the smallest Lightsail plans for a hospital demo because Composer, Vite builds, MySQL,
queue work, PDF generation, and logs can compete for memory.

## Lightsail Networking

Open only:

- TCP 22 from trusted admin IPs if possible
- TCP 80 from the internet, only for HTTP to HTTPS redirect and Let's Encrypt
- TCP 443 from the internet

Do not expose:

- MySQL `3306`
- PHP-FPM
- Fabric peer/orderer ports
- Fabric gateway `3001`

The public app should be reachable through HTTPS only.

## DNS

1. Create a Lightsail static IP and attach it to the instance.
2. Point the hospital/demo domain `A` record to that static IP.
3. Wait for DNS propagation before running Certbot.

## Deployment Flow

On the server:

```bash
git clone https://github.com/NicoVillegasasgsdbndhnd/eReseta-.git /var/www/ereseta/current
cd /var/www/ereseta/current
git checkout main
sudo bash deploy/scripts/bootstrap-ubuntu.sh
```

Then follow `deploy/README.md` to configure `.env`, Nginx, TLS, systemd services, and the first
release.

For testing a deployment branch before merging to `main`:

```bash
DEPLOY_BRANCH=deploy/aws-production-ready bash deploy/scripts/deploy.sh
```

For normal production releases:

```bash
bash deploy/scripts/deploy.sh
```

## Backups

Install the backup timer:

```bash
sudo cp deploy/systemd/ereseta-backup.service /etc/systemd/system/
sudo cp deploy/systemd/ereseta-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ereseta-backup.timer
```

Run a manual backup:

```bash
sudo -u www-data APP_DIR=/var/www/ereseta/current ENV_FILE=/var/www/ereseta/shared/.env \
  BACKUP_DIR=/var/www/ereseta/backups bash deploy/scripts/backup-db.sh
```

Keep at least one off-server copy before real hospital data is entered.

## Smoke Test

After each deploy:

```bash
bash deploy/scripts/smoke-test.sh https://your-domain.com
```

Then manually test the role workflows listed in `GO_LIVE_CHECKLIST.md`.

## Optional Blockchain

If live prescription ledger anchoring is part of the deployment, follow:

```text
deploy/blockchain/AWS_FABRIC.md
```

Keep Fabric peer/orderer ports and gateway port `3001` private. The gateway should bind to
`127.0.0.1` and use `FABRIC_GATEWAY_TOKEN`.

## Pentest Readiness

Before a pentest:

- Use written authorization from the hospital/system owner.
- Use a test window and test accounts.
- Confirm backups and restore procedure.
- Keep `APP_DEBUG=false`.
- Do not run denial-of-service, stress, or destructive tests.
- Do not use real patient data unless the hospital explicitly approves it and the privacy officer signs off.
- Confirm logs are retained and reviewable after testing.
