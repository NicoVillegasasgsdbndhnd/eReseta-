# eReseta+ — Post-Defense Proposed Changes

> Fixes raised during the defense (panel + team). **Discuss with Nico before implementing.**
> Priority: 🔴 high · 🟡 medium · 🟢 quick win.

---

## ✅ / ⬜ Status Checklist (track here)

**Already changed (committed & pushed to `main`):**
- [x] Comment cleanup — AI-style comments stripped across `api/` + `web/src`, line numbers preserved (`3dd3d71`)
- [x] Inline security labels added on key lines (`// admin only`, `// bcrypt hashing`, …) (`3b31813`)
- [x] `PROJECT_STATUS.md` updated re: the comment change (`a4d18ca`)
- [x] Defense-prep docs created — `SYSTEM_REVIEWER.md`, `DEFENSE_NOTES.md`, `CHECKLIST_FILLED.md`, `POST_DEFENSE_FIXES.md` (local); `PENTEST_GUIDE.md` (branch `docs/pentest-guide`)

**To be made — post-defense fixes (see details below):**
- [x] 🟢 Full-name input validation — regex + Zod ✅ *(branch `feature/post-defense-fixes`)*
- [x] 🔴 Booking email OTP verification ✅ *(same branch — still needs live email test)*  · ⬜ honeypot / CAPTCHA / disposable-email (optional)
- [ ] 🔴 DB tamper detection — verify-against-ledger hash check (needs blockchain running to build+test) (§3)
- [ ] 🟡 DB tamper hardening — HMAC row-signing, off-server audit logs, least-privilege DB user, encrypt PII (§3)

**Carried-over / still open:**
- [ ] 🔴 Rotate exposed passwords — DB (`ereseta_app`) + admin (both appeared on screen/in chat)
- [ ] 🟡 Fix paper's tech-stack description — Table 5 / Ch.3 say "Blade + Bootstrap"; system actually uses **React + Tailwind**
- [ ] 🟢 Backups — schedule `backup-db.sh` (cron) + test a restore
- [ ] 🟡 PT03 + PT05 — capture live evidence/videos if a redefense needs them
- [ ] ⚪ Confirm pharmacist verify-queue bug is resolved (Nico touched `VerifyQueuePage`) before demoing PT04

**Suggested order:** full-name validation → rotate passwords → booking OTP → verify-against-ledger check → paper stack fix → the rest.

---

## 🔄 Progress Update — branch `feature/post-defense-fixes`

**Done + verified (PHP `php -l` clean, frontend `tsc` clean):**
- ✅ **#1 Full-name validation** — whitelist regex on `StoreAppointmentRequestRequest.php` (`regex:/^[\p{L}\s.'-]+$/u`, `max:100`) + mirrored in `BookPage.tsx` Zod. Rejects special chars/digits; allows letters, space, `.` `'` `-`. *(1st commit)*
- ✅ **#2 Email OTP** — new endpoint `POST /public/appointment-requests/send-otp` emails a **6-digit code** (hashed in **cache**, 10-min expiry, **single-use**, rate-limited `throttle:5,1`, sent via **Brevo**). The booking submit now **requires a valid code** → stops dummy-email abuse. Frontend: OTP field + "Send code" button on `BookPage`. New file: `app/Notifications/AppointmentBookingOtp.php`. *(commit `9ec0c77`)*

**⚠️ Must LIVE-TEST #2 before trusting it** (can't test email from code): run the app → book an appointment → click **Send code** → confirm the 6-digit code arrives in the Brevo inbox → enter it → submit. Requires cache driver + Brevo mail (both already configured on prod).

**Still to do:**
- ⬜ **#3 verify-against-ledger** — build with the **blockchain running** (local Fabric or the AWS box), ideally with Nico; it hooks into the Fabric gateway and must be tested against the live chain. Plan in §3 below.
- ⬜ **#4 DB hardening — server/infra over SSH (not code):**
  - **Rotate DB password:** `ALTER USER 'ereseta_app'@'localhost' IDENTIFIED BY '<new>';` → update `api/.env` `DB_PASSWORD` → `php artisan config:cache`.
  - **Least privilege:** `REVOKE ALL PRIVILEGES ON ereseta.* FROM 'ereseta_app'@'localhost'; GRANT SELECT, INSERT, UPDATE, DELETE ON ereseta.* TO 'ereseta_app'@'localhost';` (no DROP/admin).
  - Ship audit logs **off-server**, **encrypt PII** columns (`encrypted` cast), **schedule** `backup-db.sh` (cron) + **test a restore**.

**Next step:** push `feature/post-defense-fixes` for Nico to live-test the OTP email + build #3 with the chain up. **Keep it as a branch (don't merge to `main`) until the OTP email is verified** — safer than pushing straight to production booking.

---

## 1. 🔴 Booking — Email OTP verification (dummy-email abuse)  ✅ IMPLEMENTED (needs live email test)

**Problem:** `POST /api/public/appointment-requests` accepts any email. An attacker can spam fake
bookings with dummy emails (no proof they own the address).

**Fix — require the requester to prove email ownership before the request is created:**
1. Step 1 (`.../start`): guest submits the form → server generates a **6-digit OTP**, stores it
   **hashed** (DB/cache) keyed to the email with a **10-min expiry**, emails it via **Brevo** (SMTP
   already configured). Rate-limited (`throttle:5,1` already exists).
2. Step 2 (`.../verify`): guest enters the OTP → server validates code + expiry + attempt count →
   **only then** creates the `AppointmentRequest`.

**Defense-in-depth (add 1–2):**
- 🟢 **Honeypot field** — hidden input; if filled, reject (bot deterrent, trivial to add).
- 🟡 **CAPTCHA / reCAPTCHA** on the booking form (also closes the earlier "no CAPTCHA" gap).
- 🟡 Block **disposable-email domains** (mailinator, tempmail, …) via denylist / MX check.

---

## 2. 🟢 Booking — Full-name input validation (block special characters)  ✅ IMPLEMENTED

**Problem:** the booking **full_name** field accepts special characters (`< > ; " = '` etc.).
Concern: injection/XSS vector + poor data quality. *(Note: Eloquent parameterized queries already
stop SQL injection and React escaping stops XSS — but input whitelisting is good defense-in-depth
and is exactly what the panel wants to see.)*

**Where:** `api/app/Http/Requests/StoreAppointmentRequestRequest.php:18`
Current rule: `'full_name' => ['required', 'string', 'max:255']`

**Fix — whitelist valid name characters (letters, spaces, `.` `'` `-` only):**
- **Server-side (primary):**
  ```php
  'full_name' => ['required', 'string', 'max:100', 'regex:/^[\p{L}\s.\'-]+$/u'],
  ```
  Allows letters (incl. accented, e.g. José), spaces, period (Jr.), apostrophe (O'Brien), hyphen
  (Anne-Marie). Blocks `< > ; " = / \ |`, digits, and other symbols. Add a friendly message via
  `messages()`: *"Name may only contain letters, spaces, hyphens, apostrophes, and periods."*
- **Client-side (mirror for instant feedback):** add the same regex to the Zod schema in the web
  booking form (`web/src/features/public/` booking page) so invalid input is caught before submit.
- Consider tightening `max:255` → `max:100`.

**Optional (confirm intent with Nico):** if the goal is also to *stop using a single free-text
full-name*, split it into **first_name + last_name** fields (Nico already added name-part columns to
`users`) for cleaner, structured data.

---

## 3. 🔴 Database tampering "without repercussions" — detect · limit · recover

**Reality to state:** anyone with **full DB credentials** can write to the DB — no app fully prevents
that. The professional answer is **detection + limiting blast radius + recovery**. We currently have
prevention (DB bound to `127.0.0.1`) but weak detection.

**Detection (ties to our blockchain — strongest story):**
- 🔴 **Verify-against-ledger check:** we already anchor a prescription's data on-chain. Add a routine
  that recomputes a DB record's hash and compares it to the on-chain hash — **any mismatch = tampering,
  flagged in the admin Blockchain Explorer.** That IS the "repercussion": silent edits become
  detectable and provable.
- 🟡 **HMAC row-signing** for other critical tables (patients, records): store a signature column
  computed with an **app-side secret key NOT in the DB** (Laravel model observer). A direct DB edit
  can't produce a valid signature → tampering detected on read.
- 🟡 **Ship audit logs OFF the database:** an attacker with DB access can delete `audit_logs` rows.
  Send critical events to an **append-only external store** (separate log server / cloud logging /
  anchor audit-log hashes on-chain) so the trail survives a DB compromise.

**Limit blast radius + recover:**
- 🔴 **Rotate the DB password** (`ereseta_app` — it was exposed on screen/in chat) + **SSH-key-only**
  server access.
- 🟡 **Least-privilege DB user:** app account gets only `SELECT/INSERT/UPDATE/DELETE` on its tables —
  no `DROP`/admin grants; consider a read-only user for reports.
- 🟡 **Encrypt sensitive PII columns at rest** (Laravel `encrypted` cast).
- 🟢 **Backups + tested restore:** schedule `deploy/scripts/backup-db.sh` (cron) and test a restore, so
  tampering can be rolled back.

---

## Redefense framing (say this)
> *"You raised two valid points. For booking, we added email OTP verification so a requester must prove
> they own the email, plus a honeypot/CAPTCHA and full-name input whitelisting. For database integrity,
> we accepted that anyone with DB credentials can write to it — so we focused on detection and recovery:
> we extended our blockchain to flag any record whose hash no longer matches the ledger, moved the audit
> trail off the database, locked the app's DB account to least privilege, and enforced tested backups.
> Direct DB tampering is now detectable, attributable, and recoverable."*

---

## Suggested order (highest impact / most achievable first)
1. 🟢 Full-name validation (§2) — tiny change, quick win.
2. 🔴 Email OTP on booking (§1).
3. 🔴 Rotate DB password + verify-against-ledger check (§3).
4. 🟡 Remaining §3 hardening (least privilege, off-server audit, encryption, HMAC).
