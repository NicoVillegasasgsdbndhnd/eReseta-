# HANDOFF — eReseta+ Project State

> Living hand-off doc for the two-developer relay. **Read this + `git log` at the start of every
> session; update it before you finish.** See "Multi-developer relay workflow" in `CLAUDE.md`.

**Last updated:** 2026-06-02 · **Last worked by:** Nico · **Branch:** `main`

---

## Where we are

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 0 | Setup & design system | ✅ Done |
| Phase 1 | Frontend UI (mock data) | ✅ Done |
| Phase 2 | Backend REST API | ✅ Done |
| Phase 3 | Hyperledger Fabric (chaincode + gateway) | ✅ Code built — **not wired to the API yet** |
| **Phase 5** | **Security, Testing & Compliance** | ✅ **Done & committed** (Sprint 5.1–5.4) |
| **Phase 4** | Hyperledger wiring + finish PayMongo | ⏸️ **Deferred on purpose** — comes after Phase 5 |
| Phase 6 | Deployment & demo | ❌ Not started |

> Full plan: `eReseta_Development_Plan.md`. Note the plan numbers Phase 5 as "Sprint 6" and Phase 4
> as "Sprint 5"; we deliberately do security before blockchain (see decisions below).

## Key decisions (don't re-litigate / don't flag as bugs)

1. **Phase 4 ↔ Phase 5 swapped** — finish security first, then wire Hyperledger. Blockchain being
   unwired (`blockchain_tx_id` null, Business Rule #7 unmet) is **intentional**, not behind schedule.
2. **Role `IT Admin` renamed to `staff`** (migration `2026_05_16_000001`). `staff` is canonical.
3. **Auth = Bearer token (localStorage) + 24h expiry.** Plan §10.1 mentions httpOnly cookies; we
   kept Bearer for MVP and documented the accepted XSS risk in `api/SECURITY.md`.
4. **PhilHealth uniqueness under encryption = blind index** (`philhealth_no_hash`, HMAC-SHA256).
5. **DB engine reality:** the working DB on Nico's machine is **MySQL 8.4 (Laragon)**, not XAMPP
   MariaDB, even though older docs say "MariaDB". Laravel's mysql/mariadb driver works either way.
   Each dev has their own local DB — run `php artisan migrate` after pulling.

## What was just done (Sprint 5.4 — commit `8a4a9d0`)

- Patient PII (`address`, `contact`, `philhealth_no`) **encrypted at rest** + `philhealth_no_hash`
  blind index; uniqueness validation rewired to the hash.
- `PatientEncryptionTest` + `WebhookTest` (PayMongo). **All 44 feature tests pass.**
- Sanctum **24h token expiry** (`SANCTUM_TOKEN_EXPIRATION`).
- `api/SECURITY.md` — controls + ISO 27001/27701/RA 10173 mapping.
- Fixes: `RegisterRequest` role `it_admin → staff`; `StorePatientRequest` password policy tightened.
- `.env.example` updated to MySQL.

## What's next (pick up here)

1. **`docs/SECURITY-MANUAL-VERIFICATION.md`** — step-by-step manual security verification guide
   (deferred from the Phase 5 session).
2. **Phase 4 — Laravel → Fabric gateway wiring** so prescription lifecycle events write to the
   ledger and `blockchain_tx_id` is populated (satisfies Business Rule #7), then surface the
   blockchain audit trail on the prescription detail page.
3. Phase 6 (deployment) later: OWASP ZAP scan on staging, HTTPS, httpOnly-cookie auth migration.

## How to run (Windows)

- **PHP:** the project needs **PHP 8.4**. The default `php` on PATH may be 8.2 and will fail
  composer's platform check — use your 8.4 binary (Nico's is the winget install under
  `...\WinGet\Packages\PHP.PHP.8.4_*\php.exe`).
- **Tests:** `php artisan test` — uses in-memory **SQLite**, so **no DB server needed**. Expect 44 passing.
- **Run API against real DB:** start your local MySQL/MariaDB, then `php artisan migrate` (and
  `php artisan db:seed` for demo data), then `php artisan serve`.
- **Frontend:** in `web/`, `npm install` then `npm run dev`.

## Open caveats

- The earlier session briefly started a second DB server (XAMPP MariaDB) that may hold a
  partially-applied encryption migration. The **live Laragon MySQL DB is clean**. If you ever point
  the app at XAMPP MariaDB, run `php artisan migrate:status` there first.
