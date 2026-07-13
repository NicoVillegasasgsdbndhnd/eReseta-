# eReseta+ Ubuntu Deployment

This is the supported deployment path for the capstone demo and first AWS Lightsail deployment: one Ubuntu instance
running Nginx, PHP 8.4 FPM, MySQL, the Laravel queue worker, Laravel scheduler, and the built
React SPA. Hyperledger Fabric remains optional and should be brought up only when live ledger
anchoring is part of the demo.

For AWS-specific instance, networking, backup, and pentest notes, read `deploy/AWS_LIGHTSAIL.md`.

## Server Layout

Use this layout on the server:

```text
/var/www/ereseta/current        # cloned repo
/var/www/ereseta/shared/.env    # production Laravel env, not committed
/var/www/ereseta/backups        # database backups
```

Nginx serves:

- `/` from `web/dist`
- `/api/*` through Laravel at `api/public/index.php`
- `/storage/*` from Laravel public storage

## One-Time Server Setup

1. Create an Ubuntu 24.04 Lightsail instance.
2. Point the domain DNS to the instance public IP.
3. SSH into the server.
4. Clone the repo:

   ```bash
   sudo mkdir -p /var/www/ereseta
   sudo chown -R "$USER":www-data /var/www/ereseta
   git clone https://github.com/NicoVillegasasgsdbndhnd/eReseta-.git /var/www/ereseta/current
   cd /var/www/ereseta/current
   git checkout main
   ```

5. Run the bootstrap script:

   ```bash
   sudo bash deploy/scripts/bootstrap-ubuntu.sh
   ```

6. Create the production env:

   ```bash
   sudo mkdir -p /var/www/ereseta/shared
   cp api/.env.production.example /var/www/ereseta/shared/.env
   nano /var/www/ereseta/shared/.env
   ln -sfn /var/www/ereseta/shared/.env api/.env
   php api/artisan key:generate
   ```

7. Copy the Nginx config and replace placeholders:

   ```bash
   sudo cp deploy/nginx/ereseta.conf /etc/nginx/sites-available/ereseta.conf
   sudo nano /etc/nginx/sites-available/ereseta.conf
   sudo ln -sfn /etc/nginx/sites-available/ereseta.conf /etc/nginx/sites-enabled/ereseta.conf
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl reload nginx
   ```

8. Install TLS:

   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

9. Install systemd units:

   ```bash
   sudo cp deploy/systemd/ereseta-queue.service /etc/systemd/system/
   sudo cp deploy/systemd/ereseta-scheduler.service /etc/systemd/system/
   sudo cp deploy/systemd/ereseta-scheduler.timer /etc/systemd/system/
   sudo cp deploy/systemd/ereseta-backup.service /etc/systemd/system/
   sudo cp deploy/systemd/ereseta-backup.timer /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now ereseta-queue.service
   sudo systemctl enable --now ereseta-scheduler.timer
   sudo systemctl enable --now ereseta-backup.timer
   ```

10. Deploy the app:

    ```bash
    bash deploy/scripts/deploy.sh
    ```

## Database

Create a dedicated MySQL user before the first deploy:

```sql
CREATE DATABASE ereseta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ereseta_app'@'localhost' IDENTIFIED BY 'change-this-strong-password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
ON ereseta.* TO 'ereseta_app'@'localhost';
FLUSH PRIVILEGES;
```

Use those values in `/var/www/ereseta/shared/.env`.

### Automatic password rotation

`deploy/scripts/rotate-db-password.sh` rotates `ereseta_app`'s password, updates every `.env` that
carries it, re-caches the config, reloads php-fpm and restarts the queue worker — rolling everything
back if any step fails. On MySQL 8 it uses dual passwords, so there is **no downtime**.

Test it **before** enabling the timer (take a Lightsail snapshot first):

```bash
# 1. Dry run — reads and verifies, changes nothing.
sudo APP_DIR=/var/www/ereseta/current deploy/scripts/rotate-db-password.sh --dry-run

# 2. Real run, watched.
sudo deploy/scripts/rotate-db-password.sh
sudo tail -20 /var/log/ereseta-db-rotate.log

# 3. Confirm the app, the queue, and the backups still work.
curl -sf https://<domain>/api/health && echo OK
systemctl is-active ereseta-queue
sudo systemctl start ereseta-backup.service && sudo systemctl status ereseta-backup.service --no-pager
```

Only once that passes:

```bash
sudo cp deploy/systemd/ereseta-db-rotate.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ereseta-db-rotate.timer
systemctl list-timers ereseta-db-rotate --no-pager
```

**Manual recovery** (if the app can't reach the DB after a rotation): the previous password is at
`/var/lib/ereseta/db-password.previous` and the pre-rotation `.env` copies are in
`/var/lib/ereseta/backup-*/`. Restore with
`ALTER USER 'ereseta_app'@'localhost' IDENTIFIED BY '<previous>';`, put that value back in the `.env`
files, then `php artisan config:cache` and reload php-fpm.

## Web Build Env

Copy `web/.env.production.example` to `web/.env.production` before `npm run build` if the API
URL is not the same origin:

```bash
cp web/.env.production.example web/.env.production
nano web/.env.production
```

For the recommended same-domain Nginx deployment, keep:

```env
VITE_API_URL=/api
```

## Optional Blockchain / Fabric Gateway

Only enable this if the Fabric network will run on the same server or on a reachable private host.
For AWS Lightsail, follow the full Fabric runbook in `deploy/blockchain/AWS_FABRIC.md` first.

```bash
cd blockchain/gateway
npm ci
npm run build
sudo cp ../../deploy/systemd/ereseta-fabric-network.service /etc/systemd/system/
sudo cp ../../deploy/systemd/ereseta-fabric-gateway.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ereseta-fabric-network.service
sudo systemctl enable --now ereseta-fabric-gateway.service
```

Set these in `api/.env`:

```env
BLOCKCHAIN_ENABLED=true
FABRIC_GATEWAY_URL=http://127.0.0.1:3001
FABRIC_GATEWAY_TOKEN=<same-secret-used-by-gateway>
```

If Fabric is not stable for the demo, set `BLOCKCHAIN_ENABLED=false`; clinical actions still work.

## Smoke Tests

After deployment:

```bash
curl -fsS https://your-domain.com/api/health
curl -I https://your-domain.com
bash deploy/scripts/smoke-test.sh https://your-domain.com
systemctl status ereseta-queue.service --no-pager
systemctl list-timers ereseta-scheduler.timer --no-pager
systemctl list-timers ereseta-backup.timer --no-pager
```

Then manually test:

- public appointment request
- login for each role
- staff request approval and patient registration
- doctor consultation and prescription creation
- pharmacist verify and dispense
- patient records and prescriptions visibility
