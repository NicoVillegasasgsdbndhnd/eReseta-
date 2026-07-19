# eReseta+ — Defense Notes (bond-paper cheat sheet)

> Condensed to what you'll blank on under pressure. 5 sheets. Handwrite or print.

---

## 📄 SHEET 1 — System Overview & Stack

**Elevator pitch (say first):**
"eReseta+ is a healthcare system for DEAMHI with 3 modules — appointment scheduling, patient
record management, and blockchain e-prescription. Built as a **React SPA** on a **Laravel REST API**
with a **MariaDB** database. Prescription lifecycle is anchored on a **Hyperledger Fabric** blockchain.
**The database is the source of truth; the blockchain is a tamper-evident mirror.**"

**Architecture (3 tiers + blockchain):**
- Presentation → React (Vite + TS) + Tailwind + shadcn · TanStack Query (server state) · Zustand (auth) · Axios
- Application → Laravel 13 REST API · Routes→Controllers→Services→Models · Sanctum (tokens) + Spatie (RBAC)
- Data → MariaDB (**source of truth**)
- Blockchain → Node gateway → Hyperledger Fabric → Go chaincode (**audit mirror**)

**Why each (1-word reason):**
React=component UI · Laravel=all-in-one framework · MariaDB=relational data · Sanctum=token auth for SPA ·
Spatie=RBAC · Fabric=permissioned/private (no coin) · Go=Fabric's native language

**3 modules:** 1) Appointments  2) Patient Records (RA 10173 consent-gated)  3) E-Prescription + blockchain

---

## 📄 SHEET 2 — Penetration Tests (PT01–PT05)

| PT | Attack | STRIDE | Tool | Result | Key defense |
|----|--------|--------|------|--------|-------------|
| 01 | Brute force | Spoofing | Hydra/cURL/Burp | 401×12, 429 | bcrypt + throttle + generic error |
| 02 | Priv. escalation | Elevation of Priv | Burp + DevTools | 403 ×3 | `abort_if hasRole` |
| 03 | SQL injection | Tampering | sqlmap | not injectable | Eloquent parameterized queries |
| 04 | Business logic | Tampering | Browser + Burp | 422 ×3 | state machine (issue→verify→dispense) |
| 05 | Session hijack | Spoofing | Burp | 401 | token revoked on logout + expiry |

**Standard:** ISO/IEC 27001:2022 + ISO/IEC 27701:2019 (privacy). 5 areas × 3 scenarios = 15 test cases.

**HTTP codes (MEMORIZE):**
- 200 = OK ✅   401 = "who are you?" (bad login)   403 = "you can't do that" (wrong role)
- 422 = "valid but breaks a rule" (bad state)   429 = "too fast" (rate limit)

---

## 📄 SHEET 3 — STRIDE → Control → Where → Proof

| Threat | Control | Where (file:line) | Proof |
|--------|---------|-------------------|-------|
| **Spoofing** | bcrypt, generic error, rate limit | `User.php:43`, `AuthController.php:42`, `routes/api.php:54` | PT01 |
| **Tampering** | parameterized queries, Rx state machine, blockchain | Eloquent; `PrescriptionController.php:76,91` | PT03, PT04 |
| **Repudiation** | audit log (user+IP+time), ledger, break-glass | `AuditLog`; `DashboardController.php:75` | Audit page |
| **Info Disclosure** | HTTPS+HSTS, RBAC, consent gate, no PII on-chain | nginx; `PatientRecordAccess.php:66`; `User.php:37` | PT02, padlock |
| **DoS** | rate limiting | `routes/api.php:54` (10/min) | PT01 (429) |
| **Elev. of Priv** | server-side RBAC | `abort_if hasRole` in controllers | PT02 (403) |

**Answer formula:** "[Threat] is defended by [control], in [file:line], proven in [pentest]."

**N/A (not implemented — say so, don't claim):** MFA/OTP, CAPTCHA → mitigated by rate limiting + token auth.

---

## 📄 SHEET 4 — Code Locations + Endpoints

**The 3 places things live:** 📁 app code · ⚙️ server config (HTTPS/nginx/.env/DB) · 🖥️ demonstrate (browser/curl/DB)

**Key files:**
- Login (401 returned): `AuthController.php:42` · password check: `AuthService.php:15` (`Hash::check`)
- Token created: `AuthService.php:21` (`createToken('api')`) · attached: `web/src/lib/api.ts:31`
- bcrypt: `User.php:43` · hidden password: `User.php:37`
- Rate limit: `routes/api.php:54` (`throttle:10,1`) · auth gate: `routes/api.php:67` (`auth:sanctum`)
- RBAC: `UserController.php:27`, `PrescriptionController.php:44`, `DashboardController.php:75`
- Rx state machine: `PrescriptionController.php:76` (verify), `:91` (dispense)
- Consent gate: `PatientRecordAccess.php:66` · Chaincode: `blockchain/chaincode/prescription/prescription.go`
- Blockchain job: `RecordPrescriptionOnLedger` · gateway: `FabricGatewayService`

**Endpoint = 2 places:** the ROUTE (`routes/api.php`) + the CONTROLLER METHOD. Defense = `abort_if`/guard inside.

**HTTPS (⚙️ NOT app code):** nginx + Let's Encrypt (Certbot), `deploy/nginx/ereseta.conf`.
Prove: browser padlock / `curl -sI https://deamhi.ph` (HSTS) / SSL Labs.

---

## 📄 SHEET 5 — Top Q&A + Glossary

**Q: Why blockchain (not just DB)?** DB rows can be silently edited; blockchain is append-only & chained →
tampering is detectable. On-chain = ref-no + IDs + drugs only, **NO PII** (RA 10173). DB = source of truth.

**Q: Why permissioned (Fabric) not public (Ethereum)?** Hospital = closed known group; no anonymous
consensus, no cryptocurrency, no gas fees.

**Q: Blockchain down → hospital stops?** No. Ledger write is **async queued job**, retries; never blocks a
clinical action. DB is authoritative.

**Q: Why separate React + Laravel?** Separation of concerns · reusable API (web+mobile) · independent
deploy/scale · security = all authz server-side, client never trusted.

**Q: How comply RA 10173?** Terms acceptance gate + patient consent (Circle of Care) + patient privacy
portal (access log, withdraw) + no PII on-chain + audit + reviewed break-glass. DPO contact in-app.

**Q: What is break-glass?** Emergency doctor override of consent gate — logged, patient notified, admin
reviewed. Accountability, not a hard block.

**Glossary (1-liners):**
- HTTPS = encrypted HTTP (SSL/TLS) — the padlock
- API = the menu of requests frontend sends backend; REST = standard style; endpoint = one URL
- GET=read · POST=create · PUT=update · DELETE=remove
- JSON = data format `{"key":"value"}`
- Authentication = who you are (token/Sanctum) → 401 · Authorization = what you can do (RBAC/Spatie) → 403
- Token = secret string proving you're logged in (Bearer, 24h)
- Hashing/bcrypt = one-way password scramble (can't reverse)
- Rate limiting = cap requests/min → 429
- Middleware = security gate before controller (auth, throttle, terms)
- ORM/Eloquent = work with DB via objects, auto-prevents SQL injection
- Migration = versioned DB table structure
- SPA = single-page app (React) · VPS = your own server (AWS Lightsail)
- Blockchain = append-only linked records (tamper-evident) · Chaincode = Fabric smart contract (Go) ·
  Permissioned = members must be approved · Peer = holds ledger · Orderer = orders transactions

---

**Final reminder:** Answer every "where/how" in 2 beats → (1) plain definition (2) where in OUR system.
Know it. Show it. Prove it.
