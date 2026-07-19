# eReseta+ — Database & Git Repository

**System:** eReseta+ — Healthcare Appointment Booking and Patient Record Management System with
Digital Prescription using Hyperledger Fabric
**Institution:** Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI)

---

## Part 1 — Database

### 1.1 Overview
| | |
|---|---|
| **Engine** | MySQL 8.0 (MariaDB compatible) |
| **Schema name** | `ereseta` |
| **Charset / collation** | `utf8mb4` / `utf8mb4_unicode_ci` |
| **Tables** | 30 |
| **Migrations** | 58 (versioned, in `api/database/migrations/`) |

The schema is **defined by migrations**, not by a hand-maintained SQL file. Any environment can be
rebuilt exactly with `php artisan migrate`.

### 1.2 Tables by module

**Authentication & users**
| Table | Purpose |
|-------|---------|
| `users` | All accounts (patients, doctors, pharmacists, staff, admins). `email` is UNIQUE; passwords are bcrypt-hashed. Holds activation tracking. |
| `password_reset_tokens` | Password-reset and 48-hour activation tokens (hashed) |
| `personal_access_tokens` | Sanctum API tokens |
| `sessions` | Session storage |
| `staff_requests` | Staff account requests awaiting admin approval |

**Patients & clinical records**
| Table | Purpose |
|-------|---------|
| `patients` | Patient demographics, address, allergies, emergency contact, HMO |
| `patient_records` | Consultation records (chief complaint, vitals, physical exam, diagnosis) |
| `patient_documents` | Uploaded patient files |
| `patient_consents` | RA 10173 consent register (given/withdrawn, versioned) |
| `record_access_grants` | Break-glass / emergency access grants (audited) |

**Appointments**
| Table | Purpose |
|-------|---------|
| `appointment_requests` | Public guest bookings (`REQ-YYYY-NNNN`) pending staff approval |
| `appointments` | Scheduled appointments (`APT-YYYY-NNNN`) |
| `appointment_status_histories` | Full status-change audit trail |
| `doctors` | Doctor profiles, PRC license, specialization, e-signature |
| `doctor_leaves` | Whole-day and per-hour leave blocks |

**Prescriptions (blockchain-anchored)**
| Table | Purpose |
|-------|---------|
| `prescriptions` | Prescription header (`RX-YYYY-NNNN`), status, `blockchain_tx_id` |
| `prescription_items` | Drug lines (generic, dosage, quantity, frequency, duration) |
| `prescription_events` | Lifecycle events (ISSUED / VERIFIED / DISPENSED) with ledger tx ids |
| `medicines` | Generic medicine catalogue (RA 6675) |
| `medicine_brands` | Brand names + availability per generic |

**Diagnostics & billing**
| Table | Purpose |
|-------|---------|
| `diagnostic_tests` | Test catalogue |
| `diagnostic_orders` / `diagnostic_order_items` | Diagnostic orders and their line items |
| `billing_records` | Billing and payment status |

**System**
| Table | Purpose |
|-------|---------|
| `audit_logs` | Security/clinical audit trail (user, action, IP, timestamp) |
| `jobs`, `failed_jobs`, `job_batches` | Queue (blockchain anchoring, emails) |
| `cache`, `cache_locks` | Cache store (hashed booking OTPs) |

### 1.3 Key relationships
```
users 1─1 patients ─┬─< patient_records ──< prescriptions ──< prescription_items
                    │                                    └──< prescription_events
                    ├─< patient_consents
                    ├─< patient_documents
                    └─< appointments >── doctors ──< doctor_leaves
appointment_requests ──1 appointments        users 1─1 doctors
```

### 1.4 Data-integrity rules
- `users.email` — **UNIQUE at the database level** (duplicate accounts impossible even if the app is bypassed).
- Passwords — **bcrypt** (salted), never stored or transmitted in plain text; also unique per account.
- Reference numbers — `APT-`/`REQ-`/`RX-YYYY-NNNN`, generated in model hooks and **UNIQUE**.
- **MySQL is the source of truth**; the blockchain mirrors the prescription lifecycle only.
- **No PII on-chain** — the ledger stores only reference numbers, numeric IDs, timestamps and the
  drug list (RA 10173 data minimisation).

### 1.5 Export the database (for submission)
```bash
# Full dump (schema + data)
mysqldump -u root -p --single-transaction --no-tablespaces ereseta > ereseta_database.sql

# Schema only (no patient data)
mysqldump -u root -p --no-data ereseta > ereseta_schema.sql

# Compressed
mysqldump -u root -p --single-transaction --no-tablespaces ereseta | gzip > ereseta_database.sql.gz
```
On the server, an automated nightly backup runs at 02:30 with 14-day retention
(`deploy/scripts/backup-db.sh` via `ereseta-backup.timer`), writing to `/var/www/ereseta/backups/`.

### 1.6 Import / restore
```bash
mysql -u root -p -e "CREATE DATABASE ereseta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p ereseta < ereseta_database.sql
```

**Or rebuild from scratch with no dump at all:**
```bash
cd api
php artisan migrate:fresh --seed     # ⚠️ drops everything, then rebuilds + seeds demo data
```

> ⚠️ **Privacy note for submission:** a full dump contains patient data. For the Google Drive
> turnover, prefer **`ereseta_schema.sql` (schema only)** plus the seeders, or a dump taken from the
> demo database — not live hospital records (RA 10173).

---

## Part 2 — Git Repository

### 2.1 Repository
| | |
|---|---|
| **Host** | GitHub |
| **URL** | `https://github.com/NicoVillegasasgsdbndhnd/eReseta-` |
| **Default branch** | `main` |
| **Access** | Private repository — collaborator access |

### 2.2 Clone
```bash
git clone https://github.com/NicoVillegasasgsdbndhnd/eReseta-.git eReseta
cd eReseta
```
Then follow **`docs/INSTALLATION.md`**.

### 2.3 Create an offline archive (for Google Drive)
```bash
# Source code without git history
git archive --format=zip --output=eReseta_source.zip main

# Or a full mirror including history
git bundle create eReseta_repo.bundle --all
```
*(Restore a bundle with `git clone eReseta_repo.bundle eReseta`.)*

### 2.4 Repository structure
```
eReseta/
├── api/            Laravel 13 REST API — 100 endpoints, 208 tests
├── web/            React 19 + Vite + TypeScript SPA
├── blockchain/     Hyperledger Fabric (Go chaincode, Node gateway, network scripts)
├── deploy/         Nginx, systemd units, deployment & backup scripts
└── docs/           Turnover documentation
```

### 2.5 What is intentionally NOT in the repository
| Excluded | Why |
|----------|-----|
| `.env` files | Contain secrets (DB password, mail keys, `APP_KEY`) — templates provided as `.env.example` |
| `vendor/`, `node_modules/` | Restored by `composer install` / `npm install` |
| Database dumps | Contain patient data (RA 10173) |
| Fabric crypto material | Generated per machine by `deamhi.sh` |
| Uploaded files (`storage/app`) | Runtime patient documents and photos |

### 2.6 Documentation index
| Document | Contents |
|----------|----------|
| `docs/INSTALLATION.md` | Installer — requirements, local + production setup |
| `docs/API_DOCUMENTATION.md` | All 100 endpoints + environment keys |
| `docs/DATABASE_AND_REPOSITORY.md` | This document |
| `HYPERLEDGER_DOCUMENTATION.md` | Complete Hyperledger Fabric reference |
| `deploy/README.md` | Ubuntu server deployment |
| `deploy/AWS_LIGHTSAIL.md` | AWS Lightsail specifics |
| `BLOCKCHAIN_TAMPER_TEST.md` | Tamper-evidence test procedure |
| `GO_LIVE_CHECKLIST.md` | Pre-production checklist |
