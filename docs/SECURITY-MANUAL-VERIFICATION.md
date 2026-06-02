# eReseta+ — Manual Security Verification Guide

A step-by-step procedure to **manually verify** each security control in the eReseta+ API. It is
the verification counterpart to [`api/SECURITY.md`](../api/SECURITY.md) (which *describes* the
controls); this document *proves* they work. Use it before UAT, before a release, and as evidence
for the ISO 27001 / 27701 / RA 10173 mapping in the development plan §10.2.

> Each check lists **What**, **How**, **Expected**, and a **Pass/Fail** box. Record the date and
> tester in the sign-off table at the end. A "Findings from the latest run" section is at the bottom.

---

## 0. Prerequisites

| Need | Command / note |
|------|----------------|
| API running | In `api/`: `php artisan serve` → `http://127.0.0.1:8000` |
| Database up + migrated/seeded | MySQL on `127.0.0.1:3306`; `php artisan migrate --seed` |
| Seeded admin login | `admin@deamhi.ph` / `Admin@2026!` |
| A REST tool | `curl` (examples below), Postman, or VS Code REST Client |

> [!IMPORTANT]
> **Send `Accept: application/json`** for correct content negotiation. As of the F-1 fix, the
> `ForceJsonResponse` middleware sets this for every `/api/*` request server-side, so errors render
> as JSON (`401`/`404`/`422`) even if a client forgets the header — but sending it explicitly is
> still good practice. The real SPA (axios) always does. See Finding F-1 (resolved).

**Windows note (PowerShell 5.1):** `curl` is an alias for `Invoke-WebRequest` and won't accept the
flags below — use **`curl.exe`** explicitly, or the `Invoke-RestMethod`/helper snippets shown inline.
`-SkipHttpErrorCheck` is **PowerShell 7 only**; the 5.1-safe pattern is the `Get-Status` helper in §3.

**Get a token first and reuse it:**
```bash
curl.exe -s -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Accept: application/json" -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@deamhi.ph\",\"password\":\"Admin@2026!\"}"
# → {"token":"1|abc...","user":{...}}     set TOKEN to that value
```
PowerShell:
```powershell
$r = Invoke-RestMethod -Uri http://127.0.0.1:8000/api/auth/login -Method Post `
  -Headers @{Accept='application/json'} -ContentType application/json `
  -Body '{"email":"admin@deamhi.ph","password":"Admin@2026!"}'
$TOKEN = $r.token
```

---

## 1. Authentication (Sanctum tokens + 24h expiry)
*Maps to: SECURITY.md §1 · ISO 27001 access control*

**What:** Protected endpoints require a valid bearer token; tokens expire after 24h.

**How:**
1. Call a protected route **without** a token (note the Accept header — see F-1):
   ```bash
   curl.exe -s -o NUL -w "%{http_code}\n" http://127.0.0.1:8000/api/auth/me -H "Accept: application/json"
   ```
2. Call it **with** a valid token:
   ```bash
   curl.exe -s -w "\n%{http_code}\n" http://127.0.0.1:8000/api/auth/me \
     -H "Accept: application/json" -H "Authorization: Bearer $TOKEN"
   ```
3. Confirm the expiry policy. `laravel/tinker` is removed in this project, so verify via config/env:
   `config/sanctum.php` `expiration` reads `SANCTUM_TOKEN_EXPIRATION` (`api/.env`, default **1440**
   = 24h). To prove expiry empirically, set a token's `created_at` in `personal_access_tokens` to
   >24h ago and re-call `/api/auth/me`.

**Expected:** Step 1 → **401** (JSON `{"message":"Unauthenticated."}`). Step 2 → **200** with user
JSON. Expiry = **1440** minutes.

**Result:** ☐ Pass ☐ Fail — notes: ____________________

---

## 2. Authorization / RBAC (role + ownership guards)
*Maps to: SECURITY.md §2 · automated by `tests/Feature/RoleBoundaryTest.php`*

**What:** Each role only reaches what it's allowed to; patients can't read other patients' data.

**How (automated — fastest, authoritative):**
```bash
# in api/
php artisan test --filter=RoleBoundaryTest
php artisan test --filter=PrescriptionTest   # includes cross-patient ownership check
```

**How (manual spot-check):** log in as a non-admin and hit an admin-only route:
```bash
curl.exe -s -o NUL -w "%{http_code}\n" http://127.0.0.1:8000/api/users \
  -H "Accept: application/json" -H "Authorization: Bearer $PATIENT_TOKEN"
```

**Expected:** RoleBoundaryTest **all green**; the manual call returns **403**.

**Result:** ☐ Pass ☐ Fail — notes: ____________________

---

## 3. Rate limiting (login / register throttle)
*Maps to: SECURITY.md §3 — `throttle:10,1` in `routes/api.php`*

**What:** `/api/auth/login` and `/api/auth/register` allow **10 requests/min per IP**, then 429.

**How (PowerShell 5.1-safe):**
```powershell
function Get-Status($uri,$body) {
  try { return (Invoke-WebRequest -Uri $uri -Method Post -Headers @{Accept='application/json'} `
        -ContentType 'application/json' -Body $body -UseBasicParsing).StatusCode }
  catch { return $_.Exception.Response.StatusCode.value__ }
}
1..12 | % { Get-Status 'http://127.0.0.1:8000/api/auth/login' '{"email":"x@x.com","password":"bad"}' }
```
`curl.exe` (cmd) equivalent:
```bat
for /L %i in (1,1,12) do @curl.exe -s -o NUL -w "%{http_code} " -X POST http://127.0.0.1:8000/api/auth/login -H "Accept: application/json" -H "Content-Type: application/json" -d "{\"email\":\"x@x.com\",\"password\":\"bad\"}"
```

**Expected:** ~10 `401`s, then **429 Too Many Requests** (observed: `401×9` then `429`). Wait 60s to reset.

**Result:** ☐ Pass ☐ Fail — notes: ____________________

---

## 4. Input validation (FormRequests → 422)
*Maps to: SECURITY.md §4*

**What:** Invalid/missing fields are rejected with **422** and per-field error messages.

**How:**
```bash
curl.exe -s -w "\n%{http_code}\n" -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Accept: application/json" -H "Content-Type: application/json" -d "{}"
```

**Expected:** **422** with a JSON `errors` object naming `name`, `email`, `password`, `role`.

**Result:** ☐ Pass ☐ Fail — notes: ____________________

---

## 5. Password policy (strength enforced)
*Maps to: SECURITY.md §5 — `Password::min(8)->mixedCase()->numbers()->symbols()`*

**What:** Weak passwords are rejected on **registration** *and* **patient creation**.

**How:**
```bash
curl.exe -s -w "\n%{http_code}\n" -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Accept: application/json" -H "Content-Type: application/json" \
  -d "{\"name\":\"T\",\"email\":\"weak@test.com\",\"password\":\"password\",\"password_confirmation\":\"password\",\"role\":\"patient\"}"
```

**Expected:** **422**, `password` error requiring mixed case, numbers, and symbols.
> This policy now also applies to `POST /api/patients` (`StorePatientRequest`). The old Phase-5
> follow-up about it being `min(8)`-only has been fixed (verified in code — see F-2).

**Result:** ☐ Pass ☐ Fail — notes: ____________________

---

## 6. Audit logging (CREATE/UPDATE/DELETE recorded)
*Maps to: SECURITY.md §6 — `AuditObserver` → `audit_logs` for Appointment, Patient, PatientRecord, Prescription, User*

**What:** Every mutation of an audited model writes an `audit_logs` row with actor, IP, timestamp.

**How:**
1. As admin, create or update a record (e.g. `POST /api/patients`).
2. Inspect the table (any MySQL client). **Columns are `action`, `target_type`, `target_id`:**
   ```sql
   SELECT id, user_id, action, target_type, target_id, ip_address, created_at
   FROM audit_logs ORDER BY id DESC LIMIT 5;
   ```
   Or via the API: `GET /api/dashboard/audit-logs` (admin token + `Accept: application/json`).

**Expected:** a fresh row with the action (`created`/`updated`/`deleted`), your `user_id`, the
`target_type` (e.g. `App\Models\Patient`), and your `ip_address`.

**Result:** ☐ Pass ☐ Fail — notes: ____________________

---

## 7. Encryption at rest + PhilHealth blind index (PII)
*Maps to: SECURITY.md §7 · ISO 27701 · RA 10173 — the most important privacy control*

**What:** Patient `address`, `contact`, `philhealth_no` are stored **encrypted** (unreadable in the
DB, now `TEXT` columns); `philhealth_no` uniqueness is enforced via the HMAC **blind index**
`philhealth_no_hash` (`CHAR(64)`, unique).

**How:**
1. Create a patient with PII (as admin/doctor), e.g. `philhealth_no` = `12-345678901-2`.
2. Read the raw columns directly from the DB — **not** through the API:
   ```sql
   SELECT address, contact, philhealth_no, philhealth_no_hash
   FROM patients ORDER BY id DESC LIMIT 1;
   ```
3. Confirm the API still returns the **plaintext** (decrypted on read) for an authorized user:
   `GET /api/patients/{id}`.
4. **Blind-index uniqueness:** try creating a second patient with the *same* `philhealth_no`.

**Expected:**
- `address`/`contact`/`philhealth_no` hold **base64 ciphertext** (start with `eyJpdiI6...`), not readable text.
- `philhealth_no_hash` is a **64-char hex** string (HMAC-SHA256), never the raw number.
- The authorized API read shows the correct **plaintext**.
- The duplicate-PhilHealth create is rejected with **422** ("PhilHealth number has already been taken").

**Result:** ☐ Pass ☐ Fail — notes: ____________________

---

## 8. Error handling (JSON 401 / 404)
*Maps to: SECURITY.md §8*

**What:** Auth failures and missing records return clean JSON, not HTML stack traces.

**How (with the Accept header):**
```bash
curl.exe -s -w "\n%{http_code}\n" http://127.0.0.1:8000/api/patients/999999 \
  -H "Accept: application/json" -H "Authorization: Bearer $TOKEN"          # 404
curl.exe -s -w "\n%{http_code}\n" http://127.0.0.1:8000/api/auth/me \
  -H "Accept: application/json" -H "Authorization: Bearer not-a-real-token" # 401
```

**Expected:** **404** and **401** respectively, each a JSON `{"message": ...}` body.

> [!NOTE]
> **Finding F-1 — RESOLVED.** Previously, these requests **without** `Accept: application/json`
> returned **500 + an HTML stack trace** (Laravel redirecting to a non-existent `login` route —
> information disclosure under `APP_DEBUG=true`). Fixed by the `ForceJsonResponse` middleware
> (`app/Http/Middleware/ForceJsonResponse.php`, prepended to the `api` group in `bootstrap/app.php`),
> which makes every `/api/*` request render JSON errors regardless of the client's headers. Verify by
> repeating the calls above **without** an `Accept` header — you should now get `401`/`404`/`422` JSON.
> (Still set `APP_DEBUG=false` in production as defence in depth.)

**Result:** ☐ Pass ☐ Fail — notes: ____________________

---

## 9. Accepted-risk check — Bearer token storage
*Maps to: SECURITY.md "Accepted risks" — Bearer token in `localStorage`*

**What:** A *documented, accepted* MVP risk, not a bug. Verify the mitigation (24h expiry) and the
documented future path (httpOnly-cookie migration).

**How:** in the running SPA (http://localhost:5173), log in, open DevTools → Application →
Local Storage. Confirm a token is present and that logout / a 401 clears it and redirects to
`/login` (`web/src/lib/api.ts` interceptor).

**Expected:** token present while logged in; cleared on logout/401. **This check documents the
accepted risk — it does not fail the review.**

**Result:** ☐ Noted (accepted risk)

---

## Automated coverage (run once, covers several controls)
```bash
# in api/
php artisan test
```
Relevant suites: `AuthTest` (§1), `RoleBoundaryTest` + `PrescriptionTest` (§2),
`PatientEncryptionTest` (§7), `WebhookTest` (PayMongo signature verification). Expect **all green**
(46 tests at time of writing).

> **Not yet covered (deferred to Phase 6, per SECURITY.md "Open items"):** OWASP ZAP scan against
> staging, HTTPS/TLS enforcement, and the httpOnly-cookie auth migration.

---

## Findings from the latest run (2026-06-02)

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| **F-1** | Medium | Unauthed/invalid-token API calls **without** `Accept: application/json` returned **500 + HTML** (stack trace under `APP_DEBUG=true`, info disclosure). | ✅ **Fixed** — `ForceJsonResponse` middleware forces JSON for `/api/*` (see §8). Keep `APP_DEBUG=false` in prod. |
| **F-2** | Info | `api/SECURITY.md` "Follow-ups" listed two items (`it_admin` role, weak `StorePatientRequest` password) already fixed in code. | ✅ **Fixed** — that section trimmed to "Resolved follow-ups". |

**Verified PASS in this run** (`Accept: application/json` sent): §1 auth (401 no-token / 200 with
token), §3 throttle (`401×9` then `429`), §4 validation (`422`), §7 schema (encrypted `TEXT` cols +
`philhealth_no_hash CHAR(64)`), §8 (`404` missing record, `401` bad token). Full suite: **46 passing.**

---

## Sign-off

| Control | §  | Result | Tester | Date |
|---------|----|--------|--------|------|
| Authentication / token expiry | 1 | ☐ | | |
| Authorization (RBAC) | 2 | ☐ | | |
| Rate limiting | 3 | ☐ | | |
| Input validation | 4 | ☐ | | |
| Password policy | 5 | ☐ | | |
| Audit logging | 6 | ☐ | | |
| Encryption at rest + blind index | 7 | ☐ | | |
| Error handling | 8 | ☐ | | |
| Bearer-token accepted risk | 9 | ☐ noted | | |
