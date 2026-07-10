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

## 🗣️ Sir ELI Panel Feedback — Round 2 (status)

| # | Feedback | Status |
|---|----------|--------|
| 1 | No validation (numbers in name) | ✅ **Done** — full-name whitelist (on `main`) |
| 2 | No booking verification | ✅ **Done** — email OTP (on `main`, needs live email test) |
| 3 | Why not 24/7 / shift to manual? | 💬 **Answer** (below); optional: configurable clinic hours |
| 4 | No copy of booking invoice | ✅ **Done** — email receipt + Print button (branch `feature/panel-fixes-2`) |
| 5 | Chief complaint has no proper label | ✅ **Done** — labeled "Chief complaint" dropdown (same branch) |
| 6 | Why temp password at start? | ✅ **Done** — email **activation link** (no temp pw for patients); tests green (same branch) |
| 7 | Confidentiality docs need basis | 📄 **Paper** — cite RA 10173 / NPC / ISO 27701 |
| 8 | E-sign approved / accepted by pharmacy? | 📄 **Answer** (below); optional: public verify-prescription page |
| 10 | Blockchain fall(back) | 💬 **Answer** (below) |

**#3 — 24/7 vs 8-5:** The **system** is available 24/7 online; the **clinic** physically operates 8-5, so appointment **slots** fall within clinic hours — a real-world constraint, not a system limit. After hours → manual/ER fallback (emergencies aren't booked online). *Optional feature:* make each doctor's clinic hours configurable (extend doctor availability/leaves).

**#7 — Confidentiality basis (paper):** cite **RA 10173** (Data Privacy Act 2012), **NPC** circulars, **ISO/IEC 27701**, and DOH confidentiality policies as the basis for each control (consent gate, audit trail, encryption, break-glass).

**#8 — E-signature validity:** electronic signatures are legally valid under **RA 8792** (E-Commerce Act 2000); the **DOH** has issued advisories allowing e-prescriptions. Our Rx carries the doctor's **PRC license**, e-signature, and a **blockchain-verifiable reference** — stronger than paper because a pharmacy can verify it wasn't tampered with. *Optional feature:* a public **"verify prescription"** page for pharmacies.

**#10 — Blockchain fallback:** the ledger write is an **async, best-effort, retried** queued job; **MariaDB is the source of truth**; Fabric **auto-restarts via systemd**; anchoring catches up when it's back — **no clinical action is ever blocked**.

> **Round-2 code (#4, #5, #6) is on branch `feature/panel-fixes-2`** — like #2, it needs a **live email test** (booking receipt + patient activation link) before deploying to production.

---

## 🗣️ Sir Jondel Panel Feedback (external) — status

| # | Feedback | Status |
|---|----------|--------|
| A | Ref no in confirmation emails | ✅ Request emails carry it. ⚠️ **Appointments have no reference number** — see open items |
| B | Activation link ~1-week expiry | ✅ **Done** — 7-day `activations` broker (`feature/jondel-fixes`) |
| C | Per-hour leave + "leave whole month" | ✅ **Done** — model + availability + doctor UI, 8 tests green (same branch) |
| D | Report contains prescription number | ✅ Already done (admin report, first column) |
| E | No duplicate users/passwords | ✅ Emails already `unique`. Passwords should **not** be de-duplicated (can't compare bcrypt; leaks info) |
| F | DB password auto-rotation | ⬜ **Not automatic** — server infra, see open items |
| G | Blockchain pentest / backend-modifiable | ⏭️ Nico |

**⬜ Open items to decide:**
- **A — appointment reference numbers:** appointments have no `reference_no` (only appointment *requests* do). To put a ref no on *every* confirmation, add a `reference_no` column to `appointments` (migration + generator) and include it in the `AppointmentBooked` email. **Confirm if wanted.**
- **F — DB password auto-rotation:** implement a cron / systemd-timer script on the AWS box that generates a new MySQL password → `ALTER USER 'ereseta_app'@'localhost'` → rewrites `api/.env` `DB_PASSWORD` → `php artisan config:cache` → reload php-fpm. **Server-side (you + Nico).**

> **⚠️ Deploy note:** `feature/jondel-fixes` (B + C) adds a **migration** (`add_time_range_to_doctor_leaves`) — a deploy MUST run `php artisan migrate --force`.

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
