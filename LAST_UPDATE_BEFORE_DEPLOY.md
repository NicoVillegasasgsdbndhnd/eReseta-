# Last Update Before Deploy

Guidance for the deploying member (and future sessions) on what changed in the
pre-deployment round of 2026-06-27, plus the env/config it needs to work in production.

---

## ⚠️ Note for Mark — delete `HANDOFF.md`

`HANDOFF.md` is obsolete: it only contains **old updates and past handoffs** that are no
longer needed. **This file (`LAST_UPDATE_BEFORE_DEPLOY.md`) is the final handoff before
deploy** — it supersedes `HANDOFF.md` entirely.

- If a copy of `HANDOFF.md` still exists **on your machine / in your local working tree**,
  delete it (`git rm HANDOFF.md` if it's tracked, then commit) so it can't get re-committed
  or re-pushed to the repo.
- Going forward, use `PROJECT_STATUS.md` for ongoing status and this file for the
  pre-deploy summary. There is nothing left in `HANDOFF.md` worth keeping.

---

## 1. What was added

### A. Admin interface UI redesign
Brought the admin screens up to the enhanced "operational console" language used by the
other roles — compact chips instead of empty stat boxes, worklists, consistent headers.
- **Dashboard** — hero band + KPI panel, prescription-pipeline chart, appointments-by-status,
  recent audit activity, system status.
- **Patients** — registry layout, compact metric chips (total / new this week / PhilHealth
  coverage), enriched rows (age, patient code).
- **Prescriptions** — removed the decorative gradient hero; status-filter pills now carry live
  lifecycle counts.
- **Reports** — rebuilt as a **filterable, CSV-exportable** table (date range + status), **no
  charts**. Uses the accurate `/reports/*` endpoints instead of paginated page-1 data.
- **Users** — operational header + role-distribution chips.
- **Audit Logs** — security-themed header with a "sensitive events" alert, compact role filter,
  user search, and break-glass/delete row emphasis.

### B. Admin onboarding hardening (security)
- **`AdminSeeder`** — the first admin is now provisioned from env: set `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` / `ADMIN_NAME`. If `ADMIN_PASSWORD` is omitted, a strong random one is
  generated and **printed once** to the console. The account is flagged
  `must_change_password`, so there is **no shipped/known default credential**.
- **`UserController@store`** — the password field is now optional. Leave it blank and the system
  **auto-generates a temporary password**, forces a first-login change, emails an
  `AccountProvisioned` notification, and returns the temp password **once** for the on-screen
  credential modal (Users → Add User).
- **`EnsurePasswordChanged` middleware** — server-side enforcement: a user flagged
  `must_change_password` is blocked (403) from every authenticated endpoint except changing
  their password. Closes the previously client-side-only gap.

### C. Forgot / reset password (new feature)
- `POST /api/auth/forgot-password` — emails a reset link. Always returns a **generic** response
  (no account-enumeration), throttled 5/min.
- `POST /api/auth/reset-password` — consumes a **single-use, 60-minute** token, enforces the
  strong-password rule, clears `must_change_password`, and **revokes all existing sessions**.
- SPA pages: `/forgot-password` (wired) and new `/reset-password` (reads token+email from link).

### NOT included (deferred — do not assume present)
- **OTP / 2-factor login** — not built. Intentionally deferred until requested.

---

## 2. Production env it needs (`api/.env`)

```dotenv
# First-admin bootstrap (read by AdminSeeder)
ADMIN_EMAIL=admin@deamhi.ph
ADMIN_PASSWORD=<set a STRONG password>      # omit to auto-generate + print once
ADMIN_NAME=Administrator

# Reset links in emails must point at the SPA (also used by CORS)
FRONTEND_URL=https://<your-domain-or-IP>

# Email must be real SMTP for forgot-password / provisioning / guest-appointment emails to SEND.
# With MAIL_MAILER=log (default) nothing is sent — emails only land in storage/logs/laravel.log.
MAIL_MAILER=smtp
MAIL_HOST=<smtp host, e.g. smtp.gmail.com / Mailgun / SES>
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS="noreply@<your-domain>"
MAIL_FROM_NAME="eReseta+"
```
> Run the seeder **before** `php artisan config:cache` — once config is cached, `.env` isn't
> reloaded and `ADMIN_PASSWORD` would be ignored (it safely falls back to a printed random one).

---

## 3. Seeding on deploy
```bash
php artisan migrate --force
php artisan db:seed            # roles + AdminSeeder + medicine/diagnostic catalogs
```
- **Do NOT run the demo seeders in production** (`UserSeeder`, `DoctorSeeder`, `PatientSeeder`,
  etc.) — every account they create uses the password `password`. A clean prod DB = roles +
  catalogs + **one** admin. All real doctors/pharmacists/staff are created by the admin in-app;
  patients are registered by staff.

## 4. First-login behaviour
- The bootstrap admin and any auto-provisioned account log in with the temp password and are
  **forced to set a permanent password** before they can use anything else.
- The admin hands provisioned users their temp password via the on-screen modal (or email when
  SMTP is configured).

## 5. Testing forgot-password without SMTP (local)
Trigger a reset, then open `api/storage/logs/laravel.log`, copy the `/reset-password?...` URL,
and paste it in the browser. The full flow works without a mail provider.

## 6. Verification performed
- Backend: `php artisan test` → **147 passed** (incl. new `MustChangePasswordTest`,
  `ForgotPasswordTest`).
- Frontend: `npx tsc -b --noEmit` clean + `npm run build` succeeds.

## 7. The system runs without a custom domain
Accessible via the server IP (no domain needed to log in — login is email + password). Add the
domain + HTTPS later; user emails can be placeholders now and edited to real addresses afterward.
