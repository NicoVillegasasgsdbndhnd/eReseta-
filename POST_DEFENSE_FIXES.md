# eReseta+ — Post-Defense Fixes (status)

Living status of all panel/adviser feedback. Everything below is **committed & pushed to `main`**
unless marked ⬜ open or ⚠️.

> Companion docs: `DEFENSE_CODE_MAP.md` (what to say + file:line per comment),
> `TEST_RUNBOOK.md` (deploy + verify + rotation), `BLOCKCHAIN_TAMPER_TEST.md` (ledger tamper demo),
> `PANEL_RESPONSES.md` (spoken answers).

---

## 🗣️ Sir Eli (Mar Eli Constantino Sagsagat) — compliance status

| # | Comment | Status |
|---|---------|--------|
| 1 | No validation | ✅ **Done** — every booking field validated server-side + mirrored in the form. Name split into **First / M.I. / Last / Suffix** (letters only); **PH mobile** format (`09XXXXXXXXX` / `+639XXXXXXXXX`); name blocks digits, phone blocks letters as you type. |
| 2 | No verification for booking | ✅ **Done** — **email OTP** (6-digit, hashed, 10-min, single-use, rate-limited) + **2-minute resend cooldown** shown as a live countdown. |
| 3 | Why not 24/7 / shift to manual | 💬 **Answer** (below) |
| 4 | No copy of booking invoice | ✅ **Done** — email receipt (with reference no.) + printable on-screen copy. |
| 5 | "Cough"/illness has no label | ✅ **Done** — relabeled **"Symptoms experienced"**, now a **multi-select checklist** + optional free-text box. |
| 6 | Why temporary password at start | ✅ **Done** — emailed **activation link (7-day)**; patient sets own password; no temp password. |
| 7 | Confidentiality docs need basis | 📄 **Paper** (below) |
| 8 | E-sign approved / accepted by pharmacy | 📄 **Answer** (below) |
| 9 | Delete admin | ⚠️ **Open** — see below |
| 10 | Why blockchain is optional? (Not optional) | ⚠️ **Open decision** — see below |

**#3 — 24/7 vs 8–5:** the **system** is online 24/7; the **clinic** physically operates 8–5, so
bookable **slots** fall within clinic hours — a hospital constraint, not a system limit. Emergencies
go to the ER, not online booking.

**#7 — Confidentiality basis (paper):** cite **RA 10173** (Data Privacy Act), **NPC** circulars,
**ISO/IEC 27701**, and **DOH** policy as the basis for the consent gate, audit trail, break-glass, and
no-PII-on-chain.

**#8 — E-signature:** valid under **RA 8792** (E-Commerce Act); DOH advisories permit e-prescriptions.
Each Rx carries the doctor's **PRC license**, e-signature, and a **blockchain-verifiable reference** a
pharmacy can check — stronger than paper.

**#9 — Delete admin ⚠️:** likely means *remove the default/seeded admin* (`admin@deamhi.test` /
`admin@deamhi.ph`) — a fixed, guessable credential. Action: production runs **no seeded admin**; a
single admin with **unique, rotated** credentials; demo seeders excluded from prod. Also add a guard
so the **last** admin can't be deleted. *(Confirm exact intent.)*

**#10 — "Blockchain is NOT optional" ⚠️:** `BLOCKCHAIN_ENABLED` defaults to `false` and the Fabric
network is **not deployed to production** (runs per-machine in WSL) — so today it *is* effectively off
in prod, which is what he objected to. **Decision needed (with Nico):** deploy the network to prod +
`BLOCKCHAIN_ENABLED=true` so anchoring is genuinely mandatory (the `blockchain:reconcile` job then
*guarantees* every prescription is anchored), and reframe: *"anchoring is mandatory and guaranteed;
the async design only prevents an outage from blocking urgent care."*

---

## 🗣️ Sir Jondel (external) — compliance status

| # | Comment | Status |
|---|---------|--------|
| A | Reference no. in confirmation | ✅ **Done** — every appointment gets `APT-YYYY-NNNN` (model hook); existing rows **backfilled**; shown in email + API. |
| B | Activation link ~1-week expiry | ✅ **Done** — 7-day `activations` broker (reset stays 60 min). |
| C | Per-hour leave + "leave whole month" | ✅ **Done** — hourly leave (blank = whole day) + month button; blocked hours removed from booking. ⚠️ *minor:* the time picker allows off-grid times (e.g. 10:33) that don't block a 30-min slot — constrain to :00/:30 (optional polish). |
| D | Report contains prescription number | ✅ **Done** — first column of the admin report **and the CSV export** (not PDF). |
| E | No duplicate users/passwords | ✅ **Done** — `email` is DB-unique. Passwords **now blocked per Sir Jondel** (`UniquePasswordAcrossUsers`): checked against existing bcrypt hashes on set, **generic** message, **no** stored fingerprint. Done against standard guidance (salted hashing + info-leak) but the least-harmful way — documented. |
| F | DB password auto-rotation | ✅ **Written & tested** (env logic). ⚠️ **Needs one verified run on the server before the timer is enabled** — see below. |
| G | Blockchain pentest / backend-modifiable | ⏭️ **Nico** — tamper-evidence runbook ready (`BLOCKCHAIN_TAMPER_TEST.md`). |

### F — how the rotation works
`deploy/scripts/rotate-db-password.sh`, driven by `ereseta-db-rotate.timer` (03:30 on the 1st,
after the 02:30 backup):

1. Verify the current password works (never rotate from an unknown state).
2. `ALTER USER … IDENTIFIED BY '<new>' RETAIN CURRENT PASSWORD` — **MySQL 8 dual password**: old and
   new both valid during the swap = **zero downtime** (falls back to a plain `ALTER` on MariaDB).
3. Verify new password → rewrite `DB_PASSWORD` in **every** `.env` that has it (`api/.env` *and*
   `shared/.env`, or nightly backups silently break).
4. `config:cache` → verify **Laravel** connects → reload php-fpm → restart `ereseta-queue`.
5. `DISCARD OLD PASSWORD`. Any failure **rolls back** (old password + `.env` restored); previous
   password kept at `/var/lib/ereseta/db-password.previous`.

**Defense line:** *"A leaked DB password has a blast radius of at most one month — rotation is
automatic, verified, and self-rolling-back, with zero downtime."* Running it also **retires the DB
password exposed on screen** during the defense.

---

## ⬜ Open items / next steps

- **Deploy latest `main`** to prod (frontend changes: name split, suffix, symptoms checklist, mobile
  validation, OTP cooldown). No migration. `TEST_RUNBOOK.md` Phase 2–3.
- **F — server test + enable timer** (`TEST_RUNBOOK.md` Phase 4): snapshot → `--dry-run` → one watched
  run → verify site/queue/backup → enable `ereseta-db-rotate.timer`.
- **Rotate the exposed passwords** — DB (`ereseta_app`, closed by F) **and the admin account** (still
  needs a manual change in-app).
- **Sir Eli #9 & #10** — confirm "Delete admin" intent; decide with Nico on deploying Fabric to prod.
- **Paper fix** — Table 5 / Ch.3 say "Blade + Bootstrap"; the system uses **React + Tailwind**.
- *Optional polish:* constrain doctor-leave time inputs to 30-minute steps (Jondel C caveat).

---

## Database tampering — the integrity story (for §G / redefense)

Anyone with **full DB credentials** can write to the database; no app fully prevents that. The
professional answer is **detect + limit + recover**, and the blockchain is the detection layer:

- **Detection:** a direct MySQL edit diverges from the ledger — `_prove.sh` shows MySQL ≠ ledger, so
  tampering is **provable** (demo in `BLOCKCHAIN_TAMPER_TEST.md`). *(Reconciliation is currently
  manual; an automated verify-against-ledger monitor is future work.)*
- **Limit:** DB bound to `127.0.0.1`; least-privilege app account; monthly password rotation (F).
- **Recover:** nightly `backup-db.sh` (14-day retention) + tested restore.

Honest caveat: single-org network = tamper-**evident**, not tamper-**proof**. Multi-org with
independent endorsers is documented future work.
