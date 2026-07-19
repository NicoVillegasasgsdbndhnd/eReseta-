# eReseta+ — Installation Guide (Installer)

**System:** eReseta+ — Healthcare Appointment Booking and Patient Record Management System with
Digital Prescription using Hyperledger Fabric
**Institution:** Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI)

---

## 1. System Requirements

| Component | Version | Notes |
|-----------|---------|-------|
| **PHP** | 8.4+ | with `pdo_mysql`, `mbstring`, `openssl`, `gd`, `zip`, `curl` |
| **Composer** | 2.x | PHP dependency manager |
| **Node.js** | 20 LTS or newer | for the React frontend |
| **npm** | 10+ | ships with Node |
| **MySQL / MariaDB** | MySQL 8.0+ | database server |
| **Web server** | Nginx / Apache | or `php artisan serve` for local |
| **Git** | any recent | to clone the repository |

**Optional (blockchain module):** Docker Desktop + WSL2 (Windows) or Docker Engine (Linux),
Hyperledger Fabric 2.5.15 binaries, Go (for chaincode).

### Technology stack
- **Frontend:** React 19 (Vite 8 + TypeScript), Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand
- **Backend:** Laravel 13 (PHP 8.4) REST API
- **Database:** MySQL / MariaDB
- **Auth:** Laravel Sanctum 4 + Spatie Laravel Permission 7
- **PDF:** barryvdh/laravel-dompdf 3
- **Blockchain:** Hyperledger Fabric 2.5.15 (Go chaincode + Node.js gateway)

---

## 2. Local Installation (Development)

### Step 1 — Get the source
```bash
git clone <repository-url> eReseta
cd eReseta
```
*(Or extract the source archive from Google Drive.)*

### Step 2 — Create the database
```sql
CREATE DATABASE ereseta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 3 — Backend (Laravel API)
```bash
cd api
composer install
cp .env.example .env
php artisan key:generate
```

Edit `api/.env` and set at minimum:
```env
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ereseta
DB_USERNAME=root
DB_PASSWORD=

QUEUE_CONNECTION=database     # required for blockchain anchoring jobs
CACHE_STORE=database          # stores hashed booking OTPs
MAIL_MAILER=log               # local: emails are written to storage/logs/laravel.log
```

Run the migrations and seed the demo data:
```bash
php artisan migrate
php artisan db:seed
php artisan storage:link
```

Start the API:
```bash
php artisan serve        # http://localhost:8000
```

### Step 4 — Frontend (React SPA)
In a **second terminal**:
```bash
cd web
npm install
npm run dev              # http://localhost:5173
```

If the API is not on the same origin, create `web/.env`:
```env
VITE_API_URL=http://localhost:8000/api
```

### Step 5 — Background worker (required for prescriptions/blockchain)
In a **third terminal**:
```bash
cd api
php artisan queue:work
```

### Step 6 — Log in
Open **http://localhost:5173** and sign in with any account from the
**Credentials** document (e.g. the administrator account).

> **Note on email locally:** with `MAIL_MAILER=log`, OTPs and activation links are **not** sent to a
> real inbox — they are written to `api/storage/logs/laravel.log`. Open that file to read the code or
> activation link during local testing.

---

## 3. Production Installation (Ubuntu Server)

Full server guide: **`deploy/README.md`** · AWS specifics: **`deploy/AWS_LIGHTSAIL.md`**

### Step 1 — Provision the server
```bash
sudo bash deploy/scripts/bootstrap-ubuntu.sh
```
Installs Nginx, PHP 8.4-FPM, MySQL, Node.js, Composer, Certbot and creates
`/var/www/ereseta/{current,shared,backups}`.

### Step 2 — Create the database and a least-privilege user
```sql
CREATE DATABASE ereseta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ereseta_app'@'localhost' IDENTIFIED BY '<strong-password>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON ereseta.* TO 'ereseta_app'@'localhost';
FLUSH PRIVILEGES;
```

### Step 3 — Configure the environment
```bash
cp api/.env.production.example /var/www/ereseta/shared/.env
nano /var/www/ereseta/shared/.env        # fill DB, MAIL (Brevo), APP_URL, APP_KEY
```

### Step 4 — Deploy
```bash
cd /var/www/ereseta/current
bash deploy/scripts/update.sh
```
This pulls the code, installs dependencies, builds the frontend, **dry-runs the migrations on a clone
of the database first**, migrates, rebuilds caches, reloads services and runs a health check.

### Step 5 — Web server + HTTPS
```bash
sudo cp deploy/nginx/ereseta.conf /etc/nginx/sites-available/ereseta
sudo ln -s /etc/nginx/sites-available/ereseta /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.ph -d www.yourdomain.ph
```

### Step 6 — Background services
```bash
sudo cp deploy/systemd/*.service deploy/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ereseta-queue.service       # queue worker
sudo systemctl enable --now ereseta-scheduler.timer     # scheduled tasks
sudo systemctl enable --now ereseta-backup.timer        # nightly DB backup
```

### Step 7 — Provision the administrator
```bash
cd /var/www/ereseta/current/api
php artisan db:seed --class=AdminSeeder
```
Prints a one-time password (or uses `ADMIN_PASSWORD` from `.env`) and forces a change on first login.

---

## 4. Blockchain Module (Optional)

The Hyperledger Fabric network is **per-machine** and not required for the core system to run — with
`BLOCKCHAIN_ENABLED=false` the application works fully; ledger anchoring is simply skipped.

Full reference: **`HYPERLEDGER_DOCUMENTATION.md`**

```bash
# Start the Fabric network (WSL2 / Linux, Docker required)
cd blockchain/network
bash deamhi.sh up          # FIRST time only — generates crypto + creates the ledger
bash deamhi.sh deployCC    # deploy the Go chaincode
bash deamhi.sh start       # AFTER a reboot — use start, NOT up (up wipes the ledger)

# Start the Node.js gateway (port 3001)
cd ../gateway
npm install && npm start
```

Then in `api/.env`:
```env
BLOCKCHAIN_ENABLED=true
FABRIC_GATEWAY_URL=http://localhost:3001
```
The queue worker (`php artisan queue:work`) must be running for prescriptions to be anchored.

---

## 5. Verification

```bash
# API is up
curl http://localhost:8000/api/health

# Backend test suite (208 tests)
cd api && php artisan test

# Frontend builds
cd web && npm run build
```

Manual check: log in, book an appointment from the public page, approve it as staff, register the
patient, and issue a prescription as a doctor.

---

## 6. Troubleshooting

| Problem | Cause / Fix |
|---------|-------------|
| `500` on any page | Check `api/storage/logs/laravel.log`; ensure `APP_KEY` is set (`php artisan key:generate`) |
| "Nothing to migrate" but tables missing | Wrong `DB_DATABASE` in `.env`; run `php artisan config:clear` |
| Emails not arriving locally | Expected — `MAIL_MAILER=log` writes them to `storage/logs/laravel.log` |
| OTP always invalid | `CACHE_STORE` not configured, or the 2-minute code expired |
| Prescriptions not on the ledger | Queue worker not running, or `BLOCKCHAIN_ENABLED=false`, or gateway down |
| Frontend can't reach API | Set `VITE_API_URL`; rebuild with `npm run build` |
| Changes not showing in production | Caches — run `php artisan optimize:clear && php artisan config:cache` and reload php-fpm |
| Permission errors on storage | `sudo chown -R www-data:www-data storage bootstrap/cache` |

---

## 7. Directory Structure

```
eReseta/
├── api/                  Laravel 13 REST API (backend)
│   ├── app/              Models, Controllers, Services, Jobs, Rules
│   ├── database/         Migrations, seeders, factories
│   ├── routes/api.php    All 100 API endpoints
│   └── tests/            208 automated tests
├── web/                  React + Vite + TypeScript SPA (frontend)
│   └── src/features/     Feature modules (appointments, patients, prescriptions…)
├── blockchain/           Hyperledger Fabric
│   ├── chaincode/        Go smart contract
│   ├── gateway/          Node.js gateway service (:3001)
│   └── network/          deamhi.sh + compose files
├── deploy/               Server deployment (nginx, systemd, scripts)
└── docs/                 Turnover documentation
```
