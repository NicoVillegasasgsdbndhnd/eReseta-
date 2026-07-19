# eReseta+ — API Documentation

**System:** eReseta+ — Healthcare Appointment Booking and Patient Record Management System with
Digital Prescription using Hyperledger Fabric
**Institution:** Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI)
**API:** Laravel 13 REST API · **Auth:** Laravel Sanctum (Bearer tokens) · **Format:** JSON

---

## 1. Overview

| | |
|---|---|
| **Base URL (production)** | `https://deamhi.ph/api` |
| **Base URL (local)** | `http://localhost:8000/api` |
| **Authentication** | Bearer token (Laravel Sanctum) |
| **Request/Response** | `application/json` |
| **Total endpoints** | 100 |

### Authentication model
1. `POST /api/auth/login` returns a **token**.
2. Send it on every protected request:
   ```
   Authorization: Bearer <token>
   Accept: application/json
   ```
3. `POST /api/auth/logout` revokes the token.

### Standard response codes
| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `204` | Success, no content (e.g. delete) |
| `401` | Not authenticated (missing/invalid token) |
| `403` | Authenticated but not authorised for this role/resource |
| `422` | Validation failed (or an invalid state change) |
| `429` | Rate limit exceeded |

### Global protections
- **Rate limiting** — login `10/min`; public booking + OTP `5/min`; all authenticated routes `120/min`.
- **Role-based access control** — Spatie Permission; roles: `admin`, `doctor`, `pharmacist`, `staff`, `patient`.
- **Gates applied to all protected routes** — password change required, Terms acceptance required.
- **Security headers** and forced JSON responses via middleware.

---

## 2. Public endpoints (no authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/public/doctors` | Public doctor directory (no PII exposed) |
| `GET` | `/api/public/doctors/{doctor}/availability` | Free/booked slots and leave dates for a date |
| `POST` | `/api/public/appointment-requests/send-otp` | Email a 6-digit verification code *(5/min; 2-min cooldown per email)* |
| `POST` | `/api/public/appointment-requests` | Submit a guest booking request *(requires valid OTP; 5/min)* |
| `GET` | `/api/public/terms` | Current Terms & Privacy text |
| `GET` | `/api/public/activation/renew/{user}` | Signed link — patient requests a new activation link |
| `POST` | `/api/webhooks/paymongo` | Payment gateway webhook (signature-verified) |

**Example — submit a booking request**
```http
POST /api/public/appointment-requests
Content-Type: application/json

{
  "first_name": "Juan", "middle_initial": "D", "last_name": "Dela Cruz", "suffix": "Jr.",
  "dob": "1990-05-01", "sex": "male",
  "mobile": "09171234567", "email": "juan@example.com",
  "otp": "123456",
  "doctor_id": 1,
  "preferred_date": "2026-08-01T09:00:00",
  "reason": "Fever, Cough"
}
```
```json
201 {
  "reference_no": "REQ-2026-0007",
  "full_name": "Juan D Dela Cruz Jr.",
  "doctor": "Dr. Maria Santos",
  "preferred_schedule": "Saturday, August 1, 2026 at 9:00 AM",
  "message": "Your appointment request has been received."
}
```

---

## 3. Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | — | Sign in, returns Bearer token *(10/min)* |
| `POST` | `/api/auth/forgot-password` | — | Email a password-reset link *(5/min)* |
| `POST` | `/api/auth/reset-password` | — | Set a new password via token; `mode=activate` uses the 48-hour activation link |
| `POST` | `/api/auth/logout` | ✅ | Revoke the current token |
| `GET` | `/api/auth/me` | ✅ | Current user, roles, and gate flags |

**Example — login**
```http
POST /api/auth/login
{ "email": "doctor@deamhi.ph", "password": "••••••••" }
```
```json
200 { "token": "12|abcdef...", "user": { "id": 4, "name": "Dr. …", "role": "doctor", … } }
```

---

## 4. Protected endpoints

All require `Authorization: Bearer <token>`.

### 4.1 Terms & consent
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/me/terms` | Terms status for the current user |
| `POST` | `/api/me/terms/accept` | Accept the current Terms version |

### 4.2 Doctors & schedules
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/doctors` | List doctors |
| `GET` | `/api/doctors/{doctor}` | Doctor detail |
| `GET` | `/api/doctors/{doctor}/availability` | Availability for a date |
| `GET` | `/api/doctors/{doctor}/leaves` | List leave entries |
| `POST` | `/api/doctors/{doctor}/leaves` | File leave (whole-day, or per-hour with `start_time`/`end_time`) |
| `POST` | `/api/doctors/{doctor}/leaves/month` | Block the rest of a month |
| `DELETE` | `/api/doctors/{doctor}/leaves/{leave}` | Remove a leave entry |

### 4.3 Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patients` | List/search patients |
| `POST` | `/api/patients` | Register a patient *(admin/staff)* — sends a 48-hour activation link |
| `POST` | `/api/patients/{patient}/resend-activation` | Send a fresh activation link *(admin/staff)* |
| `GET` | `/api/patients/{patient}` | Patient detail (includes activation status) |
| `PUT` | `/api/patients/{patient}` | Update patient *(admin/staff)* |
| `DELETE` | `/api/patients/{patient}` | Delete patient *(admin only)* |

### 4.4 Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/appointments` | List appointments (scoped by role) |
| `POST` | `/api/appointments` | Create an appointment |
| `GET` | `/api/appointments/{appointment}` | Appointment detail |
| `PUT` | `/api/appointments/{appointment}/status` | Change status (scheduled → confirmed → served / cancelled) |
| `POST` | `/api/follow-ups` | Schedule a follow-up visit |

### 4.5 Appointment requests (guest bookings)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/appointment-requests` | Pending queue *(staff; scoped to assigned doctor)* |
| `POST` | `/api/appointment-requests/{id}/approve` | Approve → creates the appointment |
| `POST` | `/api/appointment-requests/{id}/decline` | Decline with a reason |

### 4.6 Patient records & chart
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient-records` | All records (filterable) |
| `GET` | `/api/patients/{patient}/records` | Records for one patient |
| `POST` | `/api/patient-records` | Create a consultation record |
| `GET` | `/api/patient-records/{record}` | Record detail |
| `PUT` | `/api/patient-records/{record}` | Update a record |
| `GET` | `/api/patients/{patient}/chart` | Full patient chart *(consent-gated)* |
| `GET` | `/api/me/chart` | Patient's own chart |
| `GET` | `/api/patients/{patient}/rx-safety` | Allergy/interaction safety check |
| `POST` | `/api/patient-records/{record}/break-glass` | Emergency override (logged) |

### 4.7 Privacy, consent & compliance (RA 10173)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patients/{patient}/consent` | Consent history |
| `POST` | `/api/patients/{patient}/consent` | Record consent |
| `POST` | `/api/patients/{patient}/break-glass` | Emergency access override |
| `GET` | `/api/break-glass-alerts` | Break-glass audit list |
| `GET` | `/api/compliance/consent-register` | DPO consent register |
| `GET` | `/api/compliance/terms-acceptance` | Terms acceptance register |
| `GET` | `/api/me/consent` | Patient's own consent status |
| `GET` | `/api/me/privacy-log` | Who accessed my record |
| `POST` | `/api/me/consent/withdraw` | Withdraw consent |

### 4.8 Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patients/{patient}/documents` | List uploaded documents |
| `POST` | `/api/patients/{patient}/documents` | Upload a document |
| `DELETE` | `/api/patient-documents/{document}` | Delete a document |

### 4.9 Medicines & diagnostics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/medicines` | Medicine list (generic names) |
| `GET` | `/api/medicines/{medicine}/brands` | Brands for a generic |
| `PUT` | `/api/medicines/{medicine}/availability` | Toggle stock *(pharmacist)* |
| `PUT` | `/api/medicine-brands/{brand}/availability` | Toggle brand stock *(pharmacist)* |
| `GET` | `/api/diagnostic-tests` | Test catalogue |
| `POST` | `/api/diagnostic-tests` | Add a test |
| `PUT` | `/api/diagnostic-tests/{test}/availability` | Toggle availability |
| `DELETE` | `/api/diagnostic-tests/{test}` | Remove a test |
| `GET` | `/api/diagnostic-orders` | Diagnostic orders |
| `POST` | `/api/diagnostic-orders` | Create an order |
| `GET` | `/api/diagnostic-orders/{order}` | Order detail |
| `PUT` | `/api/diagnostic-orders/{order}/status` | Update order status |

### 4.10 Prescriptions (blockchain-anchored)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/prescriptions` | List (scoped by role) |
| `POST` | `/api/prescriptions` | Issue a prescription *(doctor)* — queues the ledger write |
| `GET` | `/api/prescriptions/{prescription}` | Detail with lifecycle events + tx ids |
| `PUT` | `/api/prescriptions/{prescription}/verify` | Verify *(pharmacist)* |
| `PUT` | `/api/prescriptions/{prescription}/dispense` | Dispense *(pharmacist)* |

> **Lifecycle:** `issue → verify → dispense`. Each transition is enforced server-side (invalid
> transitions return `422`) and mirrored to Hyperledger Fabric asynchronously.

### 4.11 Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/billing-records` | List billing records |
| `POST` | `/api/billing-records` | Create a billing record |
| `POST` | `/api/billing-records/{record}/payment-link` | Generate a payment link |
| `POST` | `/api/billing-records/{record}/mark-paid` | Mark as paid |
| `GET` | `/api/patients/{patient}/billing-summary` | Patient billing summary |

### 4.12 Dashboard, blockchain & reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/summary` | KPI summary |
| `GET` | `/api/dashboard/appointment-stats` | Appointment statistics |
| `GET` | `/api/dashboard/prescription-activity` | Prescription activity |
| `GET` | `/api/dashboard/audit-logs` | Audit trail *(admin)* |
| `GET` | `/api/blockchain/activity` | Ledger transaction activity |
| `GET` | `/api/blockchain/status` | Fabric network/gateway status |
| `GET` | `/api/reports/appointments` | Appointment report *(admin)* |
| `GET` | `/api/reports/prescriptions` | Prescription report *(admin)* |

### 4.13 User administration
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List users *(admin)* |
| `POST` | `/api/users` | Create a user *(admin)* |
| `PUT` | `/api/users/{user}` | Update a user *(admin)* |
| `DELETE` | `/api/users/{user}` | Delete a user *(admin)* |
| `GET` | `/api/staff-requests` | Staff account requests |
| `POST` | `/api/staff-requests/{id}/approve` | Approve a staff request |
| `POST` | `/api/staff-requests/{id}/reject` | Reject a staff request |

### 4.14 Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/api/profile` | Update own profile / change password |
| `POST` | `/api/me/complete-profile` | Patient completes required details after activation |
| `POST` | `/api/profile/photo` | Upload profile photo |
| `DELETE` | `/api/profile/photo` | Remove profile photo |
| `POST` | `/api/profile/signature` | Upload e-signature *(doctor)* |
| `DELETE` | `/api/profile/signature` | Remove e-signature |

---

## 5. Environment Keys / Configuration

> ⚠️ **Never commit real values.** `.env` is git-ignored. Templates: `api/.env.example`,
> `api/.env.production.example`, `web/.env.production.example`.

### 5.1 Application
| Key | Purpose |
|-----|---------|
| `APP_NAME` | Application name |
| `APP_ENV` | `local` / `production` |
| `APP_KEY` | **Secret** — Laravel encryption key (`php artisan key:generate`) |
| `APP_DEBUG` | `false` in production |
| `APP_URL` | Base URL of the API |

### 5.2 Database
| Key | Purpose |
|-----|---------|
| `DB_CONNECTION` | `mysql` |
| `DB_HOST` / `DB_PORT` | Database host and port |
| `DB_DATABASE` | Schema name (`ereseta`) |
| `DB_USERNAME` | Least-privilege app user (not root) |
| `DB_PASSWORD` | **Secret** — rotated monthly by `accounts`/rotation script |

### 5.3 Mail (Brevo SMTP) — OTP, receipts, activation links
| Key | Purpose |
|-----|---------|
| `MAIL_MAILER` | `smtp` in production (`log` locally) |
| `MAIL_HOST` | `smtp-relay.brevo.com` |
| `MAIL_PORT` / `MAIL_SCHEME` | SMTP port / scheme |
| `MAIL_USERNAME` | **Secret** — Brevo login |
| `MAIL_PASSWORD` | **Secret** — Brevo SMTP key |
| `MAIL_FROM_ADDRESS` / `MAIL_FROM_NAME` | Sender identity |

### 5.4 Security / session
| Key | Purpose |
|-----|---------|
| `BCRYPT_ROUNDS` | Password hashing cost (default 12) |
| `SANCTUM_TOKEN_EXPIRATION` | API token lifetime (minutes) |
| `SESSION_DRIVER` / `SESSION_LIFETIME` | Session configuration |

### 5.5 Queue & cache (required for OTP + blockchain jobs)
| Key | Purpose |
|-----|---------|
| `QUEUE_CONNECTION` | `database` — required for ledger anchoring jobs |
| `CACHE_STORE` | Cache driver — stores hashed booking OTPs |

### 5.6 Blockchain (Hyperledger Fabric)
| Key | Purpose |
|-----|---------|
| `BLOCKCHAIN_ENABLED` | Enable ledger anchoring |
| `FABRIC_GATEWAY_URL` | Node gateway URL (default `http://localhost:3001`) |
| `FABRIC_GATEWAY_TIMEOUT` | Request timeout (seconds) |
| `FABRIC_GATEWAY_TOKEN` | **Secret** — gateway auth token |

### 5.7 Frontend (Vite)
| Key | Purpose |
|-----|---------|
| `VITE_API_URL` | API base URL used by the React SPA |
| `VITE_APP_NAME` | Application name shown in the UI |

### 5.8 Optional
| Key | Purpose |
|-----|---------|
| `ADMIN_EMAIL` / `ADMIN_NAME` | Super-admin identity for the provisioning seeder |
| `ADMIN_PASSWORD` | **Secret** — initial admin password (random if unset) |
| `AWS_*` | S3 storage (if enabled) |
| `REDIS_*` | Redis (if used instead of database cache/queue) |

---

## 6. Error response format

```json
422 {
  "message": "First name may only contain letters, spaces, hyphens, apostrophes, and periods.",
  "errors": {
    "first_name": ["First name may only contain letters, spaces, hyphens, apostrophes, and periods."],
    "mobile": ["Enter a valid Philippine mobile number, e.g. 09171234567."]
  }
}
```

All validation is enforced **server-side**; client-side checks are convenience only.
