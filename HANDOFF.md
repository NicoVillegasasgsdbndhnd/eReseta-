# HANDOFF — eReseta+ Project State

> Living hand-off doc for the two-developer relay. **Read this + `git log` at the start of every
> session; update it before you finish.** See "Multi-developer relay workflow" in `CLAUDE.md`.

**Last updated:** 2026-06-22 (end of day) · **Last worked by:** Mark · **Active branch:** `merge/marks-work` — **`main` is in sync** (both at the same commit, pushed)

---

## ▶️ CONTINUE HERE — picking up tomorrow (2026-06-23)

**Where we are:** system is **feature-complete, polished, and tested** (115 backend tests pass, `tsc -b`
clean, `vite build` green). All mentor revisions + beyond-scope features + the full polish round are
done, committed, and pushed to GitHub on **both `merge/marks-work` and `main`**. Nothing is uncommitted.

**System deadline: June 27.** Defense: ~2 weeks out.

**Remaining tasks (in priority order) — these need decisions, not just coding:**

1. **🧪 Flip the testing toggle for final submission.** `ALLOW_ANY_DAY_CONSULTATION` in
   [`web/src/features/consultations/ConsultationsPage.tsx`](web/src/features/consultations/ConsultationsPage.tsx)
   is **`true`** (lets a doctor consult on any date — for testing). Set it to **`false`** for the real
   submission to restore the mentor's "same-day only" rule. *Do this once testing is finished, before the 27th.*

2. **🌐 Live hosting + penetration test (thesis requirement).** **BLOCKED on adviser confirmation** —
   Mark needs to ask: *(a)* is live hosting + pen-test required for defense or is June 27 the frozen system?
   *(b)* after June 27, are we allowed to deploy the same code / apply security fixes? *(c)* must the
   pen-test be on a live host or is local OK?
   - **Plan once cleared:** host on **Azure free account** ($200/30 days, no surprise billing — Mark was
     mid-signup), fully-live blockchain on the VM. Roadmap is in **`DEPLOY.md`**. Deployment files (Docker
     compose + Nginx + HTTPS) still need to be built — that's the next big coding chunk.

3. **🔒 Pen-test remediation** — address findings from the pen test as recommendations / hardening
   (see Known Limitations below).

> **For a fresh session:** read this section + `git log --oneline -25` + the "LATEST UPDATES" and
> "MENTOR-REVISION FEATURES" sections below. Then ask Mark which of the 3 tasks above to start.

---

## 🆕 LATEST UPDATES — 2026-06-22 (Mark session, UI/UX round)

> **For "what's the latest?":** on top of the mentor phases + beyond-scope features below, this
> round refined the booking + prescription UX. All committed on `merge/marks-work`, `tsc -b` clean,
> `vite build` green. No new migrations in this round.

- **Booking (Patient → Appointments → Book):** doctor selection is now **category-first** — you pick a
  **specialization tile** (big squares with a doctor count, incl. an **"All doctors"** tile) before any
  doctors are shown. After choosing a doctor the **"Pick a date" card auto-scrolls to centre**; after
  choosing a date the **time slots auto-scroll** into view. `BookAppointmentPage.tsx`.
- **Prescriptions list:** a **single click** on a row now opens it (was double-click), landing on the
  **Hospital Rx** (DEAMHI form) view. `DataTable` gained `onRowClick`. Friendlier for patients.
- **Patient → My Records:** Active Medications + Lab & Imaging now show a **"From this visit"** box that
  cross-links to the source encounter (with that visit's med/lab counts); **Visit History cards are
  clickable → a full-detail modal** (chief complaint, diagnosis, notes, all meds + labs from that visit).
  Chart now eager-loads `diagnosticOrders.items`; `lab_imaging` exposes `patient_record_id`.
- **Prescription dosing auto-compute (`rxItem.ts` / `PrescriptionItemEditor`):** **live recompute** of
  quantity/frequency/duration — fill any 2 → the 3rd computes, and **changing either of the two keeps
  the 3rd in sync** (even when all three are filled: changing freq/duration recomputes quantity, changing
  quantity back-solves duration). Used by both the consultation Rx section and the standalone New
  Prescription form.
- **Dosage ↔ unit linkage:** changing the **quantity unit type** re-selects the **dosage** to match —
  a liquid unit (mL/bottle/vial/ampule/drop) pairs with a liquid strength (e.g. `100 mg/5 mL`), a solid
  unit (tablet/capsule/…) with a plain strength (e.g. `600 mg`). `dosageForUnit()`.

---

## 📌 KNOWN LIMITATIONS & FUTURE WORK (deliberate scope — 2026-06-22)

Documented intentionally for the thesis "Limitations & Future Work" section:

1. ~~**Doctor signature as an *image*.**~~ ✅ **DONE** — `doctors.signature_image` + `POST/DELETE
   /profile/signature`; a doctor uploads their signature in **Profile → E-Signature**, and the Hospital
   Rx renders the image (falling back to the typed e-signature text when none is uploaded).
2. ~~**"Doctor's own medical record" auto-restriction.**~~ ✅ **DONE** — a clinician can no longer
   self-access their own patient chart (`/patients/{id}/chart` returns **403** when
   `patient.user_id === viewer.id`); a *different* physician must view it. Test:
   `PatientChartTest::test_doctor_cannot_view_their_own_medical_record`.
3. **Pen-test remediation.** Findings from the planned penetration test are to be addressed as
   recommendations / future hardening (see DEPLOY.md).

---

## 🆕 MENTOR-REVISION FEATURES — 2026-06-22 (Mark session, 4 phases)

> Four remaining mentor items built end-to-end (migrations + backend + frontend + tests).
> **Migrations to run after pull:** `2026_06_22_000003` (doctor credentials), `000004` (restriction
> support), `000005` (patient documents). Also run **`php artisan storage:link`** (uploads) and set
> **`APP_URL=http://localhost:8000`** in `api/.env` so stored-file URLs resolve. Verified: 111 tests
> pass, `tsc -b` clean, `vite build` green.

**Phase 1 — Doctor credentialing + access-permissions matrix** (`Admin → Users → Add/Edit doctor`)
- 21 new `doctors` columns (identity, PH gov creds PAN/TIN, dept/consultant type, society/HMO/clinic-day
  arrays, PF fees). `DoctorCredentialFields.tsx` shared component (text/date/dropdown/checkbox/currency).
- **`DoctorResource` filters by the viewer's role:** patient sees public profile only; staff/doctor/
  pharmacist add credentials + all fees; **admin alone sees TIN**.

**Phase 2 — Restricted / break-glass clinical data** (`Patient Records chart`)
- `patient_records.restriction_category` (mental_health / genetic / substance_abuse / vip /
  patient_requested) + `restricted_specialization`. Restricted records are filtered OUT of the main
  timeline; surfaced in a **Restricted Files** tab, **locked** (content withheld) unless the viewer is
  the matching specialist. Doctors set confidentiality in the consultation form.
- **Break-glass**: `POST /patient-records/{id}/break-glass` — doctor-only, requires a written reason,
  writes a `BREAK_GLASS` audit log (new `audit_logs.context`), returns the content. Admin audit page
  shows READ + BREAK_GLASS with the justification.

**Phase 3 — Patient administrative documents** (`Patient chart → Demographics → Attached Documents`)
- `patient_documents` table + upload/list/delete (`PatientDocumentController`), public disk, clinical
  staff only. jpg/png/webp/pdf, 5 MB max, categories ID/insurance/intake/HIPAA/other. Chart lists them
  with view/download + delete + a category-tagged upload control.

**Phase 4 — Prescription details UI** — light polish (icon-badge header cards, equal heights).

### Beyond-scope additions (same session, Mark's call)
- **Patient self-service "My Records"** — `GET /me/chart` (hard-scoped to own `patient_id`; restricted
  data stays hidden); read-only `MyRecordsPage` + a patient nav item. Audited read.
- **Doctor "Today's patients" dashboard** — today-scoped queue with one-click **Start** (deep-links to
  the pre-filled New Record form).
- **Prescribing safety** — `GET /patients/{id}/rx-safety` (allergies + active meds); `rxSafety.ts`
  drug-class KB flags **allergy conflicts** (incl. class cross-reactivity), **duplicate** prescriptions,
  and **same-class** therapy. Known-allergies banner + per-drug warnings in the consultation form;
  allergy conflicts require an override confirm. *Teaching-grade KB — swap for a licensed drug DB in prod.*

**Still not built:** doctor profile-photo / signature *image* upload (typed e-signature works today);
Rx QR-code pharmacist verification (offered, not selected).

---

## ⚠️ ACTIVE TESTING TOGGLE — REVERT BEFORE FINAL (added 2026-06-22, Mark)

**`ALLOW_ANY_DAY_CONSULTATION`** in [`web/src/features/consultations/ConsultationsPage.tsx`](web/src/features/consultations/ConsultationsPage.tsx) is currently **`true`** — a **testing convenience only**.

- **What it does:** lets a doctor create a **New Record** for *any* of their appointments regardless of date, instead of only same-day ones. With it `true`, the New Record patient dropdown pulls the doctor's appointments from **all days** (`useAppointments()` with no `date` filter); with it `false` it pulls **today only** (`useAppointments({ date: todayIso })`) and filters `apptDate === todayIso`.
- **Why:** so the booking → consultation → prescription → dispense flow can be tested without waiting for the appointment day.
- **For final version:** set the constant to **`false`**. That restores the mentor rule *"doctor cannot start a record if the time is not today."* No other code change needed — the `dayOk` guard and the query already branch on the flag.

### Related fixes in the same session (Mark)
- **Consultation queue bug:** the queue was filtering for `status: 'confirmed'`, but the confirm step was removed (auto-reserve), so it was always empty. Now it lists **today's non-terminal** appointments (`scheduled`/`confirmed`/`rescheduled`). `useAppointments` gained a `date` param.
- **Booking success screen:** "Appointment Booked! … pending confirmation" → **"Appointment Reserved"** (no confirmation wording) to match the auto-reserve rule. [`BookAppointmentPage.tsx`](web/src/features/appointments/BookAppointmentPage.tsx)
- **Admin → Patients:** removed the "View Profile →" link; a patient now opens on **double-click** (mentor: "Remove view profile and create double click instead"). [`PatientsPage.tsx`](web/src/features/patients/PatientsPage.tsx)

---

## 📋 FOR MARK — this branch is ready to merge (2026-06-22, by Nico)

> **TL;DR:** Everything below is on **`merge/marks-work`** and pushed. Pull it, run
> `php artisan migrate`, and merge it — it already contains **your Phases 1–4** (it was branched off our
> integrated line) **plus** the appointment/records/staff work in this session. Nothing of yours was
> dropped. **Verified before push:** `tsc -b` clean, `vite build` green, `php artisan test` green
> (incl. new `RoleBoundaryTest::staff can register a patient profile`).
>
> **One migration to run after pull:** `2026_06_22_000002_add_profile_fields_to_patients_table`
> (11 nullable patient columns — demographics/government/insurance/emergency). No data backfill needed.

### What changed, by interface → tab (navigation guide)

**👤 Patient interface**
- **Appointments → Book:** the **Confirm step is gone** — booking now **auto-reserves** the slot
  (status shows **"Reserved"**). No more pending→confirm round-trip.
- **Appointments → (open an appointment):** the **detail page was redesigned** — blue-gradient hero
  header, 3-column info cards, status shown inside the strip as "Reserved" (no header badge),
  equal-height cards, timeline removed.
- **Appointments → appointment actions:** **Cancel** opens a **rebook-vs-cancel choice modal**;
  a **Reschedule** button sits beside Cancel; a link to the **Availability / leave-dates** page was added.
  Cancelled appointments **drop off** the active list (still reachable via filter).

**🩺 Doctor interface**
- **Consultations tab:** **double-clicking a patient opens the Patient Records chart** (same profile
  view as Patient Records) — applies to every role that has the Consultations tab.
- **Patient Records tab (new):** audited patient **chart** (every open writes a READ audit log).
  - **Demographics tab** rebuilt into the sectioned chart format: *Personal Information*,
    red *Health Safety Alert* (allergies), *Government & Insurance Verification*, *Emergency Contact*,
    and an *Attached Documents* placeholder.
  - **Active Medications** renders as a **collapsible Hospital Rx list** — each Rx is hidden behind an
    **"Rx · <date prescribed>"** sub-tab; click to expand the full Hospital Rx.
  - **Procedures & Surgeries removed** (there's no consultation flow that records one).

**🧑‍💼 Staff interface**
- **Appointments:** staff can **manage their assigned doctor's schedule** (edit status / calendar view),
  same as the doctor manages their own. Staff **cannot create new appointments**. Cancelled ones drop off.
- **Patient Records:** staff can now **view full patient info** — demographics, clinical history,
  consultations, prescriptions (no longer masked for staff).
- **Patient Records → New Patient (new):** staff get a **"New Patient"** button to **create/edit a full
  patient profile** (demographics, preferred language, allergies, government ID, HMO/insurance, emergency
  contact). "Leave blank if no information." Post-save returns staff to **/records** (they have no admin
  patient list). File uploads for *Administrative Documents* are deferred (Phase B placeholder).

### Backend touchpoints (so you know what to expect in the diff)
- `patients` table: +11 nullable columns; `Patient` fillable + `PatientResource` + chart payload expose them.
- `PatientController` store/update now allow **staff** (not just admin); `Store/UpdatePatientRequest`
  validate the new fields. New test: `RoleBoundaryTest::test_staff_can_register_a_patient_profile`.
- `PatientChartController::show` writes a **READ** audit log and returns demographics + active
  prescriptions + encounters + lab/imaging.
- Routes `/patients/new` + `/patients/:id/edit` opened to `staff`; `/records/:patientId` chart unchanged.

### What Mark needs to do to merge
1. `git fetch && git checkout merge/marks-work && git pull`
2. `cd api && php artisan migrate` (applies the one new patient-profile migration)
3. (optional) `php artisan test` to confirm green on your machine
4. Merge `merge/marks-work` into your working line. **No conflicts expected with your Phase 1–4 work** —
   this branch is a strict superset of it.

---

## Merge: Mark's mentor-revisions work integrated (2026-06-20, by Nico)

Merged Mark's branch (his Phases 1–4 / Epics A–T) into our line on branch **`merge/marks-work`**.
**Policy: Mark is the base on any feature overlap; our unique fixes are layered on; nothing of Mark's
was dropped.** Verified after resolving: **101 backend tests pass, `tsc -b` clean, `vite build` green.**

**4 conflicts resolved:**
- `UpdateAppointmentStatusRequest` — took Mark's roles (`doctor/admin/staff/patient`; his superset).
- `AppointmentService` — Mark's base (doctor-leave + slot check + booking email) **plus our unique
  `assertPatientFree`** (a patient can't hold two appointments at the same datetime, even with
  different doctors); also enforced on reschedule.
- `BookAppointmentPage` — Mark's rewrite (leave dates, grey-out booked slots, specialization pills)
  **plus our booking-error message**.
- Prescription form — **Mark's `PrescriptionItemEditor` + `rxItem` + auto-compute won**; we ported our
  **additive** bits into it: form-aware **quantity-unit dropdown**, **week/hour frequency**, and the
  **`quantity_unit`** column (`toRxPayload` now sends it). ⚠️ Our earlier `regimenError` block-on-submit
  was **dropped** in favour of Mark's auto-compute (fill any 2 of qty/freq/duration → the 3rd).

**Our unique work preserved (Mark's branch had neither):**
- Patient-can't-double-book check (above).
- **Timezone / wall-clock fix** — `AppointmentResource` + `ReportController` emit `scheduled_at` as a
  naive local string (no `Z`) so booked times display exactly as chosen.

**Backend reconcile:** both new columns coexist — our `prescription_items.quantity_unit` + Mark's
`medicines.brand_name`. After pulling, run `php artisan migrate` then seed `MedicineBrandSeeder` +
`DiagnosticTestSeeder` (+ re-seed doctors for Rx profile fields). `MAIL_MAILER=log` for booking email.

> The "2026-06-17 — prescription form UX" section below describes our *pre-merge* inline implementation;
> the merged reality is as summarised here (Mark's editor + our ported units; no `regimenError`).

---

## ⛓️ BLOCKCHAIN IS NOW OPERATIONAL on Mark's machine (2026-06-19)

> **For Nico:** no new **app code** changed in this session — everything code-wise is already pushed
> (last commit `2a6eb21`). This entry is **documentation**: the Hyperledger Fabric ledger was brought up
> end-to-end on a fresh Windows machine, and these are the exact steps + gotchas so you (or any new
> machine) can reproduce it. Nothing here needs pushing except this HANDOFF update.

**Verified working end-to-end:** a prescription created via the API was written to the Fabric ledger and
its `blockchain_tx_id` backfilled; the **full lifecycle is on-chain** — ISSUED, VERIFIED, DISPENSED each
got a distinct Fabric tx id. Containers `orderer.example.com`, `peer0.deamhi.example.com`, and the
chaincode container are Up; gateway listens on `:3001`.

### Fresh-machine setup recipe (what actually worked — beyond HYPERLEDGER_DOCUMENTATION §11)
1. **WSL kernel:** Win10 build needed the packaged-WSL servicing update; installed the standalone WSL MSI
   from GitHub (`microsoft/WSL` releases) after Windows Update was resumed. `wsl --version` must work.
2. **Ubuntu (non-interactive):** the distro first-run is interactive, which blocks automation. Register it
   as **root** with no prompt: `ubuntu2404.exe install --root` (the Appx was already present via winget
   `Canonical.Ubuntu.2404`). Then `wsl --set-default Ubuntu-24.04`.
3. **Docker ↔ Ubuntu integration (the sticky part):** enabling only "default distro" in Docker Desktop is
   not enough. It worked after adding the **per-distro** entry — in
   `%APPDATA%\Docker\settings-store.json` set `"IntegratedWslDistros": ["Ubuntu-24.04"]` (or toggle it in
   Settings → Resources → WSL Integration) **and** do a clean Docker restart. Verify with
   `wsl -d Ubuntu-24.04 -- docker version`.
4. **Ubuntu prereqs (as root):** apt `curl git jq make build-essential`; **Go 1.22** to `/usr/local/go`;
   **Node 18** via nvm; **Fabric 2.5.15 binaries** via `install-fabric.sh ... binary` (lands in `~/bin` +
   `~/config`). Then **clone `fabric-samples`** (shallow) and arrange so `~/fabric-samples/` has
   `bin/ config/ builders/ test-network/` (deamhi.sh expects `FABRIC_HOME=~/fabric-samples`).
5. **Cred-helper fix:** `echo '{}' > ~/.docker/config.json` to avoid the `desktop.exe` exec-format error
   on `docker pull`. Then pull `fabric-orderer/peer/tools:2.5.15` + `fabric-ccenv/baseos:2.5`.
6. **Network + chaincode:** from `blockchain/network/` run `./deamhi.sh up` then `./deamhi.sh deployCC`
   then `./deamhi.sh smoke`. (deamhi.sh already normalizes the admin cert to `signcerts/cert.pem`.)
7. **Gateway:** copy `blockchain/gateway` to `~/ereseta-gateway`, `npm install` (Node 18), run with
   `PORT=3001 CHANNEL_NAME=ereseta-channel CHAINCODE_NAME=prescription PEER_ENDPOINT=localhost:7051
   PEER_HOST_ALIAS=peer0.deamhi.example.com CRYPTO_PATH=~/ereseta-fabric/organizations npm run dev`.
8. **Laravel:** `api/.env` → `BLOCKCHAIN_ENABLED=true` (note: `.env` is gitignored — **per-machine**),
   `config:clear`, then `php artisan queue:work` so the `RecordPrescriptionOnLedger` jobs run.

### After a reboot (do NOT re-run `up` — it regenerates crypto and wipes the ledger)
```
# in Ubuntu-24.04:
cd /mnt/c/laragon/www/eReseta-/blockchain/network && ./deamhi.sh start    # restart containers
cd ~/ereseta-gateway && CRYPTO_PATH=~/ereseta-fabric/organizations ... npm run dev   # gateway
# in Windows: php artisan queue:work  (+ artisan serve, npm run dev)
```

---

## What was just done (2026-06-18 — Epic O (smart dosing) + mentor-decision defaults, by Mark)

**Verified: 93 backend tests pass, `tsc -b` clean, `vite build` green.**

- **Epic O — smart prescription dosing (Phase 3 now fully complete):** new shared
  `web/src/features/prescriptions/PrescriptionItemEditor.tsx` + `rxItem.ts`, used by **both** the
  consultation inline form and `NewPrescriptionPage` (removed the duplicated inline item fields):
  - **Dosage dropdown** sourced from the catalog medicine's `strength` (rendered as a `datalist`, so
    it's a dropdown but still free-type-able / manual override).
  - **Brand names:** new nullable `medicines.brand_name` (migration `2026_06_18_000007`), exposed on
    `MedicineResource`, **searchable** (MedicineController matches generic OR brand), shown in the
    combobox; new `MedicineBrandSeeder` (10 PH brands e.g. Paracetamol→Biogesic) wired into
    `DatabaseSeeder` + seeded live.
  - **Auto-compute:** quantity ↔ frequency (×/day) ↔ duration (value + day/week/month) — filling any
    two auto-fills the third (`autoCompute` in `rxItem.ts`). Payload still normalizes to the existing
    `frequency`/`duration` strings via `toRxPayload`, so the API + Rx are unchanged.
- **Mentor decision #3 (served rename):** "served" now **displays as "Completed"** (StatusBadge + pills
  + appointment timeline/buttons + consultation button + staff dashboard). **Internal enum value stays
  `served`** — no migration, fully reversible.
- **Mentor decision #4 (patient ID):** `PatientResource` now returns a derived **`patient_code`** like
  `DEAMHI-2026-00001` (year + zero-padded id, no schema change), shown on the patient profile header.

---

## What was just done (2026-06-18 — Phase 4: Diagnostic / lab orders, by Mark)

Built the **`DiagnosticOrder`** feature from the plan (Appendix A design). **Verified: 93 backend tests
pass (+5 new), `tsc -b` clean, `vite build` green.** This also closes the Epic I leftover ("order a
test" button in the consultation).

- **Backend (additive, off-chain — no pharmacist/blockchain):** migrations `2026_06_18_000004/5/6`
  (`diagnostic_tests` catalog with `is_available`, `diagnostic_orders`, `diagnostic_order_items`);
  models `DiagnosticTest` / `DiagnosticOrder` / `DiagnosticOrderItem`; `DiagnosticTestController`
  (index searchable + admin store/updateAvailability/destroy) and `DiagnosticOrderController` (doctor
  `store`, role-scoped `index`/`show`, `updateStatus`); `StoreDiagnosticOrderRequest`; resources;
  routes under `/diagnostic-tests` + `/diagnostic-orders`. `PatientRecord` gained `diagnosticOrders()`
  and the records endpoints eager-load + expose them. `DiagnosticTestSeeder` (20 PH lab/imaging tests,
  wired into `DatabaseSeeder`, **seeded into the live DB**). New `DiagnosticOrderTest` (5 cases).
- **Frontend:** `diagnostics/queries.ts`; `DiagnosticTestCombobox` (catalog type-ahead, available-only,
  free-text fallback); admin **Test Catalog** page `DiagnosticTestsPage` at `/diagnostic-tests`
  (add/toggle/remove) + a **Test Catalog** TopNav link for admin; an **"Order a test"** section in the
  consultation form (doctor-only, optional — "Served" now also creates a diagnostic order when tests
  are added); diagnostic orders render **per visit** on `PatientProfilePage` next to the prescription.
- **Reference format:** orders use `DX-YYYY-0001`. Status set: `ordered / completed / cancelled`.

---

## What was just done (2026-06-18 — Phase 3 (partial): Hospital Rx + doctor Rx profile, by Mark)

Phase 3 from the plan. **Verified: 88 backend tests pass (+2 new), `tsc -b` clean, `vite build` green.**
Done — Epics **P, Q**:

- **P — Hospital Rx first + print:** `PrescriptionDetailPage` now defaults to the **Hospital Rx** tab
  (reordered first); added a **Print** button (`window.print()` + an `@media print` block in `index.css`
  that isolates `.rx-print-area`, hides `.no-print`). The Rx already renders the prescribing doctor's
  name + license.
- **Q — doctor Rx profile:** new nullable doctor columns **`ptr_no`, `s2_license`, `signature`**
  (migration `2026_06_18_000003`), exposed on `DoctorResource`, captured in the **admin Add/Edit User**
  Physician-Details form, persisted by `UserController` store/update, and rendered on the Hospital Rx
  (PTR NO. / S2 filled; typed signature shown in a script font above the signature line). `DoctorSeeder`
  now seeds sample values; **re-seeded** the live doctors. New `DoctorRxProfileTest`.

**Deferred — Epic O (smarter dosing):** dosage dropdowns per medicine, brand names, and the auto-compute
qty↔frequency↔duration need **structured numeric dosing fields + per-medicine dosage/brand data** that
this branch's free-text prescription items don't have yet. Flagged as its own follow-up (schema +
medicine-catalog data work). Not started.

---

## What was just done (2026-06-18 — Phase 2 (partial): records & consultation usability, by Mark)

Started Phase 2 from `MENTOR_REVISIONS_PLAN.md`. **Verified: 86 backend tests pass (+3 new), `tsc -b`
clean, `vite build` green.** Done so far — Epics **L, M, G, J**:

- **L — cross-view records:** `PatientRecordController::allRecords` no longer scopes a doctor/staff to
  their own records — every doctor/staff/admin sees **all** patient records (one shared hub; the
  `ConsultationsPage` search list is that hub). Pharmacist/patient still blocked. New `PatientRecordTest`.
- **M — grouped per-visit layout:** `PatientProfilePage` "Clinical Records" tab now shows, **inside each
  visit card**, that visit's prescriptions (ref no + drug list + status, clickable to the Rx) or
  "No prescription or procedure — notes only." Notes + Rx are together per visit. Added `prescriptions`
  to the `PatientRecord` TS type (per-patient records endpoint already eager-loads `prescriptions.items`).
- **G — record creation rules:** the New Consultation form only lists patients whose **confirmed
  appointment is today**, and selecting one **auto-fills the (locked) visit date** from that appointment.
- **J — bigger fields:** chief complaint + diagnosis are now textareas; notes bumped to 5 rows.

**Epic H + I — DONE (2026-06-18):** the prescription form is now **merged into the consultation screen**.
`ConsultationsPage`'s New Consultation form has an optional, doctor-only **Prescription** section
(`MedicineCombobox` + dosage/qty/frequency/duration/instructions, add/remove rows). On "Served" it
creates the visit record, then — if meds were added — issues the prescription against that new record,
then marks the appointment served. **Notes-only is fully valid (Epic I)**; an incomplete med row blocks
submit so nothing is silently dropped. The standalone `NewPrescriptionPage` still exists for separate use.
`tsc -b` clean, `vite build` green. (Staff decision: keep clinical data **masked** for staff — confirmed.)

**Epic K — DONE (2026-06-18):** a doctor can **edit a served/past clinical record** inline on
`PatientProfilePage` (Edit button per visit card → editable diagnosis/chief-complaint/notes →
Save/Cancel via `useUpdatePatientRecord` → `PUT /patient-records/{id}`, already permitted + tested).

**Still TODO in Phase 2:**
- **I (test orders)** — the "order a test" button in the consultation needs Phase 4's `DiagnosticOrder`.
- **N — patient ID format** (needs mentor decision #4).
- **Open decisions to confirm with mentor:** "served" rename (#3), patient-ID format (#4). Staff PII
  visibility was decided: **keep masked**.

> **Phase 2 is otherwise complete (Epics G, H, I, J, K, L, M).** Next up is Phase 3 (prescription UX +
> Hospital Rx + doctor-profile) or Phase 4 (`DiagnosticOrder`), per the plan.

---

## What was just done (2026-06-18 — Phase 1 of mentor revisions: appointment cleanup, by Mark)

Implemented **all of Phase 1** from `MENTOR_REVISIONS_PLAN.md` (Epics A–F). **Verified: 83 backend
tests pass (was 71; +12 new), `tsc -b` clean, `vite build` green.** Two new migrations applied.

- **Epic A — types:** removed `emergency` everywhere (enum, validation, seeder, all FE labels,
  `mocks/types`). New migration `2026_06_18_000001_remove_emergency_appointment_type` (driver-safe:
  data-converts then tightens the MySQL enum; skips the raw ALTER on SQLite). Patient booking is now
  auto-`consultation` (type selector removed from `BookAppointmentPage`); `follow_up` kept in the
  system for doctor/staff-created follow-ups. `StoreAppointmentRequest` defaults type + only allows
  `consultation|follow_up`.
- **Epic B — booking flow:**
  - **Fixed the "confirming a pending booking doesn't work" bug** — `UpdateAppointmentStatusRequest`
    only allowed doctor/admin, so staff (secretary) confirmations 403'd even though the UI offered the
    button. Staff are now allowed (and gated to their `assigned_doctor_id` in the controller).
  - **Auto-reserve / no double-booking** — `AppointmentService::assertSlotAvailable` rejects a 2nd
    active booking for the same doctor+datetime (422); `BookAppointmentPage` greys out booked slots
    via `/doctors/{id}/availability`.
  - **Doctor category** — specialization filter pills on the booking page.
  - **Email** — `AppointmentBooked` notification sent to the patient on booking (best-effort;
    `MAIL_MAILER=log` writes it to `laravel.log`).
- **Epic C — patient cancel/rebook:** patients can now cancel/reschedule their OWN appointment
  (controller guards: own + only `cancelled|rescheduled` + non-terminal). `AppointmentDetailPage`
  shows a patient action bar + a **rebook-vs-cancel choice modal**.
- **Epic D — doctor leave dates:** new **`doctor_leaves`** table + `DoctorLeave` model +
  `DoctorLeaveController` (`GET/POST/DELETE /doctors/{doctor}/leaves`; manage = admin / that doctor /
  their staff). Bookings on a leave date are rejected (422). `DoctorAvailabilityPage` gained per-day
  "Mark leave / On leave" toggles; `BookAppointmentPage` calendar disables leave dates.
- **Epic E — doctor calendar:** new **`AppointmentCalendar.tsx`** — month grid with a per-day count
  badge; clicking a day lists that day's patients. `AppointmentsPage` renders it for the doctor role
  (list view kept for everyone else).
- **Epic F — served lifecycle:** served appointments drop off the active appointments tab (list +
  doctor calendar); still reachable via the "Served" filter pill.

**Env note:** enabled `pdo_sqlite`/`sqlite3` in this machine's PHP 8.4 `php.ini` (tests use in-memory
SQLite and were erroring "could not find driver" until then).

**Next:** Phase 2 (consultation + records restructure) per the plan. Decisions still open with mentor:
the clinical term to replace "served", and the patient-ID format — both were intentionally NOT forced.

---

## What was just done (2026-06-18 — mentor revisions plan + env rebuild, by Mark)

- **New `MENTOR_REVISIONS_PLAN.md`** at repo root — the mentor's system-review notes organized into a
  phased mini development plan (4 phases, themed epics A–T, each with priority + acceptance criteria +
  affected files). **Read it before starting the next round of changes.** Highlights/decisions captured:
  - **Staff role (resolved conflict):** `staff` = **view all patient records + edit patient profile only**.
    **No consultation notes, no prescriptions.** Only `doctor` writes consultations/prescriptions.
  - **Prescription merges INTO the consultation screen** (no separate tab) — doctor types notes + prescribes
    together; prescription section is doctor-only.
  - **Appointments:** remove `emergency` + patient-facing `follow_up` (doctor/staff schedule follow-ups);
    patient self-cancel with rebook-vs-fully-cancel choice; doctor/staff can block leave dates; doctor
    appointments become a calendar w/ per-day counts; auto-reserve; email confirmation; fix the
    "confirm pending booking doesn't work" bug.
  - **Records:** unified cross-view searchable Patient Records tab for doctor/staff; per-visit grouped
    layout (notes + Rx/procedure together); time-gated record start; proper simple patient ID.
  - **Prescription UX:** per-medicine dosage dropdowns + brand names; auto-compute the 3rd of
    qty/frequency/duration from any 2; Hospital Rx shown first + doctor signature/license + print;
    admin captures doctor license + digital signature at account creation.
  - **Diagnostic/lab orders — research spike DONE (Appendix A):** build a **separate `DiagnosticOrder`
    entity parallel to `Prescription`** (NOT a prescription type — verify/dispense + blockchain are
    medication-specific and would pollute the pharmacist queue/chaincode). Off-chain for MVP; admin-managed
    test catalog mirrors the `Medicine`/`is_available` pattern. Schema sketched in the plan.
  - **Still TBD with mentor:** clinical term to replace "served", patient-ID format, `DiagnosticOrder` naming.
- **Env note (Mark's fresh Windows 10 machine):** rebuilt from scratch — PHP **8.4.22** via winget (Laragon
  only ships 8.3), Node v22 / Git / Composer / MySQL 8.4 from Laragon, all on PATH. `composer install` +
  `npm install` done, DB `ereseta` migrated + seeded. **Small fix:** `UserSeeder.php` referenced the old
  `it_admin` role (renamed to `staff` in migration `2026_05_16_000001`) and would crash — changed that
  entry to `staff@deamhi.test` / role `staff`. Test logins: `<role>@deamhi.test` / `password`.

---

## What was just done (2026-06-17 — UI redesign merged with backend features)

The **Medical Blue UI redesign** (TopNav layout, redesigned dashboards, Rx detail format,
audit-log drill-down, calendar booking, Issue-Prescription confirmation dialog) was merged on top
of `main`, which already carried four feature merges (medicine catalog, security hardening, UI
refresh, Blockchain Explorer). Branch: **`merge/ui-to-legacy`**.

**Resolution policy:** UI/design conflicts → redesign wins (Medical Blue `hsl(201 100% 36%)`,
horizontal sticky `TopNav`, no sidebar). Backend features → kept from `main`.

- **Medicine catalog kept** — `MedicineCombobox` is wired into `NewPrescriptionPage` (generic search
  + auto-fills first strength into Dosage); `/medicines` (MedicineAvailabilityPage) reachable for
  pharmacist + admin. **TopNav** gained a **Medicines** link (pharmacist/admin).
- **Blockchain Explorer kept** — `/blockchain` (admin) live ledger feed; **TopNav** gained a
  **Blockchain** link (admin). Prescription detail still renders the on-chain audit trail.
- **Security hardening kept** — all of main's auth/webhook/throttle/header changes are untouched.
- **Manual 3-way merges:** `NewPrescriptionPage` (Medical Blue + confirmation dialog +
  MedicineCombobox), `PrescriptionDetailPage` (DEAMHI Rx format, already carries the blockchain
  panel), `TopNav` (new nav links). `Sidebar.tsx` / `Topbar.tsx` stay **deleted** (replaced by TopNav).
- **Verified:** `tsc -b` clean, `vite build` green.

**Audit-log role tabs — FIXED.** `DashboardController::auditLogs` now eager-loads `user.roles` and
flattens the first Spatie role name onto each user (and drops the verbose `roles` relation) so the
frontend role tabs can filter by `user.role`. Regression test: `api/tests/Feature/AuditLogTest.php`
(role is surfaced + endpoint stays admin-only). Run `php artisan test --filter=AuditLogTest`.

---

## Claude Code skills — keep our setups in sync (per-machine, NOT in git)

Claude Code skills live under `.claude/skills/` which is **gitignored** (see `.gitignore`), so they do
**not** travel with the repo — each developer must set them up on their own machine. To match this
machine's setup:

- **Add:** `ui-ux-pro-max` — a UI/UX design-intelligence skill (styles, color palettes, font
  pairings, accessibility + chart guidance for React/Tailwind/shadcn) installed from GitHub. We used
  it to drive the Medical Blue redesign. Install it into `.claude/skills/ui-ux-pro-max/` (search
  GitHub for the `ui-ux-pro-max` Claude skill and copy the `SKILL.md` + `data/` + `scripts/` folder
  in). After copying, restart Claude Code so it picks the skill up.
- **Remove:** any other/default skills you have under `.claude/skills/` that we are not using — this
  machine intentionally keeps **only** `ui-ux-pro-max` to avoid skill noise. Deleting a skill folder
  (and restarting Claude Code) is all that's needed; nothing in the repo references them.

> Reminder: because `.claude/` is gitignored, this README note is the **only** way this preference
> reaches you — there's no commit that adds/removes the skill for you.

---

## What was just done (2026-06-17 — prescription form UX + structured dosing) — PRE-MERGE, partly superseded

> ⚠️ **Superseded by the 2026-06-20 merge** (see the Merge section at the top). The inline
> `NewPrescriptionPage` form below was **replaced** by Mark's `PrescriptionItemEditor`. The
> form-aware **quantity units**, **week/hour frequency**, and the **`quantity_unit`** column were
> **ported into Mark's editor**; the **`regimenError` block was dropped** for Mark's auto-compute.
> Kept here for history/rationale only.

Doctor's **New Prescription** form upgraded so dosing isn't free-typed into empty boxes:

- **Medicine picker is browsable without typing** — `MedicineCombobox` now opens the catalog on
  focus (empty search returns the first catalog page), so the doctor can scroll-and-pick or type to
  filter, and can still enter a custom name the catalog doesn't have.
- **Quantity / Frequency / Duration are now number + unit** instead of plain text:
  - **Quantity:** number + **count/volume** unit (`tablet, capsule, mL, bottle, sachet, vial, ampule,
    tube, drop, piece`). Mass/strength units (mg, g, %, IU, mg/mL) are **deliberately excluded** — they
    belong to **Dosage**, not quantity. ("1 bottle of 300 mg" is not how a liquid is dispensed.)
  - **Dosage (strength):** kept as a free-text field that **auto-fills from the catalog's `strength`**
    (overwrites when a new medicine is picked). Free text on purpose — real strengths vary too much for
    a dropdown (`mg`, `mcg`, `%`, `IU`, `mg/5 mL`, combination drugs).
  - **Quantity units adapt to the picked drug's form.** Picking a catalog medicine reads its
    `dosage_form` and restricts the quantity-unit dropdown to what's dispensable (a pure tablet shows
    `tablet, piece` only — no `bottle`). The PNF lists several forms per generic in one field
    (Paracetamol = "tablet, syrup, …, suppository, ampul"), so `quantityUnitsForForm` **unions** every
    matched form's units. A free-typed (non-catalog) drug keeps the full unit list.
  - **Regimen quantity check.** `regimenError` blocks submission when the dispensed quantity is less
    than frequency × duration (e.g. 3×/day for 7 days needs ≥21 tablets). Computed for `hour`/`day`/
    `week` frequencies and `day`/`week`/`month` durations; **only for discrete solid units**
    (tablet/capsule/piece/sachet — 1 unit per dose), skipped for mL/bottle/vial where that assumption
    fails. It's a lower-bound (won't false-error a 2-per-dose script). Shown inline per item.
  - **Item cards:** subtle neutral light/gray alternation + "Item N" badge (no blue accent line / no
    highlight-style shade — earlier versions were rejected as a "line" / "highlight").
  - **Frequency:** number + unit (`times/day`, `times/week`, `hour interval`) → composed to e.g.
    "3 times daily", "every 6 hours".
  - **Duration:** number + unit (`day(s)/week(s)/month(s)`) → composed to e.g. "7 days".
  - Frequency/duration compose into the existing string columns; **quantity gains a new
    `quantity_unit` column**.
- **Backend:** migration `2026_06_17_000001_add_quantity_unit_to_prescription_items` (nullable, safe
  for old rows), added to `PrescriptionItem` fillable, `StorePrescriptionRequest` rules, and
  `PrescriptionItemResource`. The ledger payload is unchanged (it only sends drug/dosage/qty), so no
  chaincode change. Detail page (Hospital Rx + Details tabs) shows the unit. Test:
  `PrescriptionTest::test_prescription_item_persists_quantity_unit`. `tsc -b` + `vite build` green.

## Running the blockchain locally (per-machine — not auto-started)

The Fabric network, gateway, and queue worker must be started by hand each session/after a reboot:

1. **Docker Desktop** up (WSL integration on for Ubuntu).
2. **Network:** in WSL → `cd /mnt/c/Capstone\ 1/blockchain/network && bash deamhi.sh start`
   — ⚠️ **`start`, not `up`** (`up` regenerates crypto and **wipes the ledger**).
3. **Gateway** (WSL, Node 18 via nvm — plain `npm` resolves to Windows npm and fails):
   `export PATH="$HOME/.nvm/versions/node/v18.20.8/bin:$PATH"; cd ~/ereseta-gateway;
   CRYPTO_PATH="$HOME/ereseta-fabric/organizations" node_modules/.bin/ts-node src/index.ts`
   → listens on `:3001`.
4. **Queue worker** (Windows, from `api/`): `php artisan queue:work` — flushes issue/verify/dispense
   events to the ledger and backfills `blockchain_tx_id`.

Verify: `GET http://localhost:3001/prescription/RX-SMOKE-1` returns the on-chain record; the admin
**Blockchain Explorer** page shows the gateway online.

---

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

## What was just done (2026-06-16 — UI/UX full redesign, branch `redesign/new-ui`)

Full visual redesign committed to **branch `redesign/new-ui`** (not yet merged to main).

**Why:** The old UI used shadcn/ui + Claude Phase-1 defaults — generic dark sidebar, slate palette,
default blue. The client is DEAMHI; the UI must look like a **modern private clinic**, not a template.

**Design decisions locked:**
- Layout: **Option A** — sticky horizontal top bar (`TopNav.tsx`), body scrolls, no sidebar.
- Logo (eReseta+) → `/dashboard` · Avatar → `/profile` · Nav links = feature-only (no Dashboard/Profile entries).
- **Palette:** Medical Blue `#0077B6` (primary), Health Green `#2A9D5C` (accent), white cards on
  `hsl(210 14% 97%)` page bg. **WCAG AAA** — 40+ year old user base (doctors, patients).
- Vibe: modern private clinic — clean, moderate density, strictly blue/green clinical, not techy.

**Files changed:**
- `web/src/index.css` — new design tokens (primary, accent, foreground, bg, border, radius, 16px font)
- `web/src/layouts/AppLayout.tsx` — `min-h-screen flex-col`, TopNav + scrollable main
- `web/src/layouts/TopNav.tsx` — **NEW** (absorbs all bell/auth/nav logic from old Sidebar + Topbar)
- `web/src/layouts/Sidebar.tsx` — **DELETED**
- `web/src/layouts/Topbar.tsx` — **DELETED**
- `web/src/layouts/AuthLayout.tsx` — centered white card on light medical-blue wash
- `web/src/components/common/PageHeader.tsx` — 2xl title, token-based colors
- `web/src/components/common/StatusBadge.tsx` — confirmed/verified → cyan (medical blue family)
- 4 dashboard pages — chart bar fill → `#0077B6`, indigo stats → cyan, pie colors updated

**Pre-existing build errors** (NOT from redesign, on `main` too — do not fix in this branch):
`RegisterPage.tsx` (`switchRole` missing), `mocks/data.ts` (`profile_photo_url` missing, `it_admin` role).

**Redesign Pass 2 — also done (2026-06-16):**
- `AppointmentsPage.tsx` — pill filters (All/Pending/Confirmed/Served/Cancelled), custom table with avatar initials, `···` action menu; no `DataTable` component
- `ConsultationsPage.tsx` — 3 stat mini-cards (patients seen, total, most recent), pill time filters (All/Recent/This month), avatar initials in rows
- `StaffDashboard.tsx` — **NEW** timeline view of today's appointments (08:00–17:00 in 30-min slots, color-coded by status) + Today's summary sidebar
- `DashboardPage.tsx` — staff now routes to `StaffDashboard` (not `AdminDashboard`)
- `DoctorDashboard.tsx` — inline greeting + date header, 3 KPI cards with context chips, 2-column: Upcoming appointments + Recent consultations (no bar chart)
- `PatientDashboard.tsx` — blue gradient banner with greeting + summary pills, 3 KPI cards, 2-column: My appointments + My prescriptions
- `AdminDashboard.tsx` — dark search bar, activity feed from audit logs, 4 number-only KPI cards, Recent activity + System status (Database: Online, Hyperledger Fabric: Synced static, Last backup: 02:00 AM static)
- `ProfilePage.tsx` — blue gradient hero banner + horizontal tabs (Personal Info / Password & Security / My Staff or My Physician per role)

**Still needed on this branch (follow-up pass before merge):**
- Per-page inline `style={{ border: '1px solid hsl(214 20% 90%)' }}` cleanup (~30 pages)
- Individual page polish (Prescriptions list, Patient list, other feature pages)
- Pharmacist dashboard — not yet redesigned (still uses old bar chart layout)

## What was just done (2026-06-17 — UI/UX Redesign Pass 3, branch `redesign/new-ui`)

- **`BookAppointmentPage.tsx`** — full rewrite: visual `MiniCalendar` (month grid, ‹ › nav, availability dots, selected date filled blue), doctor card list (avatar initials, "Available" badge, blue border + CheckCircle2 on selected), time slot grid (`AM_SLOTS + PM_SLOTS`, past times filtered for today), right sidebar (type stacked list, notes textarea, live green summary card, Book button disabled until all 3 chosen). Removed: `TimePicker`, `FieldLabel`, `<select>` for doctor, plain date input.
- **Back-button navigation fix** — `DispenseHistoryPage` and `VerifyQueuePage` now pass `{ state: { from: '/dispense-history' } }` / `{ state: { from: '/verify-queue' } }` when navigating to prescription detail; `PrescriptionDetailPage` reads `location.state?.from` to go back to the correct page.
- **`PrescriptionDetailPage.tsx`** — complete rewrite with DEAMHI Hospital Rx format: `DeamhiPrescriptionCard` renders the actual physical prescription blank (SVG Star of Life logo, hospital header, patient fields, ℞ symbol + meds, doctor signature block). Tab navigator "Details | Hospital Rx" added for **all roles** (not just patient).
- **`AdminDashboard.tsx`** — dark search bar fully removed (was dead code from prior session).
- **`AuditLogsPage.tsx`** — full redesign: 4 role tab cards (Patient · Doctor · Pharmacist · Staff), each showing total log count; click tab → user list for that role (name + action summary pills + entry count); click user → their individual log rows (action badge, target type/ID, IP, relative timestamp). Back button returns to user list. No `DataTable` or `PageHeader`.
- **`NewPrescriptionPage.tsx`** — Issue Prescription button now opens a confirmation dialog before submitting: shows patient name + diagnosis + full medication list for doctor review; "Go Back" cancels, "Confirm & Issue" submits.
- **`.gitignore`** — added `.claude/` (per-machine Claude Code memory, must never be committed).

**Audit log data note:** `log.user.role` was always `undefined` because Spatie stores roles in a pivot table — the raw `AuditLog::with('user')` serialization doesn't include the role field. The `DashboardController::auditLogs` method needs to be updated to eager-load roles and inject `role` on each user (see backend fix needed below).

**How to see it:** `git checkout redesign/new-ui` then `cd web && npm run dev` → localhost:5173.

---

## What was just done (uncommitted — staff rejection + project memory doc)

- **Staff rejection now revokes the active session.** `StaffRequestController::reject` deletes the
  staff user's tokens, so a rejected staff member is kicked immediately (previously the login gate
  only blocked *future* logins, leaving an existing token valid for ≤24h). New regression test
  `tests/Feature/StaffRequestTest.php`. **48 feature tests pass.**
- **New `Retain_Memory.md`** at repo root — durable project knowledge (architecture, features,
  standards, security, file map, setup, decisions). `CLAUDE.md` now points to it + this file.
- (Historical: at the time this was written no medicines catalog existed. **It now does** — the
  PNF generics catalog + `MedicineCombobox` shipped on `main` and is live after this merge.)

## What was just done (Sprint 5.4 — commit `8a4a9d0`)

- Patient PII (`address`, `contact`, `philhealth_no`) **encrypted at rest** + `philhealth_no_hash`
  blind index; uniqueness validation rewired to the hash.
- `PatientEncryptionTest` + `WebhookTest` (PayMongo). **All 44 feature tests pass.**
- Sanctum **24h token expiry** (`SANCTUM_TOKEN_EXPIRATION`).
- `api/SECURITY.md` — controls + ISO 27001/27701/RA 10173 mapping.
- Fixes: `RegisterRequest` role `it_admin → staff`; `StorePatientRequest` password policy tightened.
- `.env.example` updated to MySQL.

## What's next (pick up here)

1. **Continue UI redesign on `redesign/new-ui`** — follow-up pass: per-page border style cleanup
   (`style={{ border: ... }}`), individual page layout polish, form inner padding review in the new
   AuthLayout card. When done, merge to main.
2. **Finish PayMongo** — "Pay Now" button → hosted page redirect + admin manual-payment fallback
   (webhook + signature verification already done/tested).
3. Phase 6 (deployment) later: OWASP ZAP scan on staging, HTTPS, httpOnly-cookie auth migration.

## Development plan — Medicine catalog + generic-name combobox (assigned to the other dev)

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
- **Tests:** `php artisan test` — uses in-memory **SQLite**, so **no DB server needed**. Expect 44 passing.
- **Run API against real DB:** start your local MySQL/MariaDB, then `php artisan migrate` (and
  `php artisan db:seed` for demo data), then `php artisan serve`.
- **Frontend:** in `web/`, `npm install` then `npm run dev`.

## Open caveats

- The earlier session briefly started a second DB server (XAMPP MariaDB) that may hold a
  partially-applied encryption migration. The **live Laragon MySQL DB is clean**. If you ever point
  the app at XAMPP MariaDB, run `php artisan migrate:status` there first.
