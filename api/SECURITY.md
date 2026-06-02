# eReseta+ — Security Controls & Compliance

This document records the security controls implemented in the eReseta+ API and maps them to
the standards in the development plan §10.2 — **ISO/IEC 27001**, **ISO/IEC 27701**, and the
**Philippine Data Privacy Act (RA 10173)**. It is the documented-procedures artifact those
standards require.

## Compliance mapping

| Standard | Control in this system |
|----------|------------------------|
| ISO/IEC 27001 (access control, logging) | Role-based access control, audit logging, rate limiting, token expiry |
| ISO/IEC 27701 (privacy by design) | Patient PII encrypted at rest; minimum data exposure via API Resources |
| RA 10173 (Data Privacy Act) | Encryption of sensitive personal information (PhilHealth no., address, contact); audit trail of all data mutations |
| FDA Circular 2020-037 | Digital prescription fields + lifecycle (handled in prescription module) |

## Implemented controls

### 1. Authentication
- **Laravel Sanctum** personal access tokens (`AuthService::login` → `createToken('api')`).
- **Token expiry: 24h** — `config/sanctum.php` `expiration` (override via `SANCTUM_TOKEN_EXPIRATION`,
  in minutes). Sanctum rejects expired tokens automatically.
- The SPA logs out and redirects to `/login` on any `401` (`web/src/lib/api.ts` response interceptor).

### 2. Authorization (RBAC)
- **Spatie Laravel Permission** with role middleware aliased in `bootstrap/app.php`.
- Per-controller role + ownership guards (admin / doctor / pharmacist / patient / staff).
- Covered by `tests/Feature/RoleBoundaryTest.php`.

### 3. Rate limiting
- `login` and `register` throttled to **10 requests/min per IP** (`routes/api.php`).

### 4. Input validation
- FormRequests on all writes; invalid input returns **422** with field errors
  (`bootstrap/app.php` `ValidationException` handler).

### 5. Password policy
- Registration requires **min 8 chars + mixed case + numbers + symbols**
  (`RegisterRequest`, `Password::min(8)->mixedCase()->numbers()->symbols()`).

### 6. Audit logging
- `AuditObserver` logs **CREATE / UPDATE / DELETE** with actor id, IP, and timestamp to
  `audit_logs`, for: Appointment, Patient, PatientRecord, Prescription, User.

### 7. Encryption at rest (PII)
- Patient `address`, `contact`, and `philhealth_no` use Laravel's **`encrypted`** cast
  (AES-256-CBC via `APP_KEY`); stored as ciphertext in TEXT columns.
- Because the encrypted value uses a random IV, uniqueness of `philhealth_no` is enforced with a
  **blind index**: `philhealth_no_hash` (HMAC-SHA256, unique index), maintained on every save
  (`Patient::booted` / `Patient::hashPhilhealth`). Validation checks uniqueness against the hash.

### 8. Error handling
- JSON exception handlers for **401** (`AuthenticationException`) and **404**
  (`ModelNotFoundException`) — `bootstrap/app.php`.

## Accepted risks / decisions

- **Bearer token in `localStorage` (not httpOnly cookie).** The plan §10.1 references httpOnly
  cookies. We deliberately kept Bearer tokens for MVP simplicity (the SPA + axios flow is built
  around them). Residual risk: a successful XSS could read the token. Mitigations in place: 24h
  token expiry, strict input validation, and React's default output escaping.
  **Future path:** migrate to Sanctum SPA cookie auth (`EnsureFrontendRequestsAreStateful`,
  `/sanctum/csrf-cookie`, axios `withCredentials`) to remove token-in-JS exposure.

## Open items (deferred)

- **OWASP ZAP scan** — to run against staging before UAT (plan §10.3, line 548 — Phase 6).
- **HTTPS/TLS enforcement** — production deployment concern (Phase 6).
- **httpOnly-cookie auth migration** — see accepted risk above.

## Resolved follow-ups

- ✅ `RegisterRequest` role rule updated from `it_admin` to the canonical role set
  (`in:patient,doctor,pharmacist,admin,staff`).
- ✅ `StorePatientRequest` password rule aligned to the full policy
  (`Password::min(8)->mixedCase()->numbers()->symbols()`), matching `RegisterRequest`.
- ✅ API error responses are forced to JSON for `/api/*` (`ForceJsonResponse` middleware) — an
  unauthenticated request without an `Accept` header now returns `401` JSON instead of a `500`/HTML
  redirect to the (undefined) `login` route. See `docs/SECURITY-MANUAL-VERIFICATION.md` (F-1).
