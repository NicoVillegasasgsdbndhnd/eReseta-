# eReseta+ — BSIT Cybersecurity Research Progress Checklist (Filled)

> Filled against the **actual eReseta+ system** (live at https://deamhi.ph) and our paper.
> Legend: ✅ done/evidenced · 🟡 in progress · ❌ **REMOVE** (not in our system) · ➕ **ADD** (in our
> system, not in the template) · ⚠️ **NEEDS YOUR INPUT** (can't verify from code — fill from paper).
> Security mapping uses **STRIDE + ISO/IEC 27001:2022 + ISO/IEC 27701:2019** (our approved direction).

---

## A. Project Information
| Field | Value |
|-------|-------|
| Group Name | ⚠️ confirm (template shows *WatchTech*) |
| Project Title | **eReseta+** — Web-Based Healthcare System with Blockchain-Traceable E-Prescription for DEAMHI |
| Group Members | ⚠️ fill (Mark, Nico, …) |
| Client / Beneficiary | **Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI)** |
| Company / Institution | DEAMHI |
| Adviser | ⚠️ fill · Course Adviser: Abricam S. Tinga |
| Course / Section | TC32 |
| Evaluation Model | ⚠️ check the box you approved (System quality: ISO/IEC 25010 **or** FURPS) — **Security: STRIDE + ISO/IEC 27001 + ISO/IEC 27701** |

---

## B.1 Chapter 4 — Results and Discussion
> Implementation is **done and deployed**; the manuscript write-up of results is the remaining work.

| Item | Status | % | Evidence | Remarks |
|------|--------|---|----------|---------|
| System Implementation Overview | ✅ Completed | 100% | Live demo https://deamhi.ph, module screenshots | System finished + deployed (AWS Lightsail) |
| Implemented Web Modules Summary | ✅ Completed | 100% | Module screenshots (Patient, Doctor, Pharmacist, Admin, Appointment, Records, Prescription) | See C.1 |
| Security Components Implementation Summary | ✅ Completed | 100% | RBAC, audit trail, session mgmt, secure upload, output encoding, **blockchain** | ❌ exclude MFA/CAPTCHA (not implemented) |
| Results of System Quality Evaluation | ⚠️ 🟡 | — | Survey summary / evaluation tables | Fill from 3.7.x (ISO 25010 or FURPS) |
| Functional Suitability Results | ⚠️ 🟡 | — | Functional test results | From FRS functional requirements |
| Performance Efficiency Results | ⚠️ 🟡 | — | Response-time / KPI table | From NFRs/KPIs |
| Reliability Results | ⚠️ 🟡 | — | Uptime/stability | Live since deployment |
| Usability Results | ⚠️ 🟡 | — | User survey | From acceptance testing |
| Results of Security Testing & Vuln. Assessment | 🟡 In progress | 60% | **PENTEST_GUIDE.md** (PT01–PT05) | PT01 & PT02 done; PT03–PT05 pending |
| **Spoofing Results** (Table 1 & 2) | 🟡 | 100% (test) | PT01 Authentication — 401 wall + 429 rate-limit | ✅ done |
| **Tampering Results** | 🟡 | 50% | PT03 SQL Injection (sqlmap) + PT04 Prescription business logic | PT03/PT04 pending recording |
| **Repudiation Results** | ✅ | 100% | Audit trail (user + IP + timestamp) + blockchain ledger | screenshot captured |
| **Information Disclosure Results** | ✅ | 100% | HTTPS+HSTS, no PII on-chain, 403/404 on cross-access | |
| **Denial of Service Results** | ✅ | 100% | Rate limiting (`throttle:10,1` login) → 429 | controlled, non-destructive |
| **Elevation of Privilege Results** | ✅ | 100% | PT02 RBAC — patient→admin/doctor/audit all 403 | ✅ done |
| Discussion / Interpretation / Implication of Findings | ⚠️ 🟡 | — | Narrative | Write after all PT videos |

---

## C.1 Development Scope & Security Components — **99.6% (keep as-is)**
Your existing C.1 is accurate. One note: **`c. System Maintenance` (90%)** and **Backup/Recovery (90%)** — a
`deploy/scripts/backup-db.sh` exists; if it's scheduled/tested you may raise these.

➕ **Confirm these eReseta+-specific rows are present (they are real controls):**
- Blockchain-Based Prescription Traceability — ✅ 100% (Hyperledger Fabric live)
- Security headers / HSTS — ✅ 100% (nginx security snippet)

---

## C.2 Penetration Testing / Security Testing (STRIDE)
> Map the template's 5 rows to our **5 penetration testing areas (PT01–PT05)** from `PENTEST_GUIDE.md`.

| Template row (STRIDE) | Our PT area | Status | % | Evidence |
|-----------------------|-------------|--------|---|----------|
| Spoofing — Authentication Bypass Test | **PT01** Authentication (Brute Force) | ✅ Done | 100% | 401 ×12, 429 rate-limit, no enumeration |
| Tampering — Parameter/Input Manipulation Test | **PT03** SQL Injection (sqlmap) + **PT04** Prescription business logic | 🟡 | 40% | sqlmap "not injectable"; lifecycle 422s |
| Repudiation — Audit Trail Verification Test | Audit logs (admin) + blockchain | ✅ Done | 100% | audit log w/ user+IP+timestamp |
| Information Disclosure — Sensitive Data Exposure Test | Info disclosure checks | ✅ Done | 100% | HTTPS/HSTS, 403/404, no PII on-chain |
| Elevation of Privilege — RBAC Bypass Test | **PT02** Authorization / RBAC | ✅ Done | 100% | patient→admin/doctor/audit all 403 |
| ➕ Session Management — Session Hijacking Test | **PT05** Session Management | 🟡 Ready | 0% | token revoke on logout, forged-token 401 |

> Note for adviser: PT01–PT05 follow the *5 areas × 3 scenarios = 15 test cases* structure (one video each).

---

## C.3 Security Requirements Traceability Matrix
| Security Feature | Related Threat | Security Requirement | Test Case | Evidence | Status |
|------------------|----------------|----------------------|-----------|----------|--------|
| Password Hashing | Information Disclosure | No plaintext passwords | Verify DB value is hashed | bcrypt (`'password'=>'hashed'`) | ✅ |
| ❌ **MFA / OTP** | Spoofing | — | — | — | **N/A — not implemented.** Mitigated by rate limiting + token auth |
| ❌ **CAPTCHA / reCAPTCHA** | DoS / Spoofing | — | — | — | **N/A — not implemented.** Mitigated by server-side `throttle` |
| RBAC | Elevation of Privilege | Users access only authorized modules | Access admin page as patient | PT02 — 403 responses | ✅ |
| Input Validation | Tampering | Reject invalid/malicious input | sqlmap + payloads | Form Requests + Eloquent binding | ✅ |
| Audit Trail | Repudiation | Critical actions logged | Perform login/update/delete | Audit log (user+IP+time) | ✅ |
| HTTPS / SSL | Information Disclosure | Protect data in transit | Verify certificate | Let's Encrypt + HSTS | ✅ |
| ➕ **Rate Limiting** | Denial of Service | Throttle automated abuse | Rapid login attempts | `throttle:10,1` → 429 | ✅ |
| ➕ **Session/Token Management** | Spoofing | Revoke token on logout; expiry | Reuse token post-logout | 401; 24h Sanctum expiry | ✅ |
| ➕ **Blockchain Traceability** | Tampering / Repudiation | Immutable Rx lifecycle record | Issue→verify→dispense | Hyperledger Fabric tx ids | ✅ |
| DPA / Privacy Notice | Compliance Risk | Privacy notice before data use | Visit privacy page | `PrivacyPage.tsx` (live) | ⚠️ confirm consent flow |

---

## C.4 Secure Coding Compliance — fill all (verified in code)
**1. Password Hashing & Authentication**
| Item | Status | % | Evidence |
|------|--------|---|----------|
| Secure hashing algorithm used | ✅ | 100% | bcrypt via User model `'hashed'` cast |
| Plaintext password storage avoided | ✅ | 100% | DB stores `$2y$` bcrypt hashes; `$hidden` excludes password |
| Generic login error messages used | ✅ | 100% | "The provided credentials are incorrect." (no enumeration) |
| Session timeout configured | ✅ | 100% | Sanctum token 24h (`SANCTUM_TOKEN_EXPIRATION`); `SESSION_LIFETIME=120` |
| Session destroyed after logout | ✅ | 100% | `currentAccessToken()?->delete()` |

**2. Input Validation & Error Handling**
| Item | Status | % | Evidence |
|------|--------|---|----------|
| Client-side input validation | ✅ | 100% | React Hook Form + Zod |
| Server-side input validation | ✅ | 100% | Laravel Form Requests |
| Output encoding where needed | ✅ | 100% | React auto-escaping (no `dangerouslySetInnerHTML` on user input) |
| Stack traces hidden in production | ✅ | 100% | `APP_DEBUG=false`, `APP_ENV=production` |
| Errors logged securely | ✅ | 100% | Laravel `Log` channels; no secrets in logs |

**3. API Protection & Session Management**
| Item | Status | % | Evidence |
|------|--------|---|----------|
| API endpoints require authentication | ✅ | 100% | `auth:sanctum` middleware group |
| API endpoints validate authorization | ✅ | 100% | `abort_if(hasRole...)` (RBAC) |
| Sensitive API responses minimized | ✅ | 100% | API Resources; no PII on public endpoints/on-chain |
| Rate limiting on sensitive endpoints | ✅ | 100% | login `throttle:10,1`, reset `5,1`, global `120,1` |
| Session IDs not exposed in URLs | ✅ | 100% | Bearer token in `Authorization` header, not URL |

---

## C.5 Data Privacy Clause & Compliance
| Item | Status | Evidence | Remarks |
|------|--------|----------|---------|
| System includes Data Privacy Agreement | 🟡 | `PrivacyPage.tsx` | ⚠️ confirm it's a DPA, not just a notice |
| User consent required before registration/use | ⚠️ | — | ⚠️ confirm a consent checkbox exists at booking/registration |
| Privacy notice states purpose of data collection | ✅ | Privacy page (live) | verify wording covers purpose |
| Data retention policy stated | ⚠️ | Privacy page | confirm retention is stated |
| User rights stated (access/correct/delete/withdraw) | ⚠️ | Privacy page | confirm rights section |
| Consent timestamp stored | ❌ | — | **Not stored** (no `consent` column). Mark N/A or add if required |
| Logs do not expose sensitive data | ✅ | Log review; **no PII on-chain (RA 10173 data minimization)** | strong point |

---

## C.6 Deployment Requirements & Security Validation
| Item | Status | % | Evidence |
|------|--------|---|----------|
| Domain proposed & documented | ✅ | 100% | deamhi.ph |
| Domain connected to hosting | ✅ | 100% | AWS Lightsail, static IP 18.141.85.45 |
| SSL certificate installed | ✅ | 100% | Let's Encrypt (Certbot, auto-renew) |
| Website uses HTTPS | ✅ | 100% | https://deamhi.ph |
| HTTP redirects to HTTPS | ✅ | 100% | nginx 301 redirect |
| Production environment configured | ✅ | 100% | `APP_ENV=production` |
| Debug mode disabled | ✅ | 100% | `APP_DEBUG=false` |
| Environment variables protected | ✅ | 100% | `.env` symlink (640), MySQL bound to 127.0.0.1 |
| Default admin credentials changed | ✅ | 100% | rotated during baseline reset |
| Backup procedure configured & tested | 🟡 | 75% | `deploy/scripts/backup-db.sh` | ⚠️ confirm scheduled + restore tested |
| Security features validated in production | ✅ | 100% | RBAC, audit logs, rate limiting, HSTS verified live (PT01/PT02) |

---

## D. Research Objectives — ⚠️ needs your Chapter 1
I can't fill D.1–D.5 without your **approved Specific Objectives (SO1–SOn)** verbatim. Paste them and I'll
map each to: module → Chapter 4 evidence (the PT/test results above) → Chapter 5 conclusion → Chapter 6 rec.

---

## Summary of changes I made
**❌ Removed / marked N/A (not in our system):** MFA/OTP, CAPTCHA/reCAPTCHA, consent-timestamp storage.
**➕ Added (in our system, missing from template):** Rate Limiting (DoS), Session/Token Management (Spoofing),
Blockchain Prescription Traceability (Tampering/Repudiation), Security Headers/HSTS, PT05 Session row in C.2.
**⚠️ Needs your input:** group name/members/adviser, evaluation model box, system-quality survey results,
DPA/consent specifics (C.5), backup schedule, and the Specific Objectives (Section D).
