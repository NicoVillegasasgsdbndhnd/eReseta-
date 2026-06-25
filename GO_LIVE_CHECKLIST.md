# eReseta+ — Go-Live & Pen-Test Readiness Checklist

A practical pre-deployment checklist. The **🔒 security gates** are the ones a penetration
test will flag if missed — get those right before exposing the system publicly.

> Deploying while you keep polishing is fine (it's a living deployment, not a freeze) — but the
> 🔒 items below must be settled *before* the site is reachable from the internet / pen-tested.

---

## 1. Backend env (`api/.env`) — copy from `.env.production.example`
- [ ] 🔒 `APP_DEBUG=false` — with `true`, error responses leak stack traces + env values
- [ ] 🔒 `APP_ENV=production`
- [ ] 🔒 `APP_KEY` generated on the server (`php artisan key:generate`) — **never reuse the dev key**
- [ ] 🔒 `APP_URL` and `FRONTEND_URL` set to the real **https://** domain (CORS reads `FRONTEND_URL`)
- [ ] 🔒 `DB_USERNAME` is a dedicated least-privilege user (not `root`) with a strong `DB_PASSWORD`
- [ ] 🔒 `SESSION_SECURE_COOKIE=true`, `SESSION_ENCRYPT=true`, `SESSION_DOMAIN` = real domain
- [ ] 🔒 `PAYMONGO_WEBHOOK_SECRET` set (so `/webhooks/paymongo` rejects forged callbacks)
- [ ] `MAIL_MAILER=smtp` with real credentials (guest-booking + account emails actually send)
- [ ] `LOG_LEVEL=warning`

## 2. Build & migrate
- [ ] Use the checked-in Lightsail deployment bundle in `deploy/`.
- [ ] Read `deploy/AWS_LIGHTSAIL.md` before creating the paid AWS instance.
- [ ] `cd api && composer install --no-dev --optimize-autoloader`
- [ ] `php artisan migrate --force` (includes the patient-PII + gov-id/allergies encryption migrations)
- [ ] `php artisan storage:link` (public-disk uploads: photos, signatures, documents)
- [ ] `php artisan config:cache && php artisan route:cache`
- [ ] `cd web && npm install && npm run build` (⚠️ `npm install` is required — PWA plugin `vite-plugin-pwa`)
- [ ] Serve the built `web/dist` (static) + the Laravel API behind the same domain

## 3. 🔒 Transport & web server
- [ ] HTTPS/TLS terminated (Let's Encrypt or the host's cert) — pen-test flags plain HTTP
- [ ] HTTP → HTTPS redirect enabled (HSTS header is already emitted by `SecurityHeaders` over HTTPS)
- [ ] Reverse proxy forwards the real client IP (`X-Forwarded-For`) so throttling/audit IPs are correct
- [ ] `web/dist` served with cache headers; `index.html` not cached (SPA routing)

## 4. 🔒 Final app-config gates
- [ ] **Flip `ALLOW_ANY_DAY_CONSULTATION` → `false`** in
      `web/src/features/consultations/ConsultationsPage.tsx` (the testing toggle) — then rebuild
- [ ] Seed only what's needed; **do not** ship demo/seeded admin passwords — rotate them
- [ ] Confirm registration is staff/guest-driven (public self-register was removed) — no open signup
- [ ] Verify the admin account uses a strong password (no default)

## 5. Blockchain (if demoing live anchoring)
- [ ] Fabric network + gateway running; `BLOCKCHAIN_ENABLED=true`, `FABRIC_GATEWAY_URL` reachable
- [ ] `php artisan queue:work` running (anchors `prescriptions.blockchain_tx_id`)
- [ ] See `HYPERLEDGER_DOCUMENTATION.md` for the network bring-up

## 6. Post-deploy smoke test
- [ ] `GET /api/health` returns ok
- [ ] `bash deploy/scripts/smoke-test.sh https://your-domain.com` passes
- [ ] Public site loads; guest can submit an appointment request (rate-limited)
- [ ] Login works for each role; a patient sees only their own records
- [ ] Error responses are JSON with **no stack trace** (confirms `APP_DEBUG=false`)
- [ ] Security headers present (`curl -I` → CSP, X-Frame-Options, HSTS, nosniff)

---

## Already handled in code (good to cite for the defense / pen-test write-up)
- Sensitive PII encrypted at rest (RA 10173): `address`, `contact`, `philhealth_no`, `gov_id_no`,
  `known_allergies` — with a blind index keeping `philhealth_no` unique.
- Role-based access control with regression tests; restricted records (mental-health/VIP/etc.)
  gated + break-glass audited; "auditing on read" for chart access.
- Security headers middleware (CSP, HSTS, X-Frame DENY, nosniff, Referrer-Policy, Permissions-Policy).
- CORS locked to a configured origin; rate limiting on login (10/min), public booking (5/min),
  and all authenticated endpoints (120/min). Webhook signature verification with replay protection.
- Input validated via FormRequests; no raw SQL with user input; no mass-assignment of privileged fields.

## Known follow-ups (non-blocking, document as future work)
- `must_change_password` is enforced client-side only — server-side enforcement is a hardening item.
- Guest appointment-request PII (email/mobile in `appointment_requests`) is stored in plaintext
  (transient queue data) — could be encrypted for full consistency.
