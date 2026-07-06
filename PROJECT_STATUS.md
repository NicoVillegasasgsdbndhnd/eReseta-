# Project Status

Quick catch-up note for Mark, Nico, or any teammate/AI joining the project. Chat history does
not sync across machines, so this committed file (plus `CLAUDE.md`, `AGENTS.md`, and Git history)
is the shared source of truth. **Most live-server state below is NOT in git** — it lives only on
the AWS box, so this note is the only record of it.

## Source Of Truth

- Repo: `https://github.com/NicoVillegasasgsdbndhnd/eReseta-.git`
- Branch: `main` (pull before starting work; push when you finish)

## Deployment Status — live at https://deamhi.ph

Deployed and serving over HTTPS on **AWS Lightsail** (Ubuntu 24.04, Singapore `ap-southeast-1`,
8 GB / 2 vCPU / 160 GB, static IP `18.141.85.45`, instance `eRESETA-prod`).

- **HTTPS:** Let's Encrypt cert via Certbot (`--nginx`), **auto-renew** enabled. HTTP→HTTPS 301
  redirect active. nginx `server_name deamhi.ph www.deamhi.ph`. Domain `deamhi.ph` registered at
  dotPH — **expires 2026-09-27** (renew before then or HTTPS/site lapses).
- **Security:** server-side headers via `/etc/nginx/snippets/ereseta-security.conf` (X-Frame-Options
  DENY, X-Content-Type-Options nosniff, Referrer-Policy, **HSTS**). `APP_ENV=production`,
  `APP_DEBUG=false`. MySQL bound to `127.0.0.1` only.
- **Email/SMTP:** **Brevo** SMTP relay in `api/.env` (`MAIL_HOST=smtp-relay.brevo.com`,
  `MAIL_PORT=587`, login `b033de001@smtp-brevo.com`), sending from **`ereseta@deamhi.ph`** (display
  name `eReseta+`). `deamhi.ph` is authenticated with **DKIM + DMARC** records at dotPH, so mail
  lands in the **inbox, not spam**. Provisioning, password-reset, and appointment-approval emails
  send for real. (Switched from Gmail SMTP on 2026-06-28 to fix spam-foldering — no `MAIL_SCHEME`.)
- **`api/.env` (prod):** `APP_URL`/`FRONTEND_URL=https://deamhi.ph`,
  `SANCTUM_STATEFUL_DOMAINS=deamhi.ph,www.deamhi.ph`, `SESSION_SECURE_COOKIE=true`.
  ⚠️ **The `api/.env → shared/.env` symlink is broken — `api/.env` is now a regular file and is the
  COMPLETE live config** (Brevo mail + `BLOCKCHAIN_ENABLED=true` + the Fabric token + HTTPS). The old
  `shared/.env` is **stale** (`MAIL_MAILER=log`, and it was the symlink target) — the app does NOT
  read it. If you re-link or copy from `shared/.env`, first carry over the Brevo + blockchain keys, or
  email breaks and the ledger goes dark. Backups: `api/.env.bak.*`.
- **Frontend:** built with `VITE_API_URL=/api` (same-origin). `vite.config.ts` `navigateFallback`
  is `/index.html` (so SPA deep-route reloads render the app, not the offline page).
- **Accounts/DB:** clean baseline — only `admin@deamhi.ph` exists. **All real doctor/staff/
  pharmacist accounts are created via the admin UI** (leave password blank → temp password emailed +
  forced change on first login). DB data is per-machine and not in git. (The admin password was
  rotated during the baseline reset — it is not the value from any earlier note.)

### Recent changes — 2026-06-30 (Mark) — defense-prep comment cleanup

- **Comments were stripped across the source** (`api/` + `web/src`) for the Tuesday defense — a
  panelist flagged other groups for obviously-AI comments. **Full-line `//` and `/* */` comments were
  blanked** (content removed, left as blank lines) and a few **terse inline labels** were added on the
  key security lines (`// admin only`, `// bcrypt hashing`, `// lifecycle guard`, etc.). Commits
  **`3dd3d71`** + **`3b31813`**.
- **Line numbers were deliberately preserved** (blanked, not deleted) so cheat-sheet code references
  stay valid — please **don't re-add big comment blocks** before the defense, and **`git pull` before
  editing** those files or you'll conflict (175 files touched). Verified: all PHP `php -l` clean, web
  `tsc --noEmit` clean. **`blockchain/` (Go + Node) was NOT touched.**
- Local-only (not committed): defense-prep docs `SYSTEM_REVIEWER.md`, `DEFENSE_NOTES.md`,
  `CHECKLIST_FILLED.md` on Mark's machine; `PENTEST_GUIDE.md` lives on branch `docs/pentest-guide`.

### Recent changes — 2026-06-30 (Nico)

- **Medicine + diagnostic-test catalogs replaced with DEAMHI's real HIS inventory.** Big structural
  change — read the new **"Medicine & Diagnostic Catalog"** section below before touching prescribing,
  dispensing, or the test-order flow. TL;DR: the catalog is now **generic-first, two-table**
  (`medicines` generics → `medicine_brands`), prescribing is **strict generic-only**, and the
  pharmacist **records the brand dispensed**. Imaging tests gained a **Modality → Area** cascade.
- **You must run migrations + catalog seeders after pulling** (see Catch-Up / Redeploy). 3 new
  migrations (`2026_06_30_*`) and the seeders **replace** the catalog from
  `api/database/seeders/data/deamhi_*.csv`.
- Backend **157 tests green**; web `tsc` + `build` clean. Pushed in commit `913fe85`.

### Recent changes — 2026-06-28 (Nico)

- **Blockchain was silently OFF in the running app** and is now fixed. The cached config had
  `fabric.enabled=false` (an earlier `config:cache` had read the stale `api/.env`), so prescriptions
  weren't anchoring. `api/.env` now has `BLOCKCHAIN_ENABLED=true` + the Fabric token; verified
  **Network online** in the admin Blockchain Explorer. Anchors when prescriptions exist.
- **Guest appointment request (homepage):** sends **NO email on submission** — the booking page now
  shows the full confirmation on-screen (name / reference no. / doctor / schedule). The guest is
  emailed **only on staff approval** (new `AppointmentRequestApproved` notification).
- **Staff appointment-requests are scoped to the staff's assigned doctor** (`users.assigned_doctor_id`).
  A staff only sees / can approve / can decline requests for their own doctor (403 otherwise). So
  create each staff **with an assigned doctor**, or their request list is empty by design.

## Blockchain / Hyperledger Fabric — LIVE on AWS

The optional ledger-anchoring module is now **running on the same Lightsail box** and
`BLOCKCHAIN_ENABLED=true`. Fabric 2.5.15, single org `DEAMHIMSP`, 1 peer + 1 etcdraft orderer,
channel `ereseta-channel`, Go chaincode `prescription` (committed, sequence 1). MySQL remains the
source of truth; the ledger mirrors the issue→verify→dispense lifecycle only (no PII on-chain).
Anchoring is async/best-effort via the queued `RecordPrescriptionOnLedger` job — it never blocks a
clinical action.

**What runs on the server (all NOT in git):**
- Fabric network: `orderer.example.com` + `peer0.deamhi.example.com` (Docker), crypto/ledger under
  `/home/ubuntu/ereseta-fabric`, Fabric binaries under `/home/ubuntu/fabric-samples`.
- Node gateway on `127.0.0.1:3001`, token-secured (`X-Fabric-Gateway-Token`).
- Shared secret in `/var/www/ereseta/shared/.env` (`FABRIC_GATEWAY_URL=http://127.0.0.1:3001`,
  `FABRIC_GATEWAY_TIMEOUT=10`, `FABRIC_GATEWAY_TOKEN=…`) and `/var/www/ereseta/shared/fabric-gateway.env`
  (`FABRIC_GATEWAY_TOKEN`, mode `640 root:www-data`).
- systemd units (both enabled, auto-start on boot): `ereseta-fabric-network.service`
  (User=ubuntu, runs `deamhi.sh start`, oneshot) and `ereseta-fabric-gateway.service`
  (User=www-data, `node dist/index.js`). Gateway log: `api/storage/logs/fabric-gateway.log`.

**How it was brought up (one-time):**
1. `sudo APP_USER=ubuntu bash deploy/scripts/bootstrap-fabric-ubuntu.sh` — installs Docker,
   docker compose v2, Go 1.22.12, Fabric 2.5.15 binaries/images/samples; adds `ubuntu` to `docker`.
2. **Reconnect the SSH session** afterward (picks up the `docker` group + Go on PATH).
3. `cd blockchain/network && RUN_DIR=/home/ubuntu/ereseta-fabric FABRIC_HOME=/home/ubuntu/fabric-samples bash deamhi.sh up && … deployCC` (creates crypto/ledger + deploys chaincode).
4. Gateway secret into `shared/.env` + `shared/fabric-gateway.env`; `cd blockchain/gateway && npm ci && npm run build`.
5. ACLs so `www-data` can read the crypto under `/home/ubuntu`:
   `setfacl -m u:www-data:--x /home/ubuntu /home/ubuntu/ereseta-fabric` and
   `setfacl -R -m u:www-data:rX /home/ubuntu/ereseta-fabric/organizations`.
6. Install + enable the two systemd units; smoke test
   (`deploy/scripts/fabric-smoke-test.sh`, with `FABRIC_GATEWAY_TOKEN` exported); then
   `BLOCKCHAIN_ENABLED=true` + `php artisan config:cache` + restart `ereseta-queue.service`.

**Fixes applied during bring-up (now in repo):**
- `deploy/scripts/bootstrap-fabric-ubuntu.sh`: `docker-compose-plugin` (only in Docker's apt repo)
  → `docker-compose-v2` (Ubuntu repo), so the install works on a stock Lightsail box.
- `blockchain/network/deamhi.sh` needed the execute bit on the server (`chmod +x`) for the
  network systemd unit's `./deamhi.sh start`.

**⚠️ Operating rules:**
- After any reboot the network auto-starts via the systemd unit (`deamhi.sh start`). If starting
  manually, use **`start`, NEVER `up`** — `up` regenerates crypto and **wipes the ledger**.
- Do **not** run `deamhi.sh down` on the live ledger.
- The **queue worker must be running** (`ereseta-queue.service`) for prescriptions to anchor.
- Verify health via the admin **Blockchain Explorer** (`/api/blockchain/activity` → `enabled:true`,
  `online:true`) or `deploy/scripts/fabric-smoke-test.sh`.
- A kernel upgrade reboot is pending on the box; safe to reboot (network + gateway auto-start).

## Medicine & Diagnostic Catalog (DEAMHI inventory) — READ BEFORE EXTENDING Rx/dispense/tests

As of 2026-06-30 the placeholder PNF/sample catalog is gone. The system now runs on **DEAMHI's real
HIS export** (the source `.xlsx` files live in `inventory/` — **local only, NOT in git**; the parsed
seed data IS committed at `api/database/seeders/data/deamhi_*.csv`).

**Data model — generic-first, two tables (one-to-many):**
- `medicines` = **generics** (`generic_name` unique, `dosage_form`, `is_available`). ~473 rows.
  The old `brand_name`/`strength`/`route` columns still exist but are **unused/null** — don't build
  on them; brands live in their own table now.
- `medicine_brands` = DEAMHI's actual branded products (~1,116 rows): `medicine_id` (FK→generic),
  `brand_name`, `hospital_code` (HIS barcode), `strength`, `dosage_form`, `packaging`, `is_available`.
- **Rule used to build it:** include *generic-with-brands* and *generic-without-brand*; **exclude
  brand-without-generic** (245 unmappable brand rows were dropped, recognised against the PNF list).
- `diagnostic_tests` gained **`modality`** + **`body_region`** (imaging only; null for lab). 230 rows
  = 135 lab + 95 imaging.
- `prescription_items` gained **`medicine_id`** (the prescribed generic), **`dispensed_brand_id`**
  (+ denormalized `dispensed_brand_name`) — what the pharmacist actually handed out.

**Behavior (don't regress these):**
- **Doctor prescribes by GENERIC only** (strict — no free-text). `MedicineCombobox` only commits a
  catalog pick; the dosage dropdown auto-fills from the generic's distinct **brand strengths**.
  (Generics-only aligns with PH Generics Act RA 6675.)
- **Pharmacist resolves the brand at dispensing** — the Rx Queue dispense dialog has a per-item brand
  picker (auto-selects when one brand is in stock) and records `dispensed_brand_id`. Works with the
  existing partial-dispense flow; backend validates the brand belongs to the item's generic.
- **Diagnostic test ordering** (consultation): Lab = plain search; **Imaging = cascade**
  Modality → Anatomical Area → filtered list (collapses the 95-row radiology menu).
- **Availability is two-level:** toggle a generic (hides all its brands while prescribing) or a single
  brand. Managed on the **Medicines** tab (pharmacist + admin, now a generic→brands accordion) and the
  new **Test Catalog** tab (admin).

**New/changed API (all under `auth:sanctum`):**
- `GET /medicines` now eager-loads brands and returns `strengths[]` + `brand_count`; search matches
  generic OR brand name.
- `GET /medicines/{medicine}/brands?available_only=1` — a generic's brands (pharmacist picker).
- `PUT /medicine-brands/{brand}/availability` — per-brand stock toggle (pharmacist/admin).
- `GET /diagnostic-tests` gained `category` + `per_page` filters (imaging cascade fetches all).
- `POST /diagnostic-tests` accepts `modality` + `body_region`.

**If you add features here:** keep the generic→brand split; thread `medicine_id` on new Rx item code;
record `dispensed_brand_id` on any new dispense path; for new imaging tests set `modality` +
`body_region` so they appear in the cascade. The one-off xlsx→CSV importer was a scratchpad script
(not in the repo) — to re-import, re-run it and overwrite the `deamhi_*.csv` files.

## Redeploy Rule

A redeploy from `main` **must rebuild `web`** (`cd web && npm ci && npm run build`) or the SPA ships
a stale `/api` base + old service worker. Do **not** run demo seeders in prod (they create
`password` logins). After any `.env` change run `php artisan config:cache`.

**A redeploy that includes new migrations must run them** (`php artisan migrate --force`). For the
2026-06-30 catalog change, also run the **catalog seeders** (they REPLACE the catalog and reset
availability flags — intended):
```bash
php artisan db:seed --class=MedicineSeeder --force
php artisan db:seed --class=MedicineBrandSeeder --force
php artisan db:seed --class=DiagnosticTestSeeder --force
```
These three are safe/idempotent (they truncate + reload from the committed `deamhi_*.csv`) and are
**not** demo seeders. Without them the prescribing/test pickers are empty.

## Catch Up On A New Machine

```bash
git clone https://github.com/NicoVillegasasgsdbndhnd/eReseta-.git && cd eReseta-
git checkout main && git pull origin main
cd web && npm install && npx tsc -b --noEmit && npm run build
cd ../api && composer install && php artisan migrate
# Seed the DEAMHI catalog (generics, brands, tests) — required or the Rx/test pickers are empty:
php artisan db:seed --class=MedicineSeeder
php artisan db:seed --class=MedicineBrandSeeder
php artisan db:seed --class=DiagnosticTestSeeder
php artisan test
```

Note: backend requires **PHP 8.4** (the machine default may be 8.2 — use a PHP 8.4 binary for tests).
The local DB needs **MariaDB running**; catalog **data** travels via the committed seeders, not the DB.

## Role Boundaries (keep strict)

- **staff** — guest appointment-request approval + patient registration; the request tab is
  staff-only. `Register Patient` is disabled until the appointment date/time arrives.
- **doctor** — clinical appointments/consultations/records/prescriptions; no request tab, does not
  register patients.
- **pharmacist** — verify/dispense prescriptions only.
- **patient** — own appointments, profile, prescriptions, and `My Records`. Patient **profile**
  and **My Records** stay separate.
- **RA 10173 records-access gate (2026-07-01) — supersedes the old "cross-view is intentional" rule.**
  Opening a patient's clinical record tab (chart / records / rx-safety) is now hard-gated by lawful
  basis: a **doctor** may view only patients they have a care relationship with (a non-cancelled
  appointment **or** a record they authored) — otherwise the chart is masked and they must
  **break the glass** (emergency, 24h grant, logged to an un-deletable admin Security Alert). A
  **non-doctor (staff/admin)** may view only after the patient's **DPA consent** is recorded
  (clinic-mediated; staff/doctor/admin can capture it). Administrative **documents** (IDs/insurance/
  PhilHealth) stay open to staff (legitimate admin task). Restricted-category records keep their
  separate specialty/record-level break-glass on top of this. Gate lives in
  `App\Services\PatientRecordAccess`; admin reviews overrides at **/security-alerts**.

## Watch Areas

- Do not cache clinical API responses in the PWA (online-first; no offline clinical data).
- Run `npx tsc -b --noEmit` + `npm run build` before committing frontend; run backend tests with
  PHP 8.4 before backend changes/releases.
- `ALLOW_ANY_DAY_CONSULTATION=false`: doctors can only start a consultation from a **today**
  appointment — relevant when demoing the full app→ledger prescription flow.
- Don't reintroduce huge blank cards / unbalanced grids in mobile/tablet layouts.

## UI / Merge History

The interface (homepage/public pages, patient, doctor, staff, pharmacist) has been through several
UI + mobile/PWA passes. Merge policy: keep the latest approved Nico/local UI and workflow, keep
Mark-side backend/clinical/access-control logic where more deploy-ready, preserve unique features
unless they duplicate behavior or weaken security/role boundaries. See Git history for specifics.
