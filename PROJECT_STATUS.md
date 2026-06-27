# Project Status

This file is the quick catch-up note for Mark, Nico, Codex, Claude, or any other teammate/AI joining the project. Chat history does not sync across machines, so use this committed file plus `AGENTS.md`, `CLAUDE.md`, and Git history as the shared source of truth.

## Current Source Of Truth

- Repository: `https://github.com/NicoVillegasasgsdbndhnd/eReseta-.git`
- Branch to use: `main`
- Latest pushed commit from this machine: see `git log -1 --oneline` after pulling `main`
- Previous merge commit: `70bbc6a Merge Mark updates and refine role interfaces`

The latest `main` contains the reconciled Mark-side work, Nico/local UI and workflow work, and the later mobile/PWA responsive updates.

## Deployment Status (live at https://deamhi.ph)

The system is **deployed and serving over HTTPS** on AWS Lightsail (Ubuntu 24.04, Singapore,
static IP `18.141.85.45`). Most of this is **server/`.env`/DB state that is NOT in git** — it
lives only on the server, so this note is the only record of it.

- **HTTPS:** Let's Encrypt cert via Certbot (`--nginx`), **auto-renew** enabled. HTTP→HTTPS 301
  redirect active. nginx `server_name deamhi.ph www.deamhi.ph`. Domain `deamhi.ph` registered at
  dotPH (expires **2026-09-27** — renew before then or HTTPS/site lapse).
- **Security headers:** added on the server via `/etc/nginx/snippets/ereseta-security.conf`
  (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, **HSTS**), included in the
  `index.html` location. `APP_ENV=production`, `APP_DEBUG=false`. MySQL bound to `127.0.0.1` only.
- **Email/SMTP:** configured in `api/.env` (Gmail SMTP + App Password; `MAIL_MAILER=smtp`,
  `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=465`, `MAIL_SCHEME=smtps`). Provisioning, password-reset,
  and guest-appointment emails **send for real**. "From" shows the Gmail (no Workspace).
- **`api/.env` (prod):** `APP_URL`/`FRONTEND_URL=https://deamhi.ph`,
  `SANCTUM_STATEFUL_DOMAINS=deamhi.ph,www.deamhi.ph`, `SESSION_SECURE_COOKIE=true`.
- **Frontend:** built with `VITE_API_URL=/api` (same-origin). **`vite.config.ts` `navigateFallback`
  changed to `/index.html`** (was `/offline.html`, which showed the "You are offline" page on every
  deep-route reload). This fix is in this commit.
- **Accounts/DB:** only `admin@deamhi.ph` exists; demo role accounts were removed. All real
  doctors/staff/pharmacists are created via the **admin UI** (leave password blank → temp password
  emailed + forced change). DB data is per-machine and not in git.

### ⚠️ Redeploy rule
A redeploy from `main` **must rebuild `web`** (`cd web && npm ci && npm run build`) or the SPA will
ship a stale `/api` base + old service worker. Do **not** re-run demo seeders in prod (they create
`password` logins). After `.env` changes run `php artisan config:cache`.

## How A Teammate Should Catch Up

```bash
git clone https://github.com/NicoVillegasasgsdbndhnd/eReseta-.git
cd eReseta-
git checkout main
git pull origin main
```

If the repo is already cloned:

```bash
git fetch origin
git checkout main
git pull origin main
```

After pulling:

```bash
cd web
npm install
npx tsc -b --noEmit
npm run build
```

```bash
cd api
composer install
php artisan migrate
php artisan test
```

On Nico's Windows machine, the default `php` may be PHP 8.2 and the Laravel app requires PHP 8.4. Use a PHP 8.4 binary for backend tests if the default one fails.

## Merge Policy Used

- Keep Nico/local UI and workflow where it represents the latest approved behavior.
- Keep Mark-side backend, clinical safety, prescription, patient-record, and access-control logic where it is more deploy-ready.
- Preserve unique features from both sides unless they duplicate behavior, weaken security, or confuse role boundaries.

## Patient Interface

- Patient appointment flow and appointment detail pages were redesigned for cleaner spacing and a unified visit-pass style.
- Appointment detail layouts now avoid unbalanced columns and oversized empty panels.
- Patient `My Records` is the clinical history/visit portal.
- Patient profile is separate and focused on demographics/account-style information.
- Patient appointment booking doctor selection was made more compact and mobile-friendly.
- Patient mobile experience is the highest priority for the PWA shortcut phase.
- Patient bottom navigation is enabled on mobile.

## Doctor Interface

- Doctor dashboard UI was enhanced.
- Doctor appointments tab was redesigned into a proper appointment workspace with calendar/list context.
- Calendar cells now show date numbers and appointment indicators.
- Passed reservations can show a more accurate delayed/no-show style instead of always appearing as fresh reserved appointments.
- Doctor appointment detail/open appointment view was redesigned to match the cleaner patient visit-detail style.
- Doctor patient records, patient record viewing, consultations, new consultation record, and prescriptions pages were polished.
- Doctor dashboard patient-record shortcuts point to the active `/records` workspace.
- Doctor-only SPA route guards now match the clinical workflow for consultations and new prescriptions.
- Doctor can use responsive/adaptive layouts:
  - phone: single-column queue/actions/detail cards
  - tablet: split layouts where useful
  - desktop: richer multi-column layouts
- Doctor should not register guest patients; staff owns registration.
- Request tab is not shown for doctor users.

## Staff Interface

- Staff dashboard UI was enhanced.
- Staff appointment and request tabs were redesigned.
- Guest appointment requests remain staff-owned.
- Request count/notification behavior is part of staff navigation/dashboard surfaces.
- Staff appointment detail has role-appropriate actions.
- `Register Patient` stays staff-owned and is disabled until the appointment date/time arrives.
- Guest appointment countdown uses days/hours/minutes depending on how close the visit is.
- Duplicate availability entry points were reduced.
- Staff add-new-patient record form was redesigned.
- Staff navigation no longer exposes the doctor consultation workspace.
- Staff is excluded from the current mobile shortcut/PWA responsive phase.

## Pharmacist Interface

- Mark-side prescription functionality should remain preserved:
  - issued date
  - item count
  - Hospital Rx behavior
  - safety warnings
  - live dosing sync
  - dosage/quantity-unit behavior
  - signature image rendering
- Nico/local visual direction can be used where it improves readability, but functional prescription details should not be removed.

## Public Homepage And Auth

- Homepage/public landing UI was improved and made more mobile-safe.
- Mobile overflow/zoomed-out layout issues were addressed.
- Public doctor listing depends on the API being reachable from the device.
- Login UI was redesigned, and the extra secure sign-in label was removed.
- Logout returns users to the homepage.
- Public pages such as About, FAQ, Privacy, and Services are kept.

## PWA / Mobile Shortcut

This is an online-first PWA/mobile shortcut, not a native mobile app and not a fully offline clinical app.

Implemented:

- `vite-plugin-pwa` configured in the Vite frontend.
- Web app manifest with eReseta+ name, theme color, standalone display, and icons.
- Apple/iOS home-screen metadata.
- PWA icons and offline fallback page in `web/public/`.
- Static app shell/assets can be cached.
- Sensitive API responses such as patient records, prescriptions, appointments, and auth data are not intentionally cached for offline use.
- Patient and doctor have mobile bottom navigation.
- Homepage, patient, and doctor interfaces have responsive/mobile work.
- Staff mobile redesign is intentionally out of scope for this phase.
- Pre-deployment hardening set `ALLOW_ANY_DAY_CONSULTATION=false`, so doctors can start consultation records only from today's consultable appointments.

## Deployment

The current deployment target is an AWS Lightsail Ubuntu instance using the checked-in
deployment bundle under `deploy/`.

Included deployment assets:

- `deploy/README.md` - the Lightsail deployment runbook.
- `deploy/nginx/ereseta.conf` - same-domain Nginx config: React SPA at `/`, Laravel API at `/api/*`, public uploads at `/storage/*`.
- `deploy/scripts/bootstrap-ubuntu.sh` - one-time Ubuntu package/bootstrap script.
- `deploy/scripts/deploy.sh` - repeatable release script for pulling `main`, installing dependencies, building the SPA, running migrations, caching Laravel config/routes/views, and restarting services.
- `deploy/systemd/ereseta-queue.service` - Laravel queue worker.
- `deploy/systemd/ereseta-scheduler.service` and `deploy/systemd/ereseta-scheduler.timer` - Laravel scheduler.
- `deploy/systemd/ereseta-fabric-gateway.service` - optional Hyperledger gateway service for live ledger anchoring.
- `web/.env.production.example` - Vite production build env, defaulting to same-origin `/api`.

Included AWS/Fabric deployment assets:

- `deploy/blockchain/AWS_FABRIC.md` - AWS Lightsail Fabric runbook.
- `deploy/scripts/bootstrap-fabric-ubuntu.sh` - Docker/Go/Fabric bootstrap helper.
- `deploy/scripts/fabric-smoke-test.sh` - gateway + ledger smoke test.
- `deploy/systemd/ereseta-fabric-network.service` - starts/stops the existing Fabric peer/orderer network without wiping the ledger.
- Fabric gateway now binds to localhost by default and can require `FABRIC_GATEWAY_TOKEN`.

Deployment notes:

- The deployment bundle intentionally does not use the root `docker-compose.yml`; that file remains a local/aspirational stack and is not the production path.
- API route closures were removed so `php artisan route:cache` can run during deploy.
- Keep `VITE_API_URL=/api` for the recommended same-domain Nginx setup.
- `api/.env.production.example` defaults `BLOCKCHAIN_ENABLED=false` for the first AWS deployment; enable Fabric only after the Fabric smoke test passes.
- Pre-deployment dependency hardening removed unused `maatwebsite/excel`/PHPSpreadsheet and updated Laravel/Symfony/Guzzle packages so `composer audit` reports no advisories.

Testing on a phone requires:

- Frontend preview/dev server exposed with `--host 0.0.0.0`.
- Laravel API server exposed with `php artisan serve --host=0.0.0.0 --port=8000`.
- Phone and laptop on the same network.
- Use the laptop LAN IP, not `localhost`, from the phone.

## API / Network Notes

- Frontend API helper can translate a LAN-opened frontend URL to the same LAN host on API port `8000`.
- CORS allows local Vite preview/dev origins on private-network IPs for phone testing.
- If login works on laptop but not phone, check:
  - Laravel server is running on `0.0.0.0:8000`
  - Windows Firewall allowed PHP/Laravel
  - phone and laptop are on the same network
  - frontend URL uses the correct LAN IP
  - API URL is reachable from phone as `http://<LAN-IP>:8000`

## Verification Already Performed

After the PWA/mobile and latest UI work:

- `cd web && npx.cmd tsc -b --noEmit` passed.
- `cd web && npm.cmd run build` passed.
- `npm audit fix` was run after adding the PWA dependency, and the final npm audit reported zero vulnerabilities.

Backend tests were not confirmed in the latest session because the default PHP on the machine may be PHP 8.2 while the project needs PHP 8.4.

## Watch Areas Before New Work

- Keep role boundaries strict:
  - staff handles guest request approval and patient registration
  - doctor handles clinical appointment/consultation work
  - patient sees personal appointments, profile, prescriptions, and records
  - request tab belongs to staff only
- Keep patient profile and `My Records` separate.
- Do not cache clinical API responses in the PWA.
- Do not reintroduce huge blank cards or unbalanced grids in mobile/tablet layouts.
- Run frontend typecheck/build before committing.
- Run backend tests with PHP 8.4 before release or backend changes.
