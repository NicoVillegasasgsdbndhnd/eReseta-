# eReseta+ — Test Runbook (before showing Sir Jondel)

Deploy the latest `main` to AWS, verify the fixes (A/B/C), verify the email flows, then test the
DB password rotation (F). Run in order. **Stop at any ❌ and report it.**

> ### 🚨 Never run `deploy/scripts/deploy.sh`
> Line 21 is `ln -sfn /var/www/ereseta/shared/.env api/.env`. That **replaces the live `.env` with
> the stale one** (`MAIL_MAILER=log`) and silently kills email + blockchain config. Phase 2 below is
> `deploy.sh` **minus that line**.

---

## Phase 0 — Snapshot (do not skip)

Lightsail console → **Snapshots** → *Create snapshot*. Wait for **Available**.
Everything below is reversible from this point.

---

## Phase 1 — Pre-flight (read-only, safe)

```bash
cd /var/www/ereseta/current

ls -l api/.env                                    # must be a REGULAR FILE, not a symlink
grep -E '^(MAIL_MAILER|DB_USERNAME|DB_DATABASE)=' api/.env
sudo mysql -N -B -e "SELECT VERSION()"            # 8.x = zero-downtime rotation
git status --short                                # should be clean
```

| Check | Expected | If not |
|---|---|---|
| `api/.env` | regular file | ❌ **STOP** — if it's a symlink, the live config is already the stale one |
| `MAIL_MAILER` | `smtp` (Brevo) | ❌ **STOP** — email tests will silently "pass" while sending nothing |
| `DB_USERNAME` | `ereseta_app` | ⚠️ if `root`, the rotation script refuses by design |
| MySQL version | `8.x` | ⚠️ MariaDB → rotation still works, brief connection gap |

---

## Phase 2 — Deploy latest `main`

```bash
cd /var/www/ereseta/current
git pull --ff-only origin main

cd api  && composer install --no-dev --optimize-autoloader --no-interaction
cd ../web && npm ci && npm run build
cd ../api
```

### 2a. Prove the migration on a CLONE of the real database first

This migration **already failed once** on Nico's machine (the `doctor_id` FK depended on the unique
index it drops). Prove it against real data before touching production.

```bash
sudo mysqldump --single-transaction --no-tablespaces ereseta > /tmp/ereseta-pre.sql
sudo mysql -e "DROP DATABASE IF EXISTS ereseta_migtest; CREATE DATABASE ereseta_migtest;"
sudo mysql ereseta_migtest < /tmp/ereseta-pre.sql
sudo mysql -e "GRANT ALL ON ereseta_migtest.* TO 'ereseta_app'@'localhost';"

php artisan config:clear                          # cached config ignores env overrides
DB_DATABASE=ereseta_migtest php artisan migrate --force
```

✅ Both migrations run clean → continue.
❌ Any error → **STOP**, paste it. Production is untouched.

```bash
sudo mysql -e "DROP DATABASE ereseta_migtest;"    # clean up
```

### 2b. Migrate + cache for real

```bash
php artisan migrate --force                       # add_time_range_to_doctor_leaves + add_reference_no_to_appointments
php artisan optimize:clear
php artisan config:cache && php artisan route:cache && php artisan view:cache

sudo systemctl reload php8.4-fpm
sudo systemctl reload nginx
sudo systemctl restart ereseta-queue

curl -sf https://deamhi.ph/api/health && echo " ✅ site up"
```

---

## Phase 3 — Verify the fixes + email flows (in the browser)

Emails send **inline**, so a mail failure shows up immediately as a request error — it will not fail
silently in the queue.

| # | Test | Steps | ✅ Expected |
|---|------|-------|------------|
| **2** | Booking OTP | Book an appointment → **Send code** | 6-digit code arrives; a wrong/expired code is rejected; the booking only submits with a valid one |
| **4** | Booking receipt | Submit the booking | Receipt email arrives **with the `REQ-` reference**; the **Print** button works |
| **1** | Name validation | Type `Juan123` / `<script>` in the name | Rejected. Then re-send the request with **Burp/DevTools** bypassing the browser → still **422** (proves it's server-side) |
| **5** | Chief complaint | Look at the booking form | Labeled **"Chief complaint"**, a dropdown |
| **A** | Appointment ref no. | Staff approves the request | Confirmation email shows **`Reference No.: APT-2026-####`** |
| **A** | No appointment without one | `sudo mysql ereseta -e "SELECT id, reference_no FROM appointments ORDER BY id DESC LIMIT 5;"` | Every row has a reference — including older ones created by other paths |
| **6/B** | Activation link | Admin creates a patient | Email says **"valid for 7 days"**, has a **link** (no temp password); the link opens the set-password page and login works after |
| **B** | Reset ≠ activation | Request a password reset | Still expires in **60 min** (deliberately different from the 7-day activation) |
| **C** | Per-hour leave | Doctor → Availability → leave **1 PM–3 PM** | The public booking page no longer offers 1–3 PM **that day only**; other hours still bookable |
| **C** | Whole-month leave | Click **"Leave whole month"** | Remaining days of the month blocked |
| **D** | Rx number in report | Admin → Reports | Prescription reference is the **first column**; PDF export contains it |

---

## Phase 4 — DB password rotation (F)

### 4a. Dry run — reads and verifies, changes nothing

```bash
cd /var/www/ereseta/current
sudo deploy/scripts/rotate-db-password.sh --dry-run
```

✅ Expect to see:
- `current password verified`
- `server=8.x…  dual-password=1` ← zero downtime
- `env files to update: …` ← **should list BOTH `api/.env` and `shared/.env`**
- `dry run complete — nothing was changed`

> If it warns that `shared/.env` had a **different** `DB_PASSWORD`, that means your **nightly backups
> have been running on a stale password**. The rotation re-syncs both files and fixes it.

❌ `the current DB_PASSWORD … does not work` → **STOP**. The `.env` and the database already disagree;
fix that before rotating.

### 4b. Real run

```bash
sudo deploy/scripts/rotate-db-password.sh
sudo tail -30 /var/log/ereseta-db-rotate.log
```

### 4c. Verify — the app, the queue, and the backups

```bash
curl -sf https://deamhi.ph/api/health && echo " ✅ site up with the new password"
systemctl is-active ereseta-queue                                     # active
sudo systemctl start ereseta-backup.service                           # the backup still works
sudo systemctl status ereseta-backup.service --no-pager | tail -5
ls -lt /var/www/ereseta/backups | head -3                             # a fresh dump exists
```

Then click through the site once (log in, open a patient) to be sure.

❌ **If anything is broken:** the script already rolled itself back — but if not, the previous password
is at `/var/lib/ereseta/db-password.previous` and the pre-rotation `.env` copies are in
`/var/lib/ereseta/backup-*/`.

### 4d. Only after all of the above passes — enable the monthly timer

```bash
sudo cp deploy/systemd/ereseta-db-rotate.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ereseta-db-rotate.timer
systemctl list-timers ereseta-db-rotate --no-pager      # next run: 1st of the month, 03:30
```

---

## What this also fixes

Running the rotation **retires the DB password that was exposed on screen/in chat** — that open
item closes itself here.

> ⚠️ The **admin account** password was also exposed. Change that separately in the app.

---

## Then the compliance sheet is honest

Only after Phase 4 passes may the *"DB password should be renewed automatically"* row read
**Complied** instead of *"pending server test"*.
