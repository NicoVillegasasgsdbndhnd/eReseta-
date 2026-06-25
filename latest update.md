# Latest Update

Branch pushed from this machine: `main`

This update contains the reconciled work after merging Mark-side changes with the local Nico-side workflow/UI changes. The merge policy used was:

- Keep Nico/local UI and workflow where it represents the latest approved behavior.
- Keep Mark-side backend, safety, clinical access, prescription, and patient-record logic where it adds deploy-ready behavior.
- Preserve unique features from both sides unless they directly duplicate or weaken security.

## Patient Interface

- Improved patient appointment flow and appointment detail/view visit details layout.
- Reduced unbalanced spacing in appointment detail screens and moved toward a unified visit-pass style layout.
- Added/kept patient-facing `My Records` as the clinical history portal.
- Kept patient profile separate from records: patient profile now focuses on demographics/account-style viewing.
- Improved patient `My Records` UI and data loading path so the patient can access their own chart/records.
- Improved appointment booking doctor selection layout so doctor cards are more compact and deploy-ready.
- Patient navigation now includes the correct patient-specific sections only.

## Doctor Interface

- Enhanced doctor dashboard UI layout.
- Redesigned doctor appointments tab to feel like an appointment workspace instead of a plain dashboard.
- Added appointment calendar indicators:
  - Date numbers shown in each calendar cell.
  - Appointment count micro-text/dot indicators shown on booked days.
  - Selected date list shows patients for that day.
- Fixed stale appointment status display:
  - Passed active reservations now show `Delayed` or `No show` instead of bright `Reserved`.
- Improved doctor appointment detail/open appointment layout to avoid misaligned or unbalanced columns.
- Doctor appointment detail keeps doctor-appropriate actions only.
- Doctor no longer owns patient registration flow; staff handles guest-to-patient registration.
- Doctor profile/staff assignment visibility was reconciled so assigned staff can appear correctly.
- Request tab is removed from non-staff interfaces.
- Enhanced consultations tab UI.
- Enhanced new consultation record UI:
  - Better header and stat cards.
  - Grouped clinical notes, prescription, and diagnostic test panels.
  - Cleaner search/filter/table layout.
- Mark-side clinical visibility/security policy remains the basis for sensitive staff/clinical data handling.

## Staff Interface

- Staff request tab remains the main place for guest patient appointment requests.
- Request notification count behavior was added to staff navigation/dashboard surfaces.
- Staff dashboard includes new guest appointment/request visibility.
- Guest appointment approval/decline flow was reconciled with cleanup/visibility rules.
- Staff appointment detail behavior:
  - `Mark as Completed` removed from the guest appointment detail workflow.
  - `Register Patient` is staff-owned.
  - Register button stays disabled/light until the actual appointment date and time arrives.
  - Time until visit now behaves like a countdown using days/hours/minutes.
- Last Diagnosis display was adjusted according to the final clinical access policy.
- Staff actions remain separated from doctor actions.

## Pharmacist Interface

- Prescription UI and detail behavior were reconciled.
- Pharmacy dashboard was redesigned into an operations-focused verification desk with queue actions, status metrics, prescription movement, and recent dispenses.
- Pharmacy verify queue was redesigned into a searchable worklist with `All`, `Verify`, and `Dispense` filters, clear Rx rows, medicine previews, and action buttons.
- Pharmacy dispense history was redesigned into a release-ledger layout with today/7-day/item metrics, search, date filters, and completed-release rows.
- Nico visual direction was kept where it improves the interface.
- Mark-side prescription functionality was preserved, including:
  - Issued date.
  - Item count.
  - Hospital Rx behavior.
  - Safety warnings.
  - Live dosing sync.
  - Dosage/quantity-unit behavior.
  - Signature image rendering.

## Public / Auth / Shared UI

- Homepage/public landing UI improvements were retained.
- Public pages were added/kept:
  - About
  - FAQ
  - Privacy
  - Services
- Login page UI was redesigned and the extra secure sign-in label was removed.
- Mobile/LAN testing helpers were added:
  - Frontend scripts now include `npm run dev:host` and `npm run preview:host`.
  - CORS allows LAN Vite dev/preview origins including port `5174`.
  - Legacy API client now resolves the Laravel API through the same LAN host when opened from a phone.
  - Public doctors and login screens now show clearer API connection errors instead of misleading empty/invalid states.
- Logout behavior was updated so users return to the homepage after logging out.
- Top navigation role boundaries were corrected so role-specific tabs do not appear where they should not.

## Deployment Decision

- Current first-choice hosting plan: **AWS Lightsail Linux/Unix Ubuntu General Purpose $44/month**.
- Selected specs:
  - 8 GB RAM
  - 2 vCPU
  - 160 GB SSD
  - 5 TB transfer
- Reason:
  - More suitable than the minimum plan for capstone defense, demo stability, and controlled penetration testing.
  - Enough for Laravel API, PHP 8.4, Nginx, queue worker, scheduler, logs, uploads, and moderate demo/pentest traffic.
  - Easier and more practical than a full AWS EC2/ECS/RDS architecture for this stage.
- Cheaper VPS alternative discussed: KVM 2 with 2 vCPU / 8 GB RAM is technically enough, but AWS Lightsail remains the preferred professional/cloud option.

## Backend / API / Tests

- Appointment request controller and tests were updated for the guest appointment workflow.
- Auth/user resources were updated to support role-specific frontend behavior.
- Patient chart/record controllers and tests were reconciled for patient-owned records and clinical access behavior.
- Role boundary tests were updated for interface/API role separation.

## Verification Performed

The latest frontend verification after the pharmacy UI and mobile/API helper work passed:

- `cd web && npx.cmd tsc -b --noEmit`
- `cd web && npm.cmd run build`

Before final deployment or release, the next member should also run backend verification:

- `cd api && php artisan test`

On this machine, Composer was adjusted to use PHP 8.4.21 through `C:\composer\composer.bat`, with a backup at `C:\composer\composer.bat.backup-before-php84`.

## What The Other Member Should Do

1. Fetch and checkout the updated branch:

   ```bash
   git fetch origin
   git checkout main
   git pull origin main
   ```

2. Install/update dependencies if needed:

   ```bash
   cd web
   npm install
   ```

   ```bash
   cd api
   composer install
   ```

3. Run database migrations after pulling:

   ```bash
   cd api
   php artisan migrate
   ```

4. Verify the app:

   ```bash
   cd web
   npx tsc -b --noEmit
   npm run build
   ```

   ```bash
   cd api
   php artisan test
   ```

5. Review these flows manually:

   - Patient login, appointment tab, view visit details, profile, My Records, prescriptions.
   - Doctor dashboard, appointment calendar, appointment detail, consultations, new consultation record.
   - Staff dashboard, requests tab, guest appointment approval/decline, guest registration timing rule.
   - Pharmacist dashboard, verify queue, dispense history, prescriptions, and prescription detail.
   - Logout from each role should return to homepage.

## Notes / Watch Areas

- The branch contains a large merge reconciliation. If another branch also changed the same UI files, expect normal Git conflicts in React feature pages.
- Shared source of truth is now `main` on `https://github.com/NicoVillegasasgsdbndhnd/eReseta-.git`.
- Patient `My Records` and patient profile are intentionally separate:
  - `My Records` is clinical/visit history.
  - Profile is demographics/account viewing.
- Staff clinical visibility should continue to follow the access policy instead of exposing all sensitive data blindly.
- Doctor and staff appointment actions should stay separated:
  - Doctor handles clinical appointment/consultation work.
  - Staff handles guest request approval and patient registration.
