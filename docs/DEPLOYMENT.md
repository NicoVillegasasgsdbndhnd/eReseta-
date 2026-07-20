# eReseta+ — Deployment Documentation

**System:** eReseta+ — Healthcare Appointment Booking and Patient Record Management System with
Digital Prescription using Hyperledger Fabric
**Institution:** Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI)

> **Note on credentials.** This document describes *what* access is required and *how* it is
> managed. Actual secrets (SSH key, database password, mail API key) are kept in the separate
> **confidential Credentials document**, never in the source repository.

---

## 1. Production Environment

| | |
|---|---|
| **Hosting** | Amazon Web Services — Lightsail (Ubuntu VPS) |
| **Domain** | `deamhi.ph`, `www.deamhi.ph` |
| **Web server** | Nginx (reverse proxy + static SPA) |
| **Application** | PHP 8.4-FPM (Laravel 13) |
| **Database** | MySQL 8.0 |
| **HTTPS** | Let's Encrypt (Certbot), auto-renewing |
| **Blockchain** | Hyperledger Fabric 2.5.15 + Node.js gateway (optional module) |

### Architecture
```
Internet
   │  HTTPS (443)
   ▼
 Nginx ──────────────► /var/www/ereseta/current/web/dist    (React SPA, static)
   │
   └── /api/* ───────► PHP 8.4-FPM ──► Laravel API ──► MySQL
                                          │
                                          ├─► Queue worker  ──► Fabric gateway ──► Hyperledger
                                          └─► Scheduler (cron-like tasks)
```

### Server directory layout
```
/var/www/ereseta/
├── current/     the deployed application (git checkout)
├── shared/      shared configuration (.env)
└── backups/     nightly database dumps (14-day retention)
```

---

## 2. Access Requirements

| Access | Purpose | Where the secret lives |
|--------|---------|------------------------|
| **AWS Lightsail console** | Instance management, snapshots, firewall | AWS account (team-held) |
| **SSH key (.pem)** | Shell access as `ubuntu` | Downloaded from Lightsail; kept offline |
| **Domain registrar / DNS** | `deamhi.ph` A-record → server IP | Registrar account (team-held) |
| **Database user** `ereseta_app` | Application database access | `/var/www/ereseta/shared/.env` (server only) |
| **MySQL admin** | Migrations, backups, rotation | Root via unix socket (`sudo mysql`) — no stored password |
| **Brevo SMTP** | OTP, receipts, activation emails | `MAIL_*` in `.env` (server only) |
| **Application accounts** | System logins per role | Confidential Credentials document |

### Connecting to the server
```bash
ssh -i /path/to/lightsail-key.pem ubuntu@deamhi.ph
```
Or use the **browser-based SSH** in the Lightsail console (no key needed).

---

## 3. Initial Server Setup (one time)

### 3.1 Provision
```bash
sudo bash deploy/scripts/bootstrap-ubuntu.sh
```
Installs Nginx, PHP 8.4-FPM, MySQL, Node.js, Composer and Certbot, and creates the directory layout.

### 3.2 Database and application user
```sql
CREATE DATABASE ereseta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ereseta_app'@'localhost' IDENTIFIED BY '<strong-password>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON ereseta.* TO 'ereseta_app'@'localhost';
FLUSH PRIVILEGES;
```
A **least-privilege** account — deliberately not `root`.

### 3.3 Environment configuration
```bash
cp api/.env.production.example /var/www/ereseta/shared/.env
nano /var/www/ereseta/shared/.env
php artisan key:generate
```
Set `APP_URL`, `APP_ENV=production`, `APP_DEBUG=false`, the `DB_*` values, and the Brevo `MAIL_*`
values. See the **API Documentation & Keys** document for the full key reference.

### 3.4 Web server and HTTPS
```bash
sudo cp deploy/nginx/ereseta.conf /etc/nginx/sites-available/ereseta
sudo ln -s /etc/nginx/sites-available/ereseta /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d deamhi.ph -d www.deamhi.ph
```
Certbot installs the certificate and a renewal timer.

### 3.5 Background services
```bash
sudo cp deploy/systemd/*.service deploy/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ereseta-queue.service     # queue worker
sudo systemctl enable --now ereseta-scheduler.timer   # scheduled tasks
sudo systemctl enable --now ereseta-backup.timer      # nightly backup
```

### 3.6 Provision the administrator
```bash
cd /var/www/ereseta/current/api
php artisan db:seed --class=AdminSeeder
```
Prints a one-time password (or uses `ADMIN_PASSWORD`) and forces a change at first login.

---

## 4. Routine Deployment (updates)

A single command performs a safe update:

```bash
cd /var/www/ereseta/current
bash deploy/scripts/update.sh
```

It performs, in order:
1. `git pull` the latest `main`
2. `composer install --no-dev`
3. `npm ci && npm run build` (frontend)
4. **Dry-runs the migrations on a clone of the production database** — aborts if they fail, leaving
   production untouched
5. Migrates production and rebuilds config/route/view caches
6. Reloads PHP-FPM and Nginx, restarts the queue worker
7. Runs a health check against `https://deamhi.ph/api/health`

The script **does not** re-link `api/.env`, so live mail and blockchain configuration are preserved.

> **Rollback:** take a Lightsail **snapshot** before any risky change. To roll back code only:
> `git reset --hard <previous-commit>` then re-run the update script.

---

## 5. Background Services

| Service | Type | Schedule | Purpose |
|---------|------|----------|---------|
| `ereseta-queue` | service | always running | Blockchain anchoring jobs, queued email |
| `ereseta-scheduler` | timer | every minute | Laravel scheduled tasks |
| `ereseta-backup` | timer | daily 02:30 | Database backup, 14-day retention |
| `ereseta-db-rotate` | timer | monthly, 1st 03:30 | Automatic database password rotation |
| `ereseta-fabric-network` | service | on boot | Hyperledger Fabric network (optional) |
| `ereseta-fabric-gateway` | service | on boot | Node.js Fabric gateway, port 3001 (optional) |

Scheduled tasks include `blockchain:reconcile` (every 5 minutes — re-anchors any prescription that
missed the ledger) and `activation:notify-expired` (hourly — emails patients whose activation link
expired).

**Check status:**
```bash
systemctl status ereseta-queue
systemctl list-timers | grep ereseta
```

---

## 6. Backup and Recovery

### Automated
Nightly at **02:30**, `deploy/scripts/backup-db.sh` writes a gzipped dump to
`/var/www/ereseta/backups/` and prunes anything older than **14 days**.

### Manual backup
```bash
sudo systemctl start ereseta-backup.service
ls -lh /var/www/ereseta/backups/
```

### Restore
```bash
gunzip < /var/www/ereseta/backups/ereseta-<timestamp>.sql.gz | sudo mysql ereseta
```

### Full-instance recovery
Restore the most recent **Lightsail snapshot** from the AWS console, then apply the latest database
backup if needed.

---

## 7. Security Measures in Production

| Measure | Implementation |
|---------|----------------|
| **HTTPS** | Let's Encrypt with auto-renewal; HTTP redirects to HTTPS |
| **Security headers** | Applied by middleware on every response |
| **Database exposure** | MySQL bound to `127.0.0.1` — not reachable from the internet |
| **Least privilege** | Application uses `ereseta_app`, not `root` |
| **Password rotation** | Database password rotated monthly, automatically, with zero downtime |
| **Rate limiting** | Login 10/min, public booking 5/min, authenticated 120/min |
| **Password storage** | bcrypt (salted); unique per account; policy-enforced |
| **Audit trail** | All significant actions logged with user, IP and timestamp |
| **Backups** | Nightly, retained 14 days |
| **Secrets** | Held only in `.env` on the server; never committed to the repository |

---

## 8. Monitoring and Troubleshooting

```bash
# Application health
curl https://deamhi.ph/api/health

# Application errors
tail -n 50 /var/www/ereseta/current/api/storage/logs/laravel.log

# Web server errors
sudo tail -n 50 /var/log/nginx/error.log

# Service status
systemctl status ereseta-queue php8.4-fpm nginx mysql
```

| Symptom | Likely cause / action |
|---------|----------------------|
| 502 Bad Gateway | PHP-FPM down — `sudo systemctl restart php8.4-fpm` |
| Changes not visible | Caches — `php artisan optimize:clear && php artisan config:cache`, reload PHP-FPM |
| Emails not sending | Check `MAIL_*` in `.env`; verify the Brevo account |
| Prescriptions not anchored | Queue worker stopped, or Fabric gateway down — they re-anchor automatically on recovery |
| Migration fails on deploy | The update script catches this on the clone first — read the error and fix before retrying |
| Certificate expiring | `sudo certbot renew --dry-run` |

---

## 9. Related Documents

| Document | Contents |
|----------|----------|
| **Installer Requirements** | Full installation guide, prerequisites, local setup |
| **API Documentation & Keys** | All endpoints and every environment key |
| **Database & Git Repository** | Schema, export/import, repository access |
| **Credentials (confidential)** | Actual account credentials |
| `deploy/README.md` | Detailed server reference in the source tree |
| `deploy/AWS_LIGHTSAIL.md` | AWS Lightsail specifics |
| `HYPERLEDGER_DOCUMENTATION.md` | Complete Hyperledger Fabric reference |
