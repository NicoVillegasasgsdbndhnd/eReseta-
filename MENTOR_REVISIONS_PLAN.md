# Mentor Review — Revisions Development Plan

> Mini development plan organizing the mentor's review notes (system walkthrough).
> Grouped into themed epics, phased by dependency. Each note from the review is captured
> below. **Owner:** Mark + Nico (relay). **Created:** 2026-06-18.
>
> Status legend: `[ ]` not started · `[~]` in progress · `[x]` done
> Priority: 🔴 high (mentor blocker) · 🟡 medium · 🟢 nice-to-have

---

## ⚠️ Decisions to confirm before starting (conflicts / ambiguities in the notes)

1. **Staff role on consultation records — RESOLVED by the later correction.**
   - Early note said "staff can type consultation record, no prescription."
   - **Correction (this wins):** *"staff cannot do consultation records, only view records; staff can only edit patient profile."*
   - **Final rule:** `staff` = view all patient records + edit patient profile. **No consultation, no prescription.** Only `doctor` writes consultation notes and prescriptions.

2. **Lab/diagnostic test orders (xray, etc.) — RESOLVED by research spike (see Appendix A).**
   **Decision: build a separate `DiagnosticOrder` entity, structurally parallel to `Prescription`. Do NOT reuse the prescription pipeline.** Rationale and schema in **Appendix A** + **Phase 4**.

3. **"Served" rename** — pick the clinical term (e.g. **"Completed"**, **"Consulted"**, or **"Seen"**). Confirm with mentor. Used in appointment status + consultation flow.

4. **Patient ID format** — confirm the "proper simple ID" scheme (e.g. `DEAMHI-2026-00001` or a short numeric). See Epic F.

---

## Phase 1 — Appointment System Cleanup 🔴 — ✅ DONE (2026-06-18)
*Files: `web/src/features/appointments/*`, `api/app/Http/Controllers/AppointmentController.php`, `appointments` migration, `Appointment` model*

> **Implemented & verified (83 backend tests pass, `tsc -b` clean, `vite build` green).** All of
> Epics A–F below are done. New backend tests: `AppointmentTest` (+staff confirm, double-booking,
> patient cancel/rebook, booking email), `DoctorLeaveTest`. New: `doctor_leaves` table +
> `DoctorLeaveController`, `AppointmentBooked` notification, `AppointmentCalendar.tsx`. Decisions
> #3 (rename "served") and the patient-ID format remain open and were NOT forced here.

### A. Appointment types — simplify
- [ ] 🔴 **Remove `emergency`** type entirely (migration enum + frontend type selector).
- [ ] 🔴 **Remove `follow_up` from the patient-facing booking.** Patients can only book **consultation**. Doctor/staff create follow-ups *for* the patient (scheduled during the consultation — doctor tells the patient the follow-up date).
- [ ] 🔴 **Patient-side "type" is automatic** = `consultation` (no dropdown shown to patient, or locked/auto-selected).
- [ ] 🟡 Fix the appointment-detail **type display** on the patient side (currently wrong/needs cleanup).
- **Acceptance:** patient booking shows no emergency/follow-up; type is auto `consultation`; doctor/staff can still create a `follow_up` for a patient.

### B. Booking flow fixes
- [ ] 🔴 **Auto-reserve on booking** — booking should automatically reserve the slot (no manual reserve step).
- [ ] 🔴 **Bug: confirming a pending booking doesn't work** — confirming a `scheduled`/pending appointment currently fails. Investigate `AppointmentController` confirm action + frontend.
- [ ] 🟡 **"Book appointment check — remove"** — remove the extra checkbox/confirmation step in the booking form *(clarify exactly which control with mentor)*.
- [ ] 🟡 **Doctor category on booking** — let patient filter/choose by **doctor specialization/category** when booking (Doctor model already has `specialization`).
- [ ] 🟡 **Email booking announcement** — send an email confirmation when an appointment is booked/confirmed (Laravel Mail/Notification; `MAIL_MAILER` currently `log`).
- **Acceptance:** booking auto-reserves; confirm-pending works end-to-end; specialization filter present; confirmation email sent.

### C. Patient cancellation & rebooking 🔴
- [ ] 🔴 **Patient can cancel their own appointment** from the patient account.
- [ ] 🔴 On cancel, **prompt: "Reschedule/Rebook" vs "Fully cancel."**
  - Rebook → open booking flow (reschedule existing).
  - Fully cancel → set status `cancelled`.
- **Acceptance:** patient cancel button works; modal offers rebook or full cancel; status updates correctly.

### D. Doctor availability / leave
- [ ] 🔴 **Doctor or secretary (staff) can "X out" a specific date** (doctor on leave) → that date is **blocked** for bookings. (See existing `DoctorAvailabilityPage.tsx`.)
- **Acceptance:** blocked dates cannot be booked by patients and are visually marked.

### E. Doctor appointments — calendar view
- [ ] 🔴 **Calendar layout** for doctor appointments: click a date → see patients booked that day.
- [ ] 🔴 **Count badge per date** in the calendar (number of appointments that day).
- **Acceptance:** doctor sees a month calendar with per-day counts; clicking a day lists that day's patients.

### F. Lifecycle automation
- [ ] 🟡 **Once a consultation is done (served/completed), auto-remove the appointment from the appointments tab** (move it out of the active appointment list — it now lives in the patient record).
- **Acceptance:** completed appointments disappear from the active appointments list.

---

## Phase 2 — Consultation & Patient Records Restructure 🔴 — 🟢 MOSTLY DONE (2026-06-18)
*Files: `web/src/features/consultations/*`, `web/src/features/patients/*`, `api/app/Http/Controllers/PatientRecordController.php`, `PrescriptionController.php`, `PatientRecord` model*

> **Done & verified (86 backend tests pass, `tsc -b` clean, `vite build` green):** Epics **G, H, I,
> J, K, L, M**. The prescription form is merged into the consultation screen (optional, doctor-only);
> records are cross-view + grouped per visit (notes + Rx together); a served record is editable by a
> doctor; new records are gated to today's confirmed appointment with auto-filled visit date; bigger
> textareas. **Remaining:** the in-consultation **"order a test"** button (part of Epic I) depends on
> Phase 4's `DiagnosticOrder`; **Epic N (patient-ID format)** and the **"served" rename (#3)** await
> mentor decisions. **Decided:** staff keep clinical data **masked** (PII-minimization).

### G. Consultation record creation rules
- [ ] 🔴 **Doctor cannot start a new record unless it's the appointment's day and the time is valid** (gate "start consultation" by today + correct time window).
- [ ] 🔴 **Auto-fill on new record** — selecting the patient auto-populates patient data **and** date/time (no manual retyping).
- [ ] 🔴 **Rename "served"** to a proper clinical term (see Decision #3).
- **Acceptance:** start-record button disabled when not today/valid time; patient + datetime auto-filled; new term shown everywhere "served" appeared.

### H. Merge Prescription INTO the consultation 🔴
- [ ] 🔴 **Prescription is no longer a separate tab** — it lives **inside the consultation note-taking screen**, so the doctor can type notes *and* prescribe in the same flow while talking to the patient.
- [ ] 🔴 Within the consultation, show **prescription status** if a prescription already exists.
- [ ] 🔴 **Role gating:** only `doctor` sees/uses the prescription section; `staff` does **not** (per Decision #1).
- **Acceptance:** single consultation screen with an embedded prescription section (doctor-only); existing prescription status visible.

### I. "Serve/Complete" gating + optional outputs
- [ ] 🔴 Before clicking **Serve/Complete**, the consultation offers: **Prescription** button **and** **Order Test** button (Epic H feature).
- [ ] 🔴 If **no prescription and no test** are needed → consultation can be saved with **notes only**.
- **Acceptance:** doctor can complete with (a) notes only, (b) notes + prescription, (c) notes + test order, or any combination.

### J. Bigger typeable areas
- [ ] 🟡 **Consultation layout** — make typeable fields proper **textareas** (multi-line, larger), not single-line inputs (esp. notes).
- **Acceptance:** notes and similar fields are roomy textareas.

### K. Served record stays editable
- [ ] 🟡 **After a record is served/completed, the consultation form is still accessible and editable by the doctor.**
- **Acceptance:** doctor can reopen and edit a completed consultation; staff can view only.

### L. Patient record viewing & cross-view 🔴
- [ ] 🔴 **Click patient name → open patient record** (from doctor side AND patient side).
- [ ] 🔴 **Patient History tab** — doctor/staff can **search** patients by name and open the record.
- [ ] 🔴 **Patient History tab on the patient side** too (patient views their own history).
- [ ] 🔴 **Cross-view records (all non-patient accounts):** one unified **"Patient Records"** tab — searchable; every doctor/staff can view **all** patient records. Search name → click → opens that patient's record.
- **Role gating:** doctor = view + edit consultation/prescription; staff = **view only** + edit patient profile; patient = own records only.
- **Acceptance:** unified searchable records tab for doctor/staff; clicking a name opens the full record; patient sees own history.

### M. Cleaner, organized record layout 🔴
- [ ] 🔴 When opening a patient record, **group each visit together**: consultation notes + the prescription/procedure (or "notes only" if none) shown **together per visit**, easy to read.
- [ ] 🟡 Make the record **more efficient/organized** after the consultation+test tabs land.
- **Acceptance:** each visit is one tidy block (notes + Rx/procedure together), chronological.

### N. Proper patient ID
- [ ] 🟡 **Simple, proper patient ID** scheme (see Decision #4) — generated and shown on the record.
- **Acceptance:** every patient has a clean human-readable ID displayed on their record.

---

## Phase 3 — Prescription UX + Hospital Rx + Doctor Profile 🟡 — 🟡 PARTIAL (2026-06-18)
*Files: `web/src/features/prescriptions/NewPrescriptionPage.tsx`, `PrescriptionDetailPage.tsx` (`DeamhiPrescriptionCard`), `web/src/features/medicines/*`, `Medicine` model + migration, `web/src/features/admin/UsersPage.tsx`, `Doctor` model*

> **Done & verified (88 backend tests pass, `tsc -b` clean, `vite build` green):** Epics **P** (Hospital
> Rx is the default tab + Print button) and **Q** (doctor `ptr_no`/`s2_license`/`signature` captured at
> admin account creation, rendered on the Rx). **Deferred:** Epic **O** (per-medicine dosage dropdowns,
> brand names, auto-compute qty↔frequency↔duration) — needs structured numeric dosing fields + medicine
> catalog brand/dose data the current free-text items lack; it's its own schema + data follow-up.

### O. Smarter medicine dosing
- [ ] 🟡 **Dosage as a dropdown per medicine** — only the valid dosage amounts for that medicine are choosable; **allow manual override** if a specific list exists, otherwise typable.
- [ ] 🟡 **Brand name per medicine** — add `brand_name` to the catalog; offer brand as a **dosage-type option** so picking the brand **auto-fills the dosage**.
- [ ] 🟡 **Quantity-unit-aware amounts** — when a form is chosen (e.g. `tablet`), only the relevant amount options are choosable; dosage amount stays typable (dropdown when specific values exist, manual still allowed).
- [ ] 🟡 **Auto-compute quantity/frequency/duration** — when **any 2 of the 3** are entered, **auto-fill the 3rd** (e.g. qty `12` + duration `4 weeks` → frequency computed; works in any direction). For efficiency.
- **Acceptance:** dosage dropdowns per medicine with manual override; brand auto-fills dosage; entering 2 of {qty, frequency, duration} fills the 3rd.
- **Note:** builds on the existing structured `quantity_unit` / frequency / duration work — keep it **additive** and don't break current free-text fallback.

### P. Hospital Rx presentation
- [ ] 🟡 **After prescribing, show the Hospital Rx FIRST** (before the Details tab) on the prescription detail screen.
- [ ] 🟡 **Hospital Rx pulls the prescribing doctor's** signature / license no. / details into the Rx blank.
- [ ] 🟡 **Print button** on the Hospital Rx.
- **Acceptance:** Rx tab is default after prescribing; shows that doctor's signature + license; printable.

### Q. Doctor profile data (admin-created)
- [ ] 🟡 **When admin creates a doctor account**, capture **license no., digital signature, and other personal details** needed on the prescription.
- [ ] 🟡 These fields feed the **Hospital Rx** (Epic P).
- **Acceptance:** admin doctor-creation form includes license + signature upload + details; they render on that doctor's Rx.

---

## Phase 4 — Lab / Diagnostic Test Orders 🟡
*Research spike DONE — see Appendix A. Build a dedicated `DiagnosticOrder` entity (parallel to `Prescription`), kept **additive** so the prescription/pharmacy/blockchain flow is untouched.*

### R. ~~Research spike~~ ✅ DONE — see **Appendix A** for the decision + schema.

### S. Diagnostic order — backend (NEW, additive)
- [ ] 🔴 Migration `create_diagnostic_tests_table` (admin-managed catalog): `id, name, category (imaging/laboratory/other), is_available (bool default true), timestamps`. Mirrors the `medicines` + `is_available` pattern.
- [ ] 🔴 Migration `create_diagnostic_orders_table`: `id, reference_no, patient_record_id (FK), doctor_id (FK), ordered_at, status (ordered/completed/cancelled, default ordered), notes (nullable), timestamps`.
- [ ] 🔴 Migration `create_diagnostic_order_items_table`: `id, diagnostic_order_id (FK), diagnostic_test_id (nullable FK to catalog), test_name (string — free-text fallback, mirrors `drug_name`), clinical_reason/instructions (nullable), timestamps`.
- [ ] 🔴 Models `DiagnosticTest`, `DiagnosticOrder` (belongsTo `PatientRecord` + `Doctor`, hasMany items), `DiagnosticOrderItem`.
- [ ] 🔴 `DiagnosticOrderController` (doctor-only `store`, role-gated like `PrescriptionController::store`); `DiagnosticTestController` (`index` searchable + `updateAvailability` admin-only — copy `MedicineController`).
- [ ] 🟡 Resources + Form Request (validate items, nullable catalog FK). **No** verify/dispense state machine, **no** pharmacist routing, **no** blockchain write (keep it off-chain for MVP).
- **Acceptance:** doctor can create a diagnostic order tied to a consultation; new endpoints don't touch prescription tests (all current tests stay green).

### T. Diagnostic order — frontend + admin catalog
- [ ] 🔴 **"Order Test" section inside the consultation screen** (alongside the prescription section, doctor-only) — searchable test combobox sourced from the catalog (`available_only`), like `MedicineCombobox`.
- [ ] 🟡 **Admin test catalog page** — admin can **add/remove/toggle availability** of tests (mirror `MedicineAvailabilityPage`). If a test (xray, etc.) isn't available in the hospital, admin hides it so it won't appear in the doctor's dropdown.
- [ ] 🟡 Diagnostic orders render in the **per-visit grouped record** (Epic M) next to the prescription, and as their own **printable order slip** (separate from the medication Hospital Rx).
- **Acceptance:** doctor orders tests from the consultation; admin manages the catalog/availability; orders show grouped per visit and print as an order slip.

---

## Appendix A — Research spike: where do lab/xray/diagnostic orders belong?

**Question (mentor + Mark):** when a doctor wants a patient to get an xray or other test, is that a kind of prescription, or something else?

**What the current prescription pipeline actually is (code-grounded):**
- `Prescription` belongs to a `PatientRecord` (the consultation) + `Doctor`; has many `PrescriptionItem` + `PrescriptionEvent`.
- Lifecycle is **pharmacy-dispensing-shaped**: `Issued → Verified → Dispensed`. **`verify` and `dispense` are pharmacist-only actions** (`PrescriptionController`), and each transition queues a **blockchain ledger write** via chaincode that is prescription-specific (`PrescriptionService` → `RecordPrescriptionOnLedger`).
- `PrescriptionItem` fields are drug-shaped: `dosage, quantity, frequency, duration, instructions`.

**Options considered:**
| Option | Verdict |
|--------|---------|
| 1. New prescription **type** (reuse pipeline) | ❌ Wrong lifecycle (verify/dispense are pharmacist/medication concepts), would dump lab orders into the **pharmacist verify queue**, pollute the prescription-specific **blockchain chaincode**, and the drug-shaped item fields don't fit a test. |
| 2. **Separate `DiagnosticOrder` entity** (parallel to Prescription) | ✅ **Chosen.** Clean separation; own simple lifecycle (Ordered → Completed); different actor (radiology/lab, not pharmacist); same familiar shape (belongs to PatientRecord + Doctor, has items) so it groups naturally per-visit and reuses the `Medicine`/`is_available` admin pattern for the catalog. Fully **additive** — doesn't touch the existing prescription/pharmacy/blockchain flow (project guardrail). |
| 3. Item-type **inside the consultation** | ❌ Conflates two documents/lifecycles; can't track test status/results cleanly; muddies the medication Hospital Rx. |

**Decision:** **Option 2.** A diagnostic/test order is **its own document**, not a prescription. It is **off-chain** for the MVP (blockchain is reserved for the medication prescription lifecycle per `CLAUDE.md`). It mirrors the prescription's structure so it slots into the per-visit record (Epic M) and the in-consultation ordering UI (Epic H/I), and the admin-managed availability catalog mirrors the existing medicine catalog (Epic T).

**Naming to confirm with mentor:** `DiagnosticOrder` / `DiagnosticTest` (alternatives: `TestOrder`, `ProcedureOrder`, `LabRequest`). Status set kept minimal for MVP: `ordered → completed → cancelled` (a `resulted` state + results upload can be a later enhancement).

---

## Suggested sequencing

| Order | Epic(s) | Why first |
|-------|---------|-----------|
| 1 | A, B, C, D, E (Phase 1) | Mentor blockers, mostly self-contained appointment work |
| 2 | G, H, I, L, M (Phase 2) | Core consultation+records restructure (research spike R already done — see Appendix A) |
| 3 | O, P, Q (Phase 3) | Prescription/Rx polish |
| 4 | S, T (Phase 4) | Diagnostic orders (`DiagnosticOrder` entity — schema decided in Appendix A) |
| 5 | F, J, K, N | Smaller polish, fold in opportunistically |

## Backward-compat guardrails (project rule)
- Keep changes **additive** where possible; don't break existing tests (`php artisan test`).
- New DB columns **nullable**; preserve `drug_name` free-text fallback in prescriptions.
- Update `HANDOFF.md` before ending each session; commit + push for the relay.
