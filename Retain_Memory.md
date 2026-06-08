# PROJECT MEMORY — eReseta+ (Retain_Memory)

> Persistent project knowledge. `HANDOFF.md` holds the volatile "current state + what's next" (read
> it + `git log` every session). This file holds the durable architecture/standards. Plan of record:
> `eReseta_Development_Plan.md`. Security controls: `api/SECURITY.md`.

## 1. PROJECT OVERVIEW

- **System:** **eReseta+** — web-based healthcare system: outpatient appointment scheduling, patient
  record management, and blockchain-anchored digital e-prescription.
- **Client / hospital:** Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (**DEAMHI**).
- **Type:** Capstone project (FEU Institute of Technology — Barcelon · Licmo-an · Santos · Villegas).
- **Core modules:** (1) Appointment Scheduling, (2) Patient Record Management, (3) Digital
  E-Prescription with Hyperledger Fabric traceability.
- **Tech stack:** Laravel 13 / PHP 8.4 REST API · React 18 (Vite + TypeScript) SPA ·
  **MySQL 8.4 (Laragon)** in practice (docs say MariaDB; driver is compatible) · Tailwind CSS v4 +
  shadcn/ui (new-york) · TanStack Query · Zustand · React Hook Form + Zod · Recharts · Axios ·
  date-fns · Hyperledger Fabric 2.5.15 (Go chaincode + Node.js gateway).
- **Current phase:** Phases 0–2 done. **Phase 5 (Security, Testing & Compliance) done** — deliberately
  executed *before* the blockchain work (the planned order was reversed). **Phase 3 (Hyperledger
  Fabric)** network + chaincode + gateway wired & committed. **Phase 4 (Integration & PayMongo)**
  mostly done — only the PayMongo "Pay Now" hosted-page finish pending. **Phase 6 (Deployment)** not
  started. *(Phase numbers follow `eReseta_Development_Plan.md`; only the execution order changed.)*

## 2. SYSTEM ARCHITECTURE

**Monorepo:** `api/` (Laravel REST API) · `web/` (React SPA) · `blockchain/` (Fabric chaincode +
network defs + Node gateway).

**Backend `api/` layout:** `app/Http/{Controllers,Requests,Resources,Middleware}`, `app/Models`,
`app/Services`, `app/Jobs`, `app/Observers`, `app/Enums`, `app/Policies`;
`database/{migrations,seeders}`; `routes/api.php`; `tests/Feature`; `config/`.
Pattern: **Controller → FormRequest (validation) → Service (business logic) → Model**. Thin
controllers; JSON via API Resources; PHP 8.4 enums for statuses/roles; Observers for audit logs.

**Frontend `web/src/` layout:** `features/<module>/` (each with pages + `queries.ts` TanStack hooks),
`components/ui/` (shadcn), `components/common/` (DataTable, StatusBadge, StatusTimeline, PageHeader,
ConfirmDialog), `layouts/` (AppLayout, AuthLayout, Sidebar, Topbar), `lib/api.ts` (axios instance +
interceptors), `api/client.ts`, `routes/index.tsx`, `features/auth/authStore.ts` (Zustand),
`mocks/` (legacy mock data/types from Phase 1).

**Communication:** SPA → axios (`web/src/lib/api.ts`, base URL `VITE_API_URL` → Laravel `/api/*`).
TanStack Query wraps every endpoint. CORS in `api/config/cors.php` (allows 5173 + 5174 fallback,
`supports_credentials`).

**Auth:** **Laravel Sanctum personal access tokens (Bearer in localStorage)**, **24h expiry**
(`SANCTUM_TOKEN_EXPIRATION`). Login endpoint is **`POST /api/auth/login`** (not `/api/login`).
RBAC via **Spatie Laravel Permission**. axios response interceptor logs out + redirects to `/login`
on any 401. (Plan §10.1 mentions httpOnly cookies; we kept Bearer for MVP — accepted risk documented
in `api/SECURITY.md`.)

**Key tables** (migrations in `api/database/migrations/`): `users` (role, status, phone, address,
`assigned_doctor_id`, profile photo), Spatie `roles/permissions`, `patients` (PII **encrypted**:
address/contact/philhealth_no + `philhealth_no_hash` blind index), `doctors`, `appointments`,
`appointment_status_histories`, `patient_records`, `prescriptions` (`blockchain_tx_id`),
`prescription_items`, `prescription_events` (`blockchain_tx_id`), `billing_records` (`paymongo_id`),
`audit_logs`, `staff_requests`.

## 3. COMPLETED FEATURES

All modules below are **working** (backend + frontend + tests) unless noted.

- **Auth** — register/login/logout/me, role-based route guards, staff approval workflow.
  Controllers: `AuthController`; Service `AuthService`. Frontend `features/auth/`.
- **Appointments** — book, list (role-filtered), detail, status lifecycle (Scheduled → Served /
  Rescheduled / Cancelled) with `appointment_status_histories`. `AppointmentController` +
  `AppointmentService`; `features/appointments/`.
- **Patients & Records** — CRUD patients, visit records, **PII encrypted at rest**.
  `PatientController`, `PatientRecordController`; `features/patients/`.
- **E-Prescription** — doctor issues → pharmacist verifies → dispenses (`Issued→Verified→Dispensed`);
  blockchain audit-trail panel renders when `blockchain_tx_id` populated. `PrescriptionController` +
  `PrescriptionService`; `features/prescriptions/` (+ pharmacy verify/dispense pages).
- **Dashboards & Reports** — role-scoped KPIs, charts (Recharts), audit-log view (admin), Excel/PDF
  reports. `DashboardController`, `ReportController`; `features/dashboard/`, `features/reports/`.
- **Billing** — records, PayMongo payment-link, mark-paid, webhook (signature-verified).
  `BillingController`, `WebhookController`. **Partial:** "Pay Now" hosted-page redirect not finished.
- **Users / Staff / Profile** — admin user mgmt, **staff↔doctor assignment workflow**, profile edit +
  photo upload. `features/admin/`, `features/profile/`.
  - **Staff workflow:** a `staff` user is a doctor's assistant/secretary bound to exactly one doctor
    via `users.assigned_doctor_id`. When admin creates a staff user with an `assigned_doctor_id`
    (`UserController::store`), a **pending `StaffRequest`** (`staff_user_id` + `doctor_id`) is created.
    The doctor sees their pending requests (`GET /staff-requests`) and **approves/rejects**
    (`StaffRequestController`, guarded so only the assigned doctor can act).
  - **Approval is enforced at LOGIN** ([AuthController::login](api/app/Http/Controllers/AuthController.php)):
    a staff user whose `StaffRequest.status !== 'approved'` is blocked with **403 + no token** (distinct
    pending vs rejected messages; tests `test_pending_staff_cannot_login` / `test_rejected_staff_cannot_login`).
    So any staff who can authenticate is necessarily approved — the downstream `assigned_doctor_id`
    scoping in `AppointmentController` / `PatientRecordController` is correct and sufficient (NOT a bug).
  - **Mid-session revocation:** `StaffRequestController::reject` deletes the staff user's tokens, so a
    rejected staff member is kicked out immediately (not just blocked at next login). Covered by
    `tests/Feature/StaffRequestTest.php`.
- **Blockchain** — Fabric network defs + Go chaincode + Node gateway committed; `FabricGatewayService`
  + queued `RecordPrescriptionOnLedger` job backfill tx ids. **Running network is per-machine** (WSL).

## 4. IN PROGRESS / KNOWN GAPS

- **PayMongo "Pay Now"** — webhook + signature done/tested; hosted-page redirect button + admin
  manual-payment fallback still pending (Phase 4 tail).
- **"Verify on Blockchain" UI button** — offered, not built. No live ledger-compare/tamper warning
  in the UI yet (proof is currently CLI/peer-query only).
- **Phase 6 deferred:** OWASP ZAP scan on staging, HTTPS/TLS enforcement, httpOnly-cookie auth
  migration.
- **Caveat:** an earlier session may have left a partially-applied encryption migration on a stray
  XAMPP MariaDB; the live Laragon MySQL DB is clean. Run `php artisan migrate:status` if pointing at
  a different DB.

## 5. DEVELOPMENT STANDARDS

- **Backend:** PHP type declarations on all signatures/returns; FormRequests for validation; API
  Resources for responses; enums for statuses; `findOrFail` over manual null checks; eager-load to
  avoid N+1; `DB::transaction` where writes matter; `Log` facade at appropriate levels.
- **Frontend:** functional components + hooks only; TS interfaces for props/API/shared types;
  **TS strict mode — unused imports are build errors (TS6133/TS6196), remove immediately**; state
  kept local, lift only when needed.
- **API response format:** JSON; errors forced to JSON for `/api/*` via `ForceJsonResponse`
  middleware — 422 (validation), 401 (auth), 404 (not found), 403 (RBAC), 429 (rate limit).
- **Naming:** Controllers `*Controller`, Services `*Service`, Requests `Store/Update*Request`,
  enums PascalCase; React features kebab/camel folders, pages `*Page.tsx`, hooks in `queries.ts`.
- **Git commits:** `type: Sprint X.Y — short summary` (e.g. `feat: Sprint 5.4 — patient PII
  encryption`); `feat`/`fix`/`docs`/`chore` prefixes.

## 6. SECURITY IMPLEMENTATION (Phase 5 — DONE)

Full detail in `api/SECURITY.md` + `docs/SECURITY-MANUAL-VERIFICATION.md`. Summary:

- **Auth flow:** Sanctum token issued on `/api/auth/login`; 24h expiry; Bearer in localStorage;
  SPA auto-logout on 401.
- **RBAC:** Spatie roles (`patient`, `doctor`, `pharmacist`, `admin`, `staff`) — middleware aliased
  in `bootstrap/app.php`; per-controller role + ownership guards. Covered by `RoleBoundaryTest`.
- **Rate limiting:** login + register `throttle:10,1` (10/min/IP).
- **Audit logging:** `AuditObserver` logs CREATE/UPDATE/DELETE (actor id, IP, timestamp) for
  Appointment, Patient, PatientRecord, Prescription, User.
- **Encryption at rest:** Patient `address`/`contact`/`philhealth_no` via Laravel `encrypted` cast
  (AES-256-CBC); `philhealth_no` uniqueness via **blind index** `philhealth_no_hash` (HMAC-SHA256).
- **Password policy:** min 8 + mixedCase + numbers + symbols (Register + StorePatient).
- **Exception handling:** JSON 401/404; `ForceJsonResponse` for `/api/*`.
- **Compliance mapping:** ISO/IEC 27001, ISO/IEC 27701, RA 10173 (Data Privacy Act), FDA Circular
  2020-037 — documented in `api/SECURITY.md`.
- **Tests:** `php artisan test` — **48 passing** (in-memory SQLite, no DB server needed). Suites:
  AuthTest, RoleBoundaryTest, AppointmentTest, PrescriptionTest, PatientEncryptionTest, WebhookTest,
  PrescriptionBlockchainTest, StaffRequestTest.

### Phase 5 sprint history
- **5.1** (`680c4f0`) — API authorization & rate limiting (Spatie middleware, throttle, per-controller guards).
- **5.2** (`c8b0cc6`) — Feature tests (37) + fixes (401 on bad creds, null-safe logout, enum `->value`).
- **5.3** (`76f24a7`) — Compliance hardening (AuditObserver→PatientRecord+User, password policy, JSON 401/404).
- **5.4** (`8a4a9d0`) — Patient PII encryption + blind index, WebhookTest, Sanctum 24h, SECURITY.md.
- **Finish** (`ef851aa`) — `docs/SECURITY-MANUAL-VERIFICATION.md`, F-1 `ForceJsonResponse`, F-2 SECURITY.md cleanup (→47 tests).

## 7. KEY FILE LOCATIONS

- **Routes:** `api/routes/api.php` (all `/api/*`; login = `/api/auth/login`).
- **Config:** `api/config/{cors,sanctum,services}.php`; `api/.env` (gitignored; `BLOCKCHAIN_ENABLED`,
  `QUEUE_CONNECTION`, `SANCTUM_TOKEN_EXPIRATION`, PayMongo + Fabric keys). `bootstrap/app.php` =
  middleware aliases + exception handlers.
- **Controllers** (`api/app/Http/Controllers/`): Auth, Appointment, Patient, PatientRecord,
  Prescription, Billing, Webhook, Dashboard, Report, Doctor, User, StaffRequest, Profile.
- **Services:** `AuthService`, `AppointmentService`, `PrescriptionService`, `FabricGatewayService`.
  **Job:** `RecordPrescriptionOnLedger` (queued, flag-gated, idempotent). **Observer:** `AuditObserver`.
- **Models** (`api/app/Models/`): User, Patient, Doctor, Appointment, AppointmentStatusHistory,
  PatientRecord, Prescription, PrescriptionItem, PrescriptionEvent, BillingRecord, AuditLog,
  StaffRequest.
- **Frontend key:** `web/src/lib/api.ts` (axios + auth/401 interceptor), `web/src/routes/index.tsx`
  (routes + guards), `features/auth/authStore.ts` (Zustand), `features/prescriptions/PrescriptionDetailPage.tsx`
  (renders blockchain audit panel).
- **Blockchain:** `blockchain/network/` (`crypto-config.yaml`, `configtx.yaml`, `compose-deamhi.yaml`,
  `deamhi.sh`), `blockchain/chaincode/prescription/prescription.go`, `blockchain/gateway/src/index.ts`.
  **Full reference:** `HYPERLEDGER_DOCUMENTATION.md` (complete Fabric architecture, Docker, setup,
  security gaps, plan-vs-actual, panel Q&A). Key facts: Fabric 2.5.15, single org DEAMHIMSP, 1 peer +
  1 Raft orderer, `cryptogen` (no CA), LevelDB (no CouchDB), no PII on-chain.

## 8. ENVIRONMENT SETUP

- **PHP 8.4 required.** Default `php` on Nico's PATH may be 8.2 (XAMPP) and fail composer's platform
  check — use the winget 8.4 binary (`...\WinGet\Packages\PHP.PHP.8.4_*\php.exe`). Mark's terminal
  uses 8.4, so plain `php artisan` works for him.
- **Run API:** start local MySQL (Laragon), `php artisan migrate` (+ `php artisan db:seed` for demo),
  `php artisan serve` (→ `127.0.0.1:8000`).
- **Run frontend:** in `web/`, `npm install` then `npm run dev` (Vite → 5173, falls back to 5174).
- **Tests:** `php artisan test` — in-memory SQLite, no DB server needed (47 pass).
- **Blockchain (WSL2 + Docker Desktop, Ubuntu integration on):** `wsl -d Ubuntu` →
  `cd blockchain/network` → first time `./deamhi.sh up && ./deamhi.sh deployCC`; **after reboot use
  `./deamhi.sh start` (NOT `up` — `up` regenerates crypto and wipes the ledger).** Gateway in WSL:
  `cd ~/ereseta-gateway && CRYPTO_PATH=~/ereseta-fabric/organizations npm run dev` (`:3001`). On
  Windows set `BLOCKCHAIN_ENABLED=true` + `QUEUE_CONNECTION=database`, run `php artisan queue:work`
  (ledger writes are async — a Fabric outage never blocks a clinical action; tx ids backfill on
  recovery). Node 18 in WSL via **nvm** (no sudo). `.gitattributes` keeps `*.sh`/yaml at LF.
- **Env vars:** backend `.env` from `.env.example` (DB, `APP_KEY` — required for PII encryption,
  Sanctum, PayMongo, Fabric). Frontend `VITE_API_URL`.

## 9. NEXT STEPS

1. **Finish PayMongo** — "Pay Now" → hosted-page redirect + admin manual-payment fallback.
2. (Optional, defense value) **"Verify on Blockchain" UI button** — live ledger fetch + compare +
   ⚠️ tamper warning on mismatch.
3. **Phase 6 — Deployment & Demo:** Railway/Render (API + MySQL) + Vercel/Netlify (SPA) + VPS
   (Fabric); OWASP ZAP scan on staging; HTTPS; seed demo accounts per role; demo walkthrough + backup
   recording. Final: FURPS evaluation (4-point Likert) by hospital staff (UAT).

## 10. IMPORTANT DECISIONS & CONTEXT (don't re-litigate / don't flag as bugs)

1. **Execution order reversed (Phase 5 before Phase 3/4)** — Security & Compliance was finished before
   the Hyperledger blockchain work. **Phase numbers still follow the plan; only the sequence changed.**
   So blockchain arriving "after" security is intentional, not behind schedule; `blockchain_tx_id` being
   null in flows run with the network down is expected.
2. **Role `IT Admin` renamed to `staff`** (migration `2026_05_16_000001`); `staff` is canonical.
3. **Auth = Bearer token (localStorage) + 24h expiry**, not httpOnly cookie — accepted XSS risk
   documented in `api/SECURITY.md` with a future migration path.
4. **PhilHealth uniqueness under encryption = blind index** (`philhealth_no_hash`, HMAC-SHA256).
5. **DB reality:** working DB is **MySQL 8.4 (Laragon)** despite older "MariaDB" docs; each dev has
   their own local DB — `php artisan migrate` after pull. Schema travels via committed migrations;
   data does not.
6. **MariaDB/MySQL = source of truth; Fabric = audit/traceability only.** Ledger write is
   async/best-effort, never blocks a clinical action. Chain key = `reference_no`. **No PII on-chain**
   (internal IDs + drug list only).
7. **Two-developer relay** (Nico + Mark, separate machines/GitHub accounts) — `HANDOFF.md` is the
   shared living state; durable facts go in `CLAUDE.md` / this file; local `.claude` memory does not sync.

### eReseta+ constraints (frontend toolchain)
- shadcn CLI v4.6.0 on Windows — files land in `web/@/` and must be moved to `web/src/components/ui/`.
- `laravel/tinker` removed (incompatible with Laravel 13).
- No shadcn `Card` in page layouts — use plain `div` with `bg-white rounded-xl shadow-sm`.
- All page borders use inline `style={{ border: '1px solid hsl(214 20% 90%)' }}` (Tailwind v4 JIT limitation).
- TypeScript strict mode: unused imports are build errors (TS6133/TS6196) — remove them immediately.
