# eReseta+ — System Architecture Reviewer (Defense Prep)

> Study guide for the capstone defense. Explains **how the system is structured and why**, in
> plain language, grounded in the actual code. Read top-to-bottom once, then drill the **Q&A bank**
> at the end. Everything here is defensible against the real repository.

---

## 1. The 30-second elevator pitch (memorize this)

> *"eReseta+ is a web-based healthcare system for DEAMHI hospital with three modules — appointment
> scheduling, patient record management, and a digital e-prescription system with blockchain
> traceability. It's built as a **React single-page app** talking to a **Laravel REST API** backed
> by a **MariaDB** database. The prescription lifecycle — issued, verified, dispensed — is also
> **anchored to a private Hyperledger Fabric blockchain** so prescription records are tamper-evident.
> The database is the source of truth; the blockchain is a tamper-proof audit mirror."*

If you can say that clearly and then expand on any piece, you're 80% of the way there.

---

## 2. The big picture — 3-tier architecture + blockchain

```
        ┌───────────────────────────────────────────────────────────┐
        │  PRESENTATION TIER  —  React SPA (web/)                     │
        │  Vite + TypeScript, Tailwind, shadcn/ui                     │
        │  TanStack Query (server state) · Zustand (auth state)       │
        │  Axios client → sends Bearer token on every request        │
        └───────────────────────────┬───────────────────────────────┘
                                     │  HTTPS  (JSON REST, /api/*)
                                     ▼
        ┌───────────────────────────────────────────────────────────┐
        │  APPLICATION TIER  —  Laravel 13 REST API (api/)           │
        │  Routes → Controllers → Services → Eloquent Models         │
        │  Sanctum (token auth) + Spatie Permission (RBAC)           │
        └───────┬───────────────────────────────────┬───────────────┘
                │                                   │ async, best-effort
                ▼                                   ▼  (queued job)
    ┌───────────────────────┐        ┌──────────────────────────────────┐
    │  DATA TIER            │        │  BLOCKCHAIN TIER                  │
    │  MariaDB              │        │  Node gateway (:3001)             │
    │  = SOURCE OF TRUTH    │        │    → Hyperledger Fabric           │
    │  all clinical data    │        │    → Go chaincode "prescription"  │
    └───────────────────────┘        │  = tamper-evident AUDIT MIRROR    │
                                     └──────────────────────────────────┘
```

**Key idea to repeat under questioning:** the **database holds all real data**; the **blockchain only
mirrors the prescription lifecycle** (issue → verify → dispense) as a tamper-proof log. They are
**decoupled** — if the blockchain is down, clinical work continues (the ledger write is async).

---

## 3. Monorepo structure (know where things live)

```
eReseta-/
├── web/          React SPA (frontend)          → the user interface
├── api/          Laravel REST API (backend)    → business logic + database
└── blockchain/   Hyperledger Fabric            → ledger, gateway, chaincode
    ├── network/    Fabric network (peer+orderer, Docker)
    ├── gateway/    Node.js service (HTTP → Fabric SDK)
    └── chaincode/  Go smart contract "prescription"
```

**Why a monorepo?** One repository holds all three parts so they version together and the team shares
one source of truth. The three parts are still **independently deployable** (SPA is static files;
API is PHP-FPM; blockchain runs in Docker).

---

## 4. Tech stack — and *why* each choice (panels ask "why did you use X?")

| Layer | Technology | Why we chose it |
|-------|-----------|-----------------|
| Frontend | **React + Vite + TypeScript** | Component-based UI, fast dev server, TypeScript catches errors at compile time |
| Styling | **Tailwind CSS + shadcn/ui** | Utility-first, consistent design system, accessible components |
| Server state | **TanStack Query** | Caches API data, auto-refetch, avoids manual loading/error handling |
| Auth state | **Zustand** | Lightweight store; holds the logged-in user + token |
| Forms | **React Hook Form + Zod** | Type-safe validation on the client |
| Backend | **Laravel 13 (PHP 8.4)** | Mature framework: routing, ORM, validation, queues, auth all built in |
| Database | **MariaDB** | Reliable relational DB; clinical data is highly relational (patients↔appointments↔records↔prescriptions) |
| Auth | **Laravel Sanctum** | Token-based API auth — fits a separate SPA + API cleanly |
| Authorization | **Spatie Laravel Permission** | Battle-tested role-based access control (RBAC) |
| PDF | **barryvdh/laravel-dompdf** | Generate printable prescriptions |
| Blockchain | **Hyperledger Fabric** | *Permissioned* ledger — right for a private hospital consortium (not a public coin) |
| Chaincode | **Go** | Fabric's native, best-supported smart-contract language |
| Gateway | **Node.js + `@hyperledger/fabric-gateway`** | Bridges the PHP API to Fabric over a simple HTTP interface |

---

## 5. Layered backend architecture (how a request is handled)

Laravel follows a **layered pattern** — each layer has one job:

```
Route  →  Middleware  →  Controller  →  Service  →  Model (Eloquent)  →  MariaDB
         (auth, RBAC,      (validates      (business    (data access)
          rate limit)       input,          logic)
                            returns JSON)
```

- **Routes** (`api/routes/api.php`) — map URLs to controllers, attach middleware.
- **Middleware** — cross-cutting concerns: `auth:sanctum` (must be logged in), `throttle` (rate limit),
  `EnsurePasswordChanged` (force password change on first login).
- **Controllers** (`app/Http/Controllers/`) — thin: validate input (via **Form Requests**), enforce
  role checks (`abort_if(...hasRole...)`), return JSON (via **API Resources**).
- **Services** (`app/Services/`) — the real business logic. Examples:
  `PrescriptionService` (create/verify/dispense), `AppointmentService`, `PatientRecordAccess`
  (RA 10173 consent gate), `FabricGatewayService` (talk to the blockchain), `AuthService`.
- **Models** (`app/Models/`) — Eloquent ORM; each model = one table + its relationships.

**Why layers?** Controllers stay thin and testable; business logic is reusable and isolated in
services; swapping the DB or blockchain doesn't ripple through the whole app.

---

## 6. A request end-to-end — "issuing a prescription" (the star example)

Trace this out loud in the defense — it touches every tier:

```
1. Doctor (React SPA) fills the Rx form → Axios POST /api/prescriptions
   (Authorization: Bearer <token> attached automatically)
2. Laravel route → auth:sanctum + throttle middleware pass
3. PrescriptionController@store:
      - abort_if(!doctor && !admin) → 403 if wrong role   [RBAC]
      - StorePrescriptionRequest validates the payload      [input validation]
4. PrescriptionService->create():
      - writes Prescription + PrescriptionItem rows to MariaDB   [SOURCE OF TRUTH]
      - records a PrescriptionEvent (status=issued)
      - dispatches RecordPrescriptionOnLedger job to the QUEUE   [async]
5. API returns 201 + the new prescription JSON → SPA shows it instantly
6. LATER (queue worker, out-of-band):
      RecordPrescriptionOnLedger → FabricGatewayService (HTTP)
        → Node gateway (:3001) → Go chaincode → Fabric ledger
      → tx id saved back to prescriptions.blockchain_tx_id
```

**The point:** step 5 (the clinical action) **never waits** for the blockchain. Step 6 is
best-effort, retried, idempotent. The ledger write is a **background audit**, not a blocker.

---

## 7. The three core modules

| Module | What it does | Key entities |
|--------|--------------|--------------|
| **1. Appointment Scheduling** | Public guest booking → staff approval → scheduled appointment → consultation | `AppointmentRequest`, `Appointment`, `Doctor`, `DoctorLeave` |
| **2. Patient Record Management** | Doctors author clinical records during consultations; consent-gated access (RA 10173) | `PatientRecord`, `PatientChart`, `PatientConsent`, `RecordAccessGrant`, `PatientDocument` |
| **3. Digital E-Prescription (+ blockchain)** | Doctor issues → pharmacist verifies → pharmacist dispenses; each step anchored on-chain | `Prescription`, `PrescriptionItem`, `PrescriptionEvent`, `Medicine`, `MedicineBrand` |

**Supporting modules:** User/Account management + RBAC, Audit logging, Billing, Diagnostic-test
ordering, Dashboard/Reports, Blockchain Explorer (admin).

---

## 8. Data model — key entities & relationships (your ERD in words)

**The account model is role-based:**
- A **`User`** has one role (patient / doctor / staff / pharmacist / admin) via **Spatie**.
- A User **hasOne `Patient`** *or* **hasOne `Doctor`** profile (role-specific details).
- A **staff** User **belongsTo an `assignedDoctor`** (a self-referencing link) — staff only manage
  their own doctor's queue.

**The clinical chain (memorize this path):**
```
Patient ──< Appointment ──> (consultation) ──> PatientRecord ──< Prescription ──< PrescriptionItem
                                                                      │                    │
                                                                      └──< PrescriptionEvent │
                                                                                            └─> Medicine (generic)
                                                                                                 └─ dispensed_brand → MedicineBrand
```
- A **`Patient`** has many **`Appointment`s** and **`PatientRecord`s**.
- A **`PatientRecord`** (created by a doctor during a consultation) has many **`Prescription`s**.
- A **`Prescription`** `belongsTo` a `PatientRecord` + a `Doctor`; `hasMany` **`PrescriptionItem`s**
  (the drugs) and **`PrescriptionEvent`s** (its lifecycle history: issued/verified/dispensed).
- A **`PrescriptionItem`** references a **`Medicine`** (the *generic* — doctors prescribe generic-only
  per RA 6675) and, at dispensing, a **`MedicineBrand`** (`dispensed_brand_id`) — what the pharmacist
  actually handed out.

**Privacy/audit entities:** `PatientConsent` + `RecordAccessGrant` (RA 10173 consent gate + break-glass),
`AuditLog` (who did what, when, from which IP).

**Golden distinction to nail:** a **PatientRecord** = the clinical encounter/notes; a **Prescription**
= the medication order created *within* that record. They're different tables in a parent→child relationship.

---

## 9. Authentication & Authorization

**Authentication (who are you?) — token-based:**
1. User logs in (`POST /api/auth/login`) → Laravel checks the **bcrypt-hashed** password.
2. On success, **Sanctum** mints a **Bearer token** (24h expiry) → returned to the SPA.
3. The SPA stores it (Zustand + localStorage) and Axios attaches `Authorization: Bearer <token>` to
   every request. On logout the token is **deleted server-side** (revoked).

**Why tokens, not sessions?** The frontend and backend are separate apps (SPA + API). Stateless
Bearer tokens fit that cleanly and are standard for APIs.

**Authorization (what can you do?) — RBAC via Spatie:**
- Every protected endpoint checks the role **server-side**: `abort_if(!$user->hasRole('admin'), 403)`.
- The UI *also* hides features per role, but **the server is the real gate** — hiding a menu isn't
  security (this is exactly what your PT02 pentest proved).

**Roles & boundaries:** patient (own data), doctor (clinical: records/prescriptions), pharmacist
(verify/dispense only), staff (appointment requests + patient registration for their doctor), admin
(users, audit logs, oversight).

---

## 10. The blockchain — deep dive (expect the most questions here)

**What it is:** a **private, permissioned Hyperledger Fabric** network — **1 organization (DEAMHIMSP),
1 peer, 1 orderer (Raft)**, channel `ereseta-channel`, running a **Go smart contract (chaincode)**
called `prescription`.

**What's on-chain vs off-chain (critical for the data-privacy question):**
- **On-chain:** only the prescription's `reference_no`, internal IDs, the drug list, and lifecycle
  status changes. **NO patient names, NO PII** — this is deliberate **RA 10173 data minimization**.
- **Off-chain (MariaDB):** everything real — patients, records, full prescriptions. **MySQL is the
  source of truth.**

**How integration works (the flow):**
```
PrescriptionController → PrescriptionService → [queued] RecordPrescriptionOnLedger job
   → FabricGatewayService (HTTP, token-secured)
   → Node gateway (:3001, @hyperledger/fabric-gateway)
   → Go chaincode → writes to the Fabric ledger
   → returns a tx id, saved to prescriptions.blockchain_tx_id
```

**Why blockchain at all (not just a DB audit log)?** A database admin can silently edit or delete a
DB audit row. A blockchain ledger is **append-only and cryptographically chained** — tampering is
detectable. For prescriptions (a controlled, legally-sensitive record) that **tamper-evidence** is
the value: you can prove a prescription's history wasn't altered.

**Why permissioned (Fabric), not public (like Ethereum)?** A hospital is a **closed, known consortium**
— you don't need anonymous public consensus or a cryptocurrency. Fabric gives you **identity-controlled
membership, privacy, and no gas fees** — the right tool for enterprise/private use.

**Why is MySQL still the source of truth, not the chain?** Blockchains are slow, hard to query, and
bad at storing/relating large records. So we use the **right tool for each job**: the relational DB
for live clinical data, the ledger as a **tamper-proof mirror** of the prescription lifecycle only.

**What if the blockchain is down?** Nothing breaks. The ledger write is an **async, best-effort,
retried, idempotent** queued job — it **never blocks** a doctor issuing or a pharmacist dispensing.
The DB is authoritative; the chain catches up.

**Honest simplifications (say these confidently — they're deliberate, not bugs):** single org / single
peer / identities via `cryptogen` (no CA service) / LevelDB world state (no CouchDB). These keep the
academic scope manageable; a production deployment would add more orgs/peers and a CA.

---

## 11. Data Privacy & Compliance — RA 10173 (know this cold — it's a hospital system)

The system has a full **Data Privacy Act of 2012 (RA 10173)** compliance layer. A health +
cybersecurity panel *will* push on this — here are the five pieces:

**a) Terms & Privacy acceptance gate.** On first login (and whenever the terms version changes) a user
must **review and accept** the Terms & Privacy agreement before using the app. Enforced by the
`EnsureTermsAccepted` middleware — until you accept the current version (`Terms::VERSION`, currently
**v2**), every protected request returns **403**. Two role-tailored variants:
- **Patient** — plain-language notice: how records are used, "Circle of Care" sharing, consent,
  withdrawal, and break-glass notification.
- **Employee** (doctor / staff / pharmacist) — binding legal terms: strict confidentiality,
  **need-to-know-only** access (curiosity browsing = terminal offense under RA 10173), and
  acknowledgment that **100% of actions are audited**.
Includes DPO (`dpo@deamhi.ph`) + National Privacy Commission contacts.

**b) Patient consent — "Circle of Care."** Non-doctor **staff can view a patient's clinical records
only after the patient grants DPA consent** (`PatientConsent`); attending doctors have clinical
access. Consent is **withdrawable anytime**.

**c) Break-glass emergency access.** In a documented emergency a physician can override the consent
gate (`BreakGlassController`) — but it is **logged, the patient is notified**
(`RecordAccessedByBreakGlass`), and **admins review** every override (`BreakGlassAlertsPanel`). The
standard healthcare pattern: never block an emergency, but make every override accountable.

**d) Patient privacy portal (data-subject rights).** Patients get self-service endpoints:
`/me/consent` (status), `/me/privacy-log` (who accessed my record), `/me/consent/withdraw`. This
implements RA 10173 rights: **right to be informed, right to access, right to withdraw consent.**

**e) Compliance registers (DPO / admin).** `/compliance/consent-register` +
`/compliance/terms-acceptance` give the Data Protection Officer an audit-ready overview of who has
consented / accepted terms.

**One-line summary:** the privacy layer provides **notice** (terms), **consent** (Circle of Care),
**minimization** (no PII on-chain), **accountability** (audit + reviewed break-glass), and
**data-subject rights** (privacy portal) — the pillars RA 10173 requires.

---

## 12. Security architecture (ties to your STRIDE pentest)

| Threat (STRIDE) | Control in the system |
|-----------------|-----------------------|
| **Spoofing** | Bcrypt passwords, generic login errors (no enumeration), rate limiting (429), token auth |
| **Tampering** | Server-side validation (Form Requests), Eloquent parameterized queries (no SQL injection), prescription state machine, **blockchain immutability** |
| **Repudiation** | Audit log (user + IP + timestamp) + immutable ledger |
| **Information Disclosure** | HTTPS + HSTS, RBAC, **no PII on-chain**, RA 10173 consent gate |
| **Denial of Service** | Rate limiting / throttling on sensitive endpoints |
| **Elevation of Privilege** | Server-side RBAC (`abort_if hasRole`), deny-by-default |

Standards mapped: **ISO/IEC 27001:2022 + ISO/IEC 27701:2019** (privacy). Verified by your 5 penetration
tests (PT01–PT05).

---

## 13. Deployment architecture

```
Internet → deamhi.ph (HTTPS, Let's Encrypt + HSTS)
   → nginx (reverse proxy, serves React static build + proxies /api)
       → PHP-FPM (Laravel API)
           → MariaDB (127.0.0.1 only)
           → Redis/DB queue → queue worker (systemd) → blockchain
   → Hyperledger Fabric (Docker) + Node gateway (systemd, 127.0.0.1:3001)
```

- **Host:** AWS Lightsail (Ubuntu 24.04). **systemd services:** `ereseta-queue` (runs jobs incl.
  ledger writes), `ereseta-scheduler`, `ereseta-fabric-network`, `ereseta-fabric-gateway`.
- **Prod hardening:** `APP_DEBUG=false`, MySQL bound to localhost, secrets in `.env` (not git),
  HTTP→HTTPS 301, security headers.

---

## 14. 🎯 Q&A BANK — likely panel questions + model answers

**Q: Walk us through your system architecture.**
A: *Use §2 + the elevator pitch.* Three-tier: React SPA → Laravel REST API → MariaDB, plus a Hyperledger
Fabric blockchain that mirrors the prescription lifecycle. Database is the source of truth; blockchain
is a tamper-evident audit layer.

**Q: Why did you use blockchain? Isn't a database audit log enough?**
A: A DB audit row can be silently altered or deleted by anyone with DB access. A blockchain ledger is
append-only and cryptographically chained, so tampering is *detectable*. For legally-sensitive
prescription records, that tamper-evidence is the point.

**Q: What data is stored on the blockchain? Isn't that a privacy risk?**
A: No PII goes on-chain — only the reference number, internal IDs, drug list, and status changes. That's
deliberate RA 10173 data minimization. All personal data stays in the encrypted-in-transit MariaDB.

**Q: Why permissioned blockchain instead of a public one like Ethereum?**
A: A hospital is a closed, known group — we don't need anonymous public consensus or a cryptocurrency.
Fabric gives identity-controlled membership, privacy, and no transaction fees.

**Q: If the blockchain fails, does the hospital stop working?**
A: No. The ledger write is an asynchronous, best-effort, retried background job. Doctors and pharmacists
keep working against the database; the chain catches up when it's back.

**Q: Why separate the frontend and backend (React + Laravel) instead of one app?**
A: Separation of concerns — the API can serve web, mobile, or third parties; the frontend is a fast SPA;
each scales and deploys independently. Token auth (Sanctum) fits this cleanly.

**Q: How do you handle authentication and authorization?**
A: Authentication via Sanctum Bearer tokens (bcrypt-checked, 24h expiry, revoked on logout).
Authorization via Spatie role-based access control, enforced **server-side** on every endpoint —
the UI hides features, but the server is the real gate.

**Q: How do you enforce that a patient can't access another patient's data?**
A: Server-side ownership checks (e.g., a prescription's patient must match the requester) plus RBAC,
plus the RA 10173 consent gate for records. Verified by our IDOR / privilege-escalation pentests.

**Q: What's the difference between a Patient Record and a Prescription?**
A: A PatientRecord is the clinical encounter (diagnosis/notes) created by a doctor; a Prescription is a
medication order created *within* that record. Parent→child relationship.

**Q: Explain the prescription lifecycle.**
A: Issued (by a doctor) → Verified (by a pharmacist) → Dispensed (by a pharmacist). The server enforces
the order — you can't dispense before verifying. Each transition writes a PrescriptionEvent and is
anchored on the blockchain. Doctors prescribe by *generic*; the pharmacist records the *brand* dispensed.

**Q: Why MariaDB (a relational DB)?**
A: Clinical data is highly relational — patients, appointments, records, prescriptions, items all link
together. A relational DB with foreign keys and transactions models that correctly.

**Q: What are the limitations / future work?**
A: Single-org/single-peer Fabric (academic scope) — production would add more orgs/peers and a CA
service; add MFA for privileged roles; CouchDB world state for rich queries; horizontal scaling.

**Q: How is data protected in transit and at rest?**
A: In transit: HTTPS + HSTS. At rest: bcrypt-hashed passwords, DB bound to localhost, secrets outside
git, RBAC + consent-gated access, and no PII on-chain.

**Q: How did you validate the system's security?**
A: STRIDE-based penetration testing (5 areas, 15 test cases) mapped to ISO/IEC 27001 + 27701 —
authentication, RBAC, SQL injection, prescription integrity, and session management — all passed.

**Q: How does your system comply with the Data Privacy Act (RA 10173)?**
A: A full privacy layer: a Terms & Privacy acceptance gate on login, patient consent for record
sharing (Circle of Care), data-subject rights via a patient privacy portal (view access log, withdraw
consent), data minimization (no PII on-chain), and accountability through audit logs plus reviewed
break-glass overrides. A Data Protection Officer contact is provided in-app.

**Q: What is "break-glass" access and why allow it?**
A: An emergency override so a physician isn't locked out of a record in a life-threatening situation.
It's safe because every use is logged, the patient is automatically notified, and admins review each
override — accountability instead of a hard block that could cost a life.

**Q: How do you stop staff from snooping on patient records?**
A: Non-doctor staff need explicit patient DPA consent to view clinical records; the employee terms
make curiosity-browsing a terminal offense under RA 10173; and every access is audited with user, IP,
and timestamp — the patient can even see their own access log.

---

## 15. Last-minute confidence checklist
- [ ] Can I draw the 3-tier + blockchain diagram from memory? (§2)
- [ ] Can I trace "issue a prescription" end-to-end? (§6)
- [ ] Can I explain *why blockchain* + *what's on-chain* + *DB is source of truth*? (§10)
- [ ] Can I explain how RBAC is enforced server-side? (§9)
- [ ] Can I name the 3 core modules + their key tables? (§7, §8)
- [ ] Can I state one limitation and its future-work fix? (§13)

## 16. 🧩 How to confidently explain your CODE (read this if you're nervous about code questions)

**The secret: you do NOT memorize every line.** You learn the **6 file types** and the **one job each
one does**. Then whatever file the panel points at, you say the same sentence pattern:

> *"This is a **[type]**. Its job is **[one job]**. In this case it **[what it does here]**."*

That single move handles 90% of "explain your code" questions.

### The 6 file types (learn these — it's the whole game)

**Backend (Laravel, in `api/`):**
| File type | Its ONE job | Folder | How to explain it |
|-----------|-------------|--------|-------------------|
| **Route** | Maps a URL to a controller + attaches middleware | `routes/api.php` | "This line says: when a POST hits `/api/prescriptions`, run `PrescriptionController@store`, but first check the user is logged in and not rate-limited." |
| **Controller** | Receives the request, checks permission, validates input, returns JSON | `app/Http/Controllers/` | "It's the traffic cop — it doesn't do heavy logic, it checks who's allowed and hands off to a service." |
| **Service** | The actual business logic | `app/Services/` | "The real work lives here — e.g., `PrescriptionService` creates the prescription and queues the blockchain job." |
| **Model** | Represents one database table + its relationships | `app/Models/` | "`Prescription` = the prescriptions table; `->items()` links to its drug rows, `->doctor()` to who issued it." |
| **Form Request** | Validates incoming data | `app/Http/Requests/` | "Defines the rules the input must pass before the controller even runs." |
| **Middleware** | Runs before the controller (auth, rate limit, terms gate) | `app/Http/Middleware/` | "A gate every request passes through — e.g., `EnsureTermsAccepted` blocks you until you accept the privacy terms." |

**Frontend (React, in `web/`):**
| File type | Its ONE job | How to explain it |
|-----------|-------------|-------------------|
| **Component** (`.tsx`) | Renders a piece of UI | "A reusable UI building block — this one renders the login form." |
| **Query/Mutation hook** (`queries.ts`) | Talks to the API + caches the result (TanStack Query) | "This fetches prescriptions from the API and keeps them cached so the UI is fast." |
| **Store** (`authStore.ts`) | Holds shared state (Zustand) | "Keeps the logged-in user + token in memory so any page can use it." |
| **API client** (`lib/api.ts`) | One configured Axios instance for all API calls | "Every request goes through here — it auto-attaches the login token." |

### One fully-annotated slice: **LOGIN** (rehearse this out loud)

**1. The frontend sends the login** — `web/src/features/auth/authStore.ts`:
```ts
login: async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password })   // call the API
  set({ user: data.user, token: data.token, isAuthenticated: true })    // save token in the store
}
```
*Say:* "The store's `login` action posts the email + password to the API, then saves the returned token."

**2. Every future request auto-attaches the token** — `web/src/lib/api.ts` (your real code):
```ts
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('ereseta-auth')
  const token = JSON.parse(stored).state?.token
  if (token) config.headers.Authorization = `Bearer ${token}`   // attach on every request
  return config
})
```
*Say:* "This interceptor runs before every request and adds `Authorization: Bearer <token>`, so I don't repeat it everywhere."

**3. The backend verifies it** — `api/app/Http/Controllers/AuthController.php`:
```php
public function login(LoginRequest $request): JsonResponse
{
  try {
    $result = $this->authService->login($request->email, $request->password);  // check password
  } catch (ValidationException) {
    return response()->json(['message' => 'The provided credentials are incorrect.'], 401); // generic error
  }
  return response()->json(['token' => $result['token'], 'user' => new UserResource(...)]);   // mint token
}
```
*Say:* "The controller hands the credentials to `AuthService`, which checks the bcrypt-hashed password. If wrong, it returns a **generic** 401 so attackers can't tell which accounts exist. If right, Sanctum mints a token."

**That's the whole login loop** — frontend stores the token, the interceptor replays it, the backend verifies it. If you can narrate those three steps, you've shown you understand your own auth code.

### "If they point at this, say this" — quick scripts
- **A controller method** → "This handles the `[X]` request. First it checks the role with `abort_if`, validates input, then calls the service, and returns JSON."
- **`abort_if($user->hasRole('admin')...)`** → "This is my server-side access control — if the user isn't an admin, it stops with a 403 before doing anything."
- **A model with `->hasMany(...)`** → "This defines a relationship — a prescription *has many* items, so I can load a prescription with all its drugs in one query."
- **The `throttle:10,1` on a route** → "Rate limiting — max 10 requests per minute, my brute-force protection."
- **A `queries.ts` hook** → "This uses TanStack Query to fetch and cache API data; the component just calls the hook and gets loading/error/data for free."
- **A migration file** → "This defines a database table's structure — it's how the schema is version-controlled and recreated on any machine."

### Confidence tips for the moment
1. **You built this** — you know it better than the panel. Speak in plain English, not jargon.
2. **Point at the file/folder** while you talk — "this is a controller, in the controllers folder" grounds your answer.
3. If you blank on a detail: **describe the file's JOB**, not the line. "This is a service, so it holds the business logic for X" is always a correct start.
4. **Trace, don't recite** — narrate the flow (request → controller → service → DB) rather than memorizing lines.
5. It's fine to say **"my teammate wrote this part, but its job is X and it fits here in the flow"** — showing you understand the *architecture* matters more than authorship.
6. **Redirect to strength:** whatever they point at, connect it back to a concept you know cold (RBAC, the layered pattern, the blockchain flow).

---

## 17. 🎯 Pentest → Code Map (point at the TARGET and the DEFENSE)

Every pentest has **two** code locations: the **target** (endpoint the attack hits) and the **defense**
(the exact line that stops it). Show both. Line numbers verified against current `main`.

### PT01 — Authentication / Brute Force (Spoofing)
**Target:** `POST /api/auth/login` → `AuthController@login`
| Defense | File : line | What it does |
|---------|-------------|--------------|
| Rate limiting (TC2) | `routes/api.php:54` — `throttle:10,1` | Max 10 logins/min → 429 |
| Password hashing (TC1) | `app/Models/User.php:43` — `'password' => 'hashed'` | bcrypt; guesses never match |
| No enumeration (TC3) | `app/Http/Controllers/AuthController.php:42` | Generic 401 for bad email *or* bad password |
| Password never leaked | `User.php:37` — `$hidden` | Password excluded from responses |

*Say:* "PT01 attacks the login route. Defenses: rate-limit on the route, bcrypt in the User model, and a generic error in AuthController so attackers can't tell which accounts exist."

### PT02 — Authorization / RBAC (Elevation of Privilege)
**Targets:** three privileged endpoints a patient tries to reach.
| Attack (TC) | Target endpoint → method | Defense (file : line) |
|-------------|--------------------------|-----------------------|
| TC1 | `GET /api/users` → `UserController@index` | `UserController.php:27` — `abort_if(!isAdmin…, 403)` |
| TC2 | `POST /api/prescriptions` → `PrescriptionController@store` | `PrescriptionController.php:44` — `abort_if(!doctor && !admin, 403)` |
| TC3 | `GET /api/dashboard/audit-logs` → `DashboardController@auditLogs` | `DashboardController.php:75` — `abort_if(!hasRole('admin'), 403)` |

Supplementary proof: `tests/Feature/RoleBoundaryTest.php`.
*Say:* "Each privileged controller method starts with `abort_if($user->hasRole(...))` — server-side RBAC. Even a valid patient token gets 403 before anything runs."

### PT03 — SQL Injection (Tampering)
**Targets:** user inputs — availability `date`, login `email`, appointment form fields.
| Defense | File : line | What it does |
|---------|-------------|--------------|
| Input validation | `app/Http/Controllers/PublicController.php:43` — `validate(['date'=>['required','date']])` | Rejects non-date input |
| Parameterized queries | `PublicController.php:46,54` — Eloquent `whereDate(...)` | Binds params; input never concatenated into SQL |
| Form Request validation | `app/Http/Requests/*` | Rules enforced before the controller |

*Say:* "The defense is Eloquent's parameterized queries plus Form Request validation — input is bound, never concatenated into SQL — which is why sqlmap reports 'not injectable.'"

### PT04 — Prescription Integrity / Business Logic (Tampering)
**Targets:** `PUT /api/prescriptions/{id}/verify` and `/dispense`, and `GET /api/prescriptions/{id}`.
| Attack (TC) | Defense (file : line) | What it does |
|-------------|-----------------------|--------------|
| TC2 (re-verify) | `PrescriptionController.php:76` — `if status !== Issued → 422` | Blocks illegal verify |
| TC1/TC3 (dispense out of order) | `PrescriptionController.php:91` — `if status !== Verified → 422` | Blocks illegal dispense |
| Role lock | `PrescriptionController.php:74, 89` — `abort_if(!pharmacist, 403)` | Only pharmacist changes state |
| IDOR (cross-patient) | `PrescriptionController.php:60` — ownership `abort_if(...403)` | Patient sees only own Rx |
| Tamper-evidence | `PrescriptionService` → `RecordPrescriptionOnLedger` job | Each change anchored on blockchain |

*Say:* "PT04 attacks the prescription lifecycle. The defense is a server-side state machine in verify/dispense — each checks the current status and throws 422 on an illegal transition — plus an ownership check in show() and blockchain anchoring."

### PT05 — Session Management (Spoofing)
**Targets:** `GET /api/auth/me`, `POST /api/auth/logout` with tokens.
| Defense | File : line | What it does |
|---------|-------------|--------------|
| Token revocation on logout | `AuthController.php:118` — `currentAccessToken()?->delete()` | Old token stops working |
| Reject invalid/expired tokens | `routes/api.php:67` — `auth:sanctum` | Forged/expired token → 401 |
| Token expiry (24h) | `config/sanctum.php:55` — `expiration` | Short-lived tokens |
| Hardened cookies | `config/session.php:172,185` — `secure`, `http_only` | Not readable by JS / not sent over HTTP |

*Say:* "Logout deletes the token server-side, the auth:sanctum middleware rejects forged or expired tokens, tokens expire in 24h, and cookies are Secure + HttpOnly."

---

*Grounded in the eReseta+ repository: `app/Models`, `app/Services`, `app/Http/Controllers`,
`routes/api.php`, `web/src/lib/api.ts`, `web/src/features/auth/authStore.ts`,
`blockchain/{chaincode,gateway,network}`. Cross-check with `PROJECT_STATUS.md`
and `HYPERLEDGER_DOCUMENTATION.md` for deeper detail.*
