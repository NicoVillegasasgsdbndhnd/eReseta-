# HANDOFF — eReseta+ Project State

> Living hand-off doc for the two-developer relay. **Read this + `git log` at the start of every
> session; update it before you finish.** See "Multi-developer relay workflow" in `CLAUDE.md`.

**Last updated:** 2026-06-13 · **Last worked by:** Mark (bullrunblue-eng) · **Branch:** `main` — all feature PRs merged & verified green

---

## ✅ CONSOLIDATED — all feature PRs merged into `main` (2026-06-13, by Mark)

Everything below is now on `main` and **verified green**: `php artisan test` = **69 passing**, `tsc -b` / `npm run build` clean.

| Feature | PR |
|---|---|
| Medicine catalog + generic-name combobox | #2 |
| Security hardening — registration privilege-escalation fix, inactive-login block, PayMongo webhook fail-closed + replay protection, global API throttle, secure password change, security headers, admin self-lockout (`api/SECURITY.md` §9) | #4 |
| UI redesign "Calm Clinical" + WCAG accessibility — Space Grotesk, teal, responsive shell, flagship doctor dashboard | #3 |
| Blockchain Explorer — admin `/blockchain` live ledger feed; tx ids linked to each prescription's audit trail | #6 |

**Blockchain is verified end-to-end** (issue → queued job → gateway → Fabric → `blockchain_tx_id` back in MySQL). **BUT the Fabric network is per-machine infrastructure — a `git pull` does NOT start it.** Two ways to run after pulling:

### Mode A — App only ("pull & go", do this first)
No blockchain needed; nothing errors (`.env.example` defaults `BLOCKCHAIN_ENABLED=false`).
1. **`api/`**: `composer install` → copy `.env.example` → `.env` → set DB creds → `php artisan key:generate` → `php artisan migrate --seed` → `php artisan serve`
2. **`web/`**: create `web/.env` with `VITE_API_URL=http://localhost:8000/api` → `npm install` → `npm run dev`
3. Seeded logins (see `api/database/seeders`): `*@deamhi.test` / `password`, plus admin `admin@deamhi.ph` / `Admin@2026!`.
   The Blockchain Explorer (`/blockchain`, admin) shows **offline / pending** — that's expected with the chain off; **everything else works fully**.

### Mode B — Blockchain live (optional, extra per-machine standup)
Needs Docker Desktop + WSL2/Ubuntu + Fabric 2.5.15 bins + Go + Node 18. **Full steps in "How to run (Windows)" below.** Short version: start Docker Desktop → WSL `./deamhi.sh up && ./deamhi.sh deployCC` (**first time**) or `./deamhi.sh start` (**after a reboot — never `up`**, it regenerates crypto and wipes the ledger) → run the gateway in WSL (`:3001`) → set `BLOCKCHAIN_ENABLED=true` + `QUEUE_CONNECTION=database` + `php artisan queue:work`. Verify by issuing a prescription and watching its `blockchain_tx_id` populate within seconds. Fabric is finicky — **budget a debug pass.**

> Each developer has their **own DB and own ledger** — only migrations travel, not data. Tx ids anchored on one machine don't exist on another.

## Where we are

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 0 | Setup & design system | ✅ Done |
| Phase 1 | Frontend UI (mock data) | ✅ Done |
| Phase 2 | Backend REST API | ✅ Done |
| Phase 3 | Hyperledger Fabric (chaincode + gateway) | ✅ **Wired & committed** (`ef851aa`) — network defs + chaincode + gateway in repo; a *running* network is per-machine |
| **Phase 5** | **Security, Testing & Compliance** | ✅ **Done & committed** (Sprint 5.1–5.4 + manual verification guide, `ef851aa`) |
| **Phase 4** | Integration & PayMongo | 🔄 Frontend↔API integration + blockchain app-wiring done (`ef851aa`); only **PayMongo "Pay Now" finish** still pending |
| Phase 6 | Deployment & demo | ❌ Not started |

> Full plan: `eReseta_Development_Plan.md`. **Phase numbers follow the plan** (Phase 3 = blockchain,
> Phase 4 = Integration & PayMongo, Phase 5 = Security). We deliberately **executed Phase 5 (security)
> before the Phase 3/4 blockchain work** — only the order changed, not the numbering (see decisions below).

## Key decisions (don't re-litigate / don't flag as bugs)

1. **Execution order reversed (Phase 5 before Phase 3/4)** — finish security first, then wire
   Hyperledger. Phase numbers still follow the plan; only the sequence changed. Blockchain arriving
   after security (and `blockchain_tx_id` null when the network is down) is **intentional**, not behind schedule.
2. **Role `IT Admin` renamed to `staff`** (migration `2026_05_16_000001`). `staff` is canonical.
3. **Auth = Bearer token (localStorage) + 24h expiry.** Plan §10.1 mentions httpOnly cookies; we
   kept Bearer for MVP and documented the accepted XSS risk in `api/SECURITY.md`.
4. **PhilHealth uniqueness under encryption = blind index** (`philhealth_no_hash`, HMAC-SHA256).
5. **DB engine reality:** the working DB on Nico's machine is **MySQL 8.4 (Laragon)**, not XAMPP
   MariaDB, even though older docs say "MariaDB". Laravel's mysql/mariadb driver works either way.
   Each dev has their own local DB — run `php artisan migrate` after pulling.

## What was done (Fabric network — committed `ef851aa`, by Mark)

The DEAMHI Hyperledger Fabric network is **stood up and fully wired**. Verified end-to-end: a
prescription's Issued→Verified→Dispensed lifecycle writes real tx ids to the ledger and backfills
`prescriptions.blockchain_tx_id` + every `prescription_events.blockchain_tx_id` in MySQL.

- **New `blockchain/network/`** (committed defs): `crypto-config.yaml`, `configtx.yaml`,
  `compose-deamhi.yaml`, `deamhi.sh` (`up` / `deployCC` / `smoke` / `down`). Single org **DEAMHIMSP**
  (`deamhi.example.com`), 1 etcdraft orderer + 1 peer, channel `ereseta-channel`, Fabric **v2.5.15**.
- Runs in **WSL2/Ubuntu + Docker**; crypto generated WSL-native at `~/ereseta-fabric/` (gitignored).
  Requires Docker Desktop **WSL integration enabled for Ubuntu**.
- **Gateway fixes** (`blockchain/gateway/src/index.ts`) — it had never been run; fixed to (a) return
  the **real Fabric tx id** via the proposal API (was returning the empty chaincode result), (b)
  **wait for commit** before returning (fixes verify-after-create race), (c) return 500 instead of
  crashing on chaincode errors. Gateway runs in WSL (`~/ereseta-gateway`, Node 18) on `:3001`;
  Laravel on Windows reaches it via WSL2 localhost forwarding.
- `api/.env` now has `BLOCKCHAIN_ENABLED=true` (`.env.example` stays false). Needs `queue:work` running.

> **✅ Chaincode read endpoints fixed:** `appendEvent` in
> `blockchain/chaincode/prescription/prescription.go` now loads + preserves the existing record's
> fields (patientId/doctorId/drugList) on verify/dispense, so `GET /prescription/{id}` and `/history`
> return the full ISSUED→VERIFIED→DISPENSED trail. Verified end-to-end after the chaincode redeploy.

## What was done (Phase 4 app-layer wiring — committed `ef851aa`, by Mark)

Laravel↔Fabric **application wiring** so prescription lifecycle events record to the ledger and
backfill `blockchain_tx_id`. Gateway/chaincode were also built locally (Go + gateway npm deps).

- New `app/Services/FabricGatewayService.php` — HTTP client for the Node gateway (`issue/verify/dispense`, returns `txId`).
- New `app/Jobs/RecordPrescriptionOnLedger.php` — **queued**, flag-gated, idempotent (`tries=3`, backoff, `failed()` logs); backfills the event tx id + the prescription anchor tx on ISSUED.
- `app/Services/PrescriptionService.php` — dispatches the job **after** the DB transaction in `create/verify/dispense` (no `afterCommit`, so it also works under `RefreshDatabase`).
- Config: `config/services.php` `fabric` block; `BLOCKCHAIN_ENABLED` (**default false**) + `FABRIC_GATEWAY_URL` in `.env`/`.env.example`; `phpunit.xml` pins the flag off.
- New `tests/Feature/PrescriptionBlockchainTest.php` (flag-on persists tx ids via `Http::fake`; flag-off makes zero calls). **All 46 tests pass.**
- **Frontend needed no changes** — the "Blockchain Audit Trail" panel in `web/src/features/prescriptions/PrescriptionDetailPage.tsx` already renders once `blockchain_tx_id` is populated.
- **Design:** MariaDB stays source of truth; ledger write is async/best-effort and never blocks a clinical action. Chain key = `reference_no`. **No PII on-chain** (internal IDs + drug list only).
- **Not yet runnable end-to-end:** there is still **no `blockchain/network/`** (crypto-config, docker-compose, channel, deployed chaincode). With the flag off, behaviour is unchanged. To see real tx ids: stand up a Fabric network, run the gateway + `php artisan queue:work`, set `BLOCKCHAIN_ENABLED=true`.

## What was just done (UI/UX redesign — `feat/ui-refresh` = PR #3, OPEN, merge-ready)

A full visual refresh of the web app — **additive/cosmetic + a11y only** (no API, route, data, or
behaviour change; build green via `tsc -b && vite build`). Goal (from Nico): make the UI distinctive,
not a generic blue dashboard. **3 commits on the branch:** `9492081` (redesign), `8b6fbc1`
(accessibility pass), `a45a5ac` (flagship doctor dashboard hero + form-label a11y).

> **Branch topology (linear, zero conflicts):** `origin/main` → `feat/medicine-catalog` (PR #2,
> tip `4e5a94c`) → `feat/ui-refresh` (PR #3, tip `a45a5ac`). PR #3 is stacked **on top of** PR #2, so
> it already contains every medicine commit. **Merge order (Option A): merge PR #2 first, then PR #3 —
> both clean fast-forwards.** `main` is branch-protected (needs 1 approving review) — merge on GitHub.

- **Design system ("Calm Clinical"):** teal primary + warm-sand surfaces + coral accent, warm borders,
  rounded-2xl cards. Tokens in `web/src/index.css` (`@theme`). Display font **Space Grotesk** (chosen
  over the skill's Figtree rec — intentional, distinctive), body **Hanken Grotesk** weight 500.
- **Accessibility (WCAG, via ui-ux-pro-max + web-design-guidelines skills):** `prefers-reduced-motion`,
  3px focus rings, skip-to-content link, `accent-color`/`color-scheme`, `touch-action: manipulation`;
  muted text `slate-400→500` (AA contrast, dark surfaces preserved); DataTable (search label, `th
  scope`, keyboard-openable rows, paging labels); Topbar bell ARIA + Esc; form labels associated.
- **Flagship:** doctor dashboard has an editorial teal-ink hero (glow + ECG line, focal stat, CTA) +
  staggered `.reveal` page-load (reduced-motion safe).
- **Responsive shell:** desktop sidebar (`layouts/Sidebar.tsx`, dark `--color-ink`) + mobile bottom-tabs
  (`layouts/BottomNav.tsx`); slim route-aware `layouts/Topbar.tsx`; shared nav config `layouts/nav.ts`.
- **Dashboards:** all 4 roles task-first via `features/dashboard/DashboardKit.tsx`
  (Greeting / ActionRow / StatStrip / Panel) with teal charts.
- **Inner pages + shared components:** blue/indigo → teal across every page; warmed cool-gray borders to
  `--color-border`; `DataTable`/`StatusBadge`/`StatusTimeline`/`PageHeader`/`ConfirmDialog` retinted.
  Semantic colors kept (emerald=done, amber=pending, red=cancel; sky=Issued/Doctor, violet=Staff); dark
  Blockchain Audit Trail panel kept.
- **Login gotcha (infra, not a bug):** the SPA shows "Invalid credentials" when the API isn't running —
  start `php artisan serve` (:8000). Demo logins: `*@deamhi.test` / `password`; dedicated admin
  `admin@deamhi.ph` / `Admin@2026!`.

## What was just done (uncommitted — staff rejection + project memory doc)

- **Staff rejection now revokes the active session.** `StaffRequestController::reject` deletes the
  staff user's tokens, so a rejected staff member is kicked immediately (previously the login gate
  only blocked *future* logins, leaving an existing token valid for ≤24h). New regression test
  `tests/Feature/StaffRequestTest.php`. **48 feature tests pass.**
- **New `Retain_Memory.md`** at repo root — durable project knowledge (architecture, features,
  standards, security, file map, setup, decisions). `CLAUDE.md` now points to it + this file.
- (No medicines/drug catalog exists — `prescription_items.drug_name` is free text; see Q below.)

## What was just done (Sprint 5.4 — commit `8a4a9d0`)

- Patient PII (`address`, `contact`, `philhealth_no`) **encrypted at rest** + `philhealth_no_hash`
  blind index; uniqueness validation rewired to the hash.
- `PatientEncryptionTest` + `WebhookTest` (PayMongo). **All 44 feature tests pass.**
- Sanctum **24h token expiry** (`SANCTUM_TOKEN_EXPIRATION`).
- `api/SECURITY.md` — controls + ISO 27001/27701/RA 10173 mapping.
- Fixes: `RegisterRequest` role `it_admin → staff`; `StorePatientRequest` password policy tightened.
- `.env.example` updated to MySQL.

## What's next (pick up here)

1. ~~`docs/SECURITY-MANUAL-VERIFICATION.md` + F-1/F-2~~ — ✅ **DONE** (committed `ef851aa`). Verification
   guide written; **F-1 fixed** (`ForceJsonResponse` middleware forces JSON for `/api/*`) and
   **F-2 fixed** (`api/SECURITY.md` follow-ups trimmed).
2. ~~Phase 4 — Fabric network + chaincode read-endpoint fix~~ — ✅ **DONE** (committed `ef851aa`) —
   see "Fabric network LIVE" above; chaincode reads now work too.
3. **Finish PayMongo** — "Pay Now" button → hosted page redirect + admin manual-payment fallback
   (webhook + signature verification already done/tested).
4. Phase 6 (deployment) later: OWASP ZAP scan on staging, HTTPS, httpOnly-cookie auth migration.

## Development plan — Medicine catalog + generic-name combobox (assigned to the other dev)

> ## ✅ DONE & build-green (UNCOMMITTED, by Mark, 2026-06-08)
> Implemented end-to-end, additive — no existing behaviour/schema/endpoint/test changed.
> - **Data:** `api/database/seeders/data/extract_medicines.py` (committed for provenance) parses the
>   PNF PDF → `medicines.csv` = **654 clean generic medicines** (generic-only, no brands).
> - **Backend:** `medicines` migration (`generic_name` unique + nullable `dosage_form`/`strength`/
>   `route` + `is_available` default true), `Medicine` model, `MedicineResource`, idempotent
>   `MedicineSeeder` (upsert; preserves availability on re-seed) wired into `DatabaseSeeder`,
>   `MedicineController` (`index` searchable `?search=`/`?available_only=1`/paginated;
>   `updateAvailability` pharmacist/admin only), routes `GET /medicines` + `PUT /medicines/{id}/availability`.
>   `MedicineTest` (8 cases). **Full suite 56 passing** (48 prior + 8). DB seeded with 654; live search verified.
> - **Frontend (additive):** `features/medicines/` (`queries.ts`, dependency-free `MedicineCombobox`,
>   `MedicineAvailabilityPage`). Combobox wired into `NewPrescriptionPage` — fills the generic
>   `drug_name`, pre-fills `dosage` from strength, **still free-typeable** (original inputs untouched).
>   Pharmacist/admin `/medicines` page (search + toggle) + route + sidebar entry. Out-of-stock badge.
> - **Also fixed (pre-existing, unrelated):** `npm run build` was red on `src/mocks/data.ts` (stale
>   mock users missing `profile_photo_url`, one `it_admin`) and `RegisterPage.tsx` (removed
>   `switchRole`). Fixed the mock data and wired `RegisterPage` to the real `/auth/register`.
>   **`npm run build` is now green.**
> - **Not yet done:** manual UI click-through (servers are up). Re-seed with `php artisan db:seed --class=MedicineSeeder`.
>
> ---
> *Original plan below (kept for reference):*

> **Goal:** give the doctor a fast, searchable picker of **generic medicines** when prescribing,
> with **form + strength + route** options, instead of free-typing the drug name. Source data is the
> official **Philippine National Formulary (PNF) 8th-edition Essential Medicines List** (PDF) — ~650
> generic medicines, already including dosage forms (tablet/syrup/injection/…), strengths, and routes.
>
> **HARD CONSTRAINT — additive only.** This is a *new feature*; it must **not** alter or break any
> existing behaviour, schema, endpoint, or test. Keep `prescription_items.drug_name` (free text)
> working exactly as today; any new columns must be **nullable** with no change to existing required
> fields. All current feature tests must still pass (`php artisan test`, currently **48**).

### Context / why
- There is **no medicines catalog today** — `prescription_items.drug_name` is plain free text.
- We use **generic names only** (the PNF list). **Brand names are out of scope** — they're in no
  dataset (manual entry) and prescribing by generic is the legally correct default (PH Generics Act,
  RA 6675). So "Biogesic" (a brand of Paracetamol) is intentionally not in the catalog — only "Paracetamol".
- Background discussion + rationale lives in this session; key decisions captured below.

### Data source (committed to the repo)
- **PDF is in the repo:** `api/database/seeders/data/PNF-EML-8th-2022.pdf` — the official PNF 8th-ed
  Essential Medicines List (as of Nov 2, 2022; from PhilHealth advisory `PA2024-0026`). Confirmed
  comprehensive A–Z (Paracetamol, Amoxicillin, Metformin, …); lists **generic name + form + strength +
  route** per medicine. **No brand names** (by design).
- **Your task: extract it to CSV.** `pdftotext` parses it cleanly (verified). Produce
  `api/database/seeders/data/medicines.csv` with columns `generic_name, dosage_form, strength, route`,
  then have the seeder read that CSV. (The raw `pdftotext` layout interleaves the two table columns, so
  budget a little cleanup — or use a PDF-table extractor.)

### Implementation
**Backend (all NEW files, additive):**
- Migration `create_medicines_table`: `id, generic_name, dosage_form (nullable), strength (nullable),
  route (nullable), is_available (boolean default true), timestamps`. Index `generic_name`.
- `app/Models/Medicine.php`.
- `database/seeders/MedicineSeeder.php` — reads the PNF CSV and bulk-inserts (chunked). Wire into
  `DatabaseSeeder` **without** disturbing existing seeders.
- `app/Http/Controllers/MedicineController.php`: `index` (searchable: `?search=para`, paginated) +
  `updateAvailability` (toggle `is_available`). `app/Http/Resources/MedicineResource.php`.
- Routes in `routes/api.php` (ADD lines only, inside the existing `auth:sanctum` group):
  `GET /medicines` (any authenticated clinical role), `PUT /medicines/{medicine}/availability`
  (**pharmacist/admin only** — follow the existing per-controller `abort_if(!hasRole(...))` pattern).
- **Availability rule:** a single `is_available` boolean per generic. UI shows
  🟢 Available / 🔴 Out of stock from that flag.

**Frontend (mostly NEW; one minimal wire-in):**
- `features/medicines/queries.ts` (TanStack: `useMedicineSearch`, `useToggleAvailability`).
- A **searchable combobox** component (shadcn `Command`/`Popover` combobox — type-ahead, NOT a plain
  `<select>`; 650 items need search). On pick, it can also expose the medicine's form/strength/route.
- Wire it into `features/prescriptions/NewPrescriptionPage.tsx` **additively**: the combobox fills the
  existing `drug_name` (generic) and can pre-fill `dosage` (strength); keep the field editable so the
  form still works if a medicine isn't found. **Do not remove the existing inputs.**
- New pharmacy screen `features/medicines/MedicineAvailabilityPage.tsx` — list grouped/searchable with
  an availability toggle (pharmacist/admin). Add a sidebar/route entry.

### Backward-compatibility guardrails (must hold)
- `prescription_items` keeps `drug_name` as-is; if you add `medicine_id`, make it **nullable** FK.
- No change to existing routes, controllers, requests, or the prescription/blockchain flow.
- `php artisan test` stays green (48). Add new tests for the medicines endpoints; don't edit existing ones.
- Scope note: this is an **availability indicator**, NOT an inventory system (no stock counts, batches,
  expiry, reorder) — consistent with the plan's "no inventory" delimitation (`eReseta_Development_Plan.md` §1.4).

### Definition of done
- Extract `api/database/seeders/data/PNF-EML-8th-2022.pdf` → `medicines.csv`, then
  `php artisan db:seed --class=MedicineSeeder` loads the PNF generics.
- Doctor's New Prescription page has a working type-to-search generic combobox that fills the drug name.
- Pharmacist/admin can toggle a medicine's availability; doctors see an available/out-of-stock badge.
- All 48 existing tests pass + new MedicineController tests pass.

## How to run (Windows)

- **PHP:** the project needs **PHP 8.4**. The default `php` on PATH may be 8.2 and will fail
  composer's platform check — use your 8.4 binary (Nico's is the winget install under
  `...\WinGet\Packages\PHP.PHP.8.4_*\php.exe`).
- **Blockchain (WSL2 + Docker Desktop, integration enabled for Ubuntu):**
  1. `wsl -d Ubuntu` → `cd /mnt/c/.../blockchain/network`. First time: `./deamhi.sh up && ./deamhi.sh deployCC`.
     **After a reboot:** `./deamhi.sh start` (resumes the existing ledger — do NOT re-run `up`, which
     regenerates crypto and wipes the ledger). `stop`/`down` also available.
  2. Start the gateway in WSL: `cd ~/ereseta-gateway` (a copy of `blockchain/gateway`; `npm install`
     once) → `CRYPTO_PATH=~/ereseta-fabric/organizations npm run dev` (listens on `:3001`).
  3. On Windows: `BLOCKCHAIN_ENABLED=true` + `QUEUE_CONNECTION=database` in `api/.env`, then run
     `php artisan queue:work` so ledger writes process **async** — a gateway/Fabric outage never blocks
     issuing a prescription (the job retries; tx ids backfill on recovery). (`./deamhi.sh down` tears
     the network down.)
- **Full restart after a reboot (in order):** (1) start **Docker Desktop**; (2) in WSL:
  `cd blockchain/network && ./deamhi.sh start` (NOT `up` — `up` wipes the ledger); (3) in WSL start
  the gateway (step 2 above); (4) on Windows: `php artisan queue:work`, `php artisan serve`, and
  `npm run dev` in `web/`. Smoke-check: `curl localhost:3001/prescription/RX-SMOKE-1` returns JSON.
  - **WSL gotchas (Nico's machine, 2026-06-03):** Ubuntu had Linux `node` but **no Linux `npm`** (and
    no passwordless sudo), and Windows Node on the WSL PATH broke `npm`/`nvm` in login shells. Fix:
    install Node via **nvm in an interactive Ubuntu terminal** (`nvm install 18`) — clean Linux
    node+npm, **no sudo** — then `cd ~/ereseta-gateway && npm install`. CRLF on `*.sh`/yaml is now
    prevented permanently by **`.gitattributes` (eol=lf)**. The WSL Docker credential helper
    (`~/.docker/config.json` → `credsStore: desktop.exe`) must be set to `{}` or image pulls fail with
    `exec format error`.
- **Tests:** `php artisan test` — uses in-memory **SQLite**, so **no DB server needed**. Expect **69 passing**.
- **Run API against real DB:** start your local MySQL/MariaDB, then `php artisan migrate` (and
  `php artisan db:seed` for demo data), then `php artisan serve`.
- **Frontend:** in `web/`, `npm install` then `npm run dev`.

## Open caveats

- The earlier session briefly started a second DB server (XAMPP MariaDB) that may hold a
  partially-applied encryption migration. The **live Laragon MySQL DB is clean**. If you ever point
  the app at XAMPP MariaDB, run `php artisan migrate:status` there first.
