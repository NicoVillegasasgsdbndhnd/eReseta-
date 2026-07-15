# eReseta+ — "Show Me The Code" Map (Sir Jondel comments)

For each comment: **① Say it** (plain words) → **② Open this file** → **③ Point at this line.**
Line numbers verified against the current `main`. If asked "where in the code," open the file and
read the one line out loud — that's the whole move.

---

## 1. Email confirmation should contain reference number

**① Say:** "Every appointment gets a unique reference like `APT-2026-0001`. We generate it in the
**model itself**, not the controller — so it's impossible to create an appointment without one,
whatever path it came from."

**② Open:** `api/app/Models/Appointment.php`
**③ Point at:**
- **line 31–32** — `static::creating(...) { $appointment->reference_no ??= static::generateReferenceNo(); }`
  → "This hook fires on **every** appointment the moment it's created."
- **line 36** — `generateReferenceNo()` → "It reads the highest reference already issued and adds one."
- Then `api/app/Notifications/AppointmentBooked.php` **line 36** — `->line('Reference No.: ' ...)`
  → "and here it goes into the confirmation email."

**Likely follow-up — "what about old appointments?"** → "They were backfilled by a migration —
`2026_07_14_000001_backfill_appointment_reference_no.php`. Zero are blank now."

---

## 2. Temporary password expiration should be sent to user

**① Say:** "We removed temporary passwords entirely. New patients get an emailed **activation link**
that expires in **7 days**, and the email states the expiry. The patient sets their own password."

**② Open:** `api/config/auth.php`
**③ Point at:**
- **line 104** — the `'activations'` broker → "This is a separate link type with a **7-day** expiry
  (10080 minutes), kept apart from password reset, which stays at 60 minutes."
- Then `api/app/Notifications/PatientAccountActivation.php` **line 34** —
  `"This link is valid for {$days} days and can be used only once."` → "the email says the expiry."
- Then `api/app/Http/Controllers/PatientController.php` **line 93** — `Password::broker('activations')->createToken($user)`
  → "and this is where we send the link instead of a temp password."

**Why it's better (say it):** "A temp password is a plaintext credential sitting in an inbox that
people never change. A one-time link that expires is safer."

---

## 3. Doctor availability — leave per hour, not whole day

**① Say:** "A doctor can now block **specific hours** — say 1 to 3 PM — instead of the whole day,
plus a one-click **Leave whole month** button. Those hours disappear from the patient's booking slots."

**② Open:** `api/app/Http/Controllers/DoctorLeaveController.php`
**③ Point at:**
- **line 32–33** — `'start_time' => [...], 'end_time' => [...'after:start_time']` → "leave now accepts
  a start and end time."
- **line 38** — `if (empty($validated['start_time']))` → "if no time is given, it's still a whole-day
  leave — backward compatible."
- **line 57** — `storeMonth(...)` → "this is the Leave-whole-month button."
- UI: `web/src/features/appointments/DoctorAvailabilityPage.tsx` (the hourly form + month button).

---

## 4. Report should contain prescription number

**① Say:** "Already in place — the prescription reference number is the **first column** of the report
and it's in the PDF export." *(Then just show it on screen.)*

**② Open:** `web/src/features/reports/ReportsPage.tsx`
**③ Point at:**
- **line 232** — `<td ...>{rx.reference_no}</td>` → "first column of every row."
- **line 82** — the PDF export row starts with `rx.reference_no` → "and in the exported PDF."
- Backend: `api/app/Http/Controllers/ReportController.php` **line 73** — `'reference_no' => $rx->reference_no`.

---

## 5. No backup options if blockchain (goes down)

**① Say:** "Three layers, so a blockchain outage never causes data loss or blocks care."

**② Open, in order:**

**Layer 1 — graceful degradation.** `api/app/Jobs/RecordPrescriptionOnLedger.php`
- **line 26** — `class RecordPrescriptionOnLedger implements ShouldQueue` → "the ledger write is a
  **background job**, not inline. If the chain is down, the doctor's action still completes — MariaDB
  is the source of truth."
- **line 63** — `if ($event === null || $event->blockchain_tx_id !== null)` → "and it's idempotent:
  an already-anchored prescription is skipped, never written twice."

**Layer 2 — self-healing catch-up.** `api/app/Console/Commands/ReconcileLedger.php`
- **line 37** — `PrescriptionEvent::whereNull('blockchain_tx_id')` → "anything not yet on-chain has a
  NULL tx id; this command finds them."
- `api/routes/console.php` **line 13–14** — `Schedule::command('blockchain:reconcile')->everyFiveMinutes()`
  → "and it re-syncs them automatically every 5 minutes once the chain is back."

**Layer 3 — database backups.** `deploy/scripts/backup-db.sh`
- **line 44** — `mysqldump ... | gzip` → "nightly compressed dump, 14-day retention (line 7)."

**Close with:** "So during an outage the system runs normally and auto-reconciles on recovery — no
data loss, no manual intervention."

---

## 6. Do not allow duplicate users or password

**① Say (users):** "Duplicate **accounts** are impossible — email is unique at the **database** level,
so it holds even if the app is bypassed."

**② Open:** the `create_users_table` migration → **line 17** — `$table->string('email')->unique();`
→ "the `unique` constraint is on the database column, not just app validation."

**① Say (passwords):** "We block duplicate passwords at the panel's request. When a password is set,
we check it against every existing user's bcrypt hash; if it matches, we reject it with a **generic**
message — *'please choose a different password'* — so we never reveal *whose* password it is. We
deliberately store **no** extra password fingerprint, so our hashing isn't weakened. We note in the
paper that the standard security guidance is actually *against* this — salted hashing plus the risk of
leaking that a password is 'taken' — which is exactly why we use a generic message and no fingerprint."

**② Open:** `api/app/Rules/UniquePasswordAcrossUsers.php` → the `Hash::check` loop and the generic
`'Please choose a different password.'` message. Also `api/app/Models/User.php` **line 37** — password
hidden from API + `hashed` cast.

> Honest framing wins here: *"we implemented what the panel asked, and we understood the trade-off
> well enough to implement it the least-harmful way."* If a different examiner pushes back, that
> nuance is your answer.

---

## 7. DB password should be renewed automatically

**① Say:** "A manual password rarely gets changed, so a leak lives forever. We automated it — a
scheduled task renews the database password **every month**. The clever part: **MySQL 8 lets an
account hold two valid passwords at once**, so we set the new one while the old still works, switch
over, verify, then drop the old — **zero downtime**. If anything fails, it rolls back automatically."

**② Open:** `deploy/scripts/rotate-db-password.sh`
**③ Point at:**
- **line 228** — `ALTER USER ... IDENTIFIED BY '...' RETAIN CURRENT PASSWORD` → "this is the dual
  password — new and old both valid during the swap."
- **line 108** — `rollback()` → "any failure restores the old password so the site keeps serving."
- Schedule: `deploy/systemd/ereseta-db-rotate.timer` **line 7** — `OnCalendar=*-*-01 03:30:00`
  → "runs on the 1st of each month, after the nightly backup."

**Honest status:** "Written and tested; the final verified run on the production server is the last
step before we switch the monthly schedule on."

---

## 8. No pen test on blockchain / can be modified on backend

**① Say:** "We ran a tamper-evidence test. If an attacker edits a prescription directly in MySQL,
the **ledger still shows the original** — MySQL ≠ ledger, so the tampering is **detectable**."

**② Show:** the before/after `blockchain/_prove.sh` output (see `BLOCKCHAIN_TAMPER_TEST.md`).
No delete/overwrite exists in the chaincode → history is append-only.

**Honest caveat:** "Single-org network for academic scope, so it's tamper-**evident**, not
tamper-**proof**; and the reconciliation is currently manual. Multi-org is future work." *(Nico's area.)*

---

## 9. Blockchain includes patient records

**① Say:** "By design, **no patient records or PII go on-chain** — that's data minimization under
**RA 10173**. We store only the prescription reference, **numeric IDs**, timestamps, and the drug
list. Patient identity stays in MySQL, access-controlled by role."

**② Open:** `api/app/Services/FabricGatewayService.php`
**③ Point at:**
- **line 34–38** — the payload: `prescriptionId`, `patientId` (a **number**, `patient_record_id`),
  `doctorId`, `drugList` → "no name, no contact, no address — just IDs."
- Then `blockchain/chaincode/prescription/prescription.go` **line 16–22** — the stored struct
  → "this is literally everything the ledger holds. No PII field exists."

**If he meant it as a request ("it should"):** "We could anchor records — but only as a **hash**, so
the chain proves a record wasn't altered without storing the record itself."

---

### The rule for all of them
Open the file, point at the **one line**, read it, stop. Don't scroll around hunting — that reads as
"I don't know where it is." Knowing the exact line is what shows it's really your code.
