# eReseta+ — Panel Comment → Fix → What to Say

> One row per panel comment. **Left = what they said. Right = the sentence you say.**
> Formula for every answer: **"You said X → we did Y → here it is in the code."**
> (Sir Jondel item **F**, DB password auto-rotation, is covered separately.)

---

## 🗣️ Sir ELI — Round 1

| # | His comment | What we changed | Where in the code | **Say this** |
|---|-------------|-----------------|-------------------|--------------|
| **1** | No validation — you can type numbers/symbols in the name | Whitelist regex on the booking name: letters, space, `.` `'` `-` only. Enforced **on the server** and mirrored in the form for instant feedback. `max` tightened to 100. | `StoreAppointmentRequestRequest.php` (`regex:/^[\p{L}\s.'-]+$/u`) · `BookPage.tsx` (Zod) | "We now whitelist what a name may contain instead of blocking bad characters. It allows José, O'Brien, Anne-Marie, and Jr. — and rejects digits and symbols. The rule is enforced **server-side**; the browser check is only for user feedback, because a client check can always be bypassed." |
| **2** | No verification when booking — anyone can use a fake email | **Email OTP.** Booking sends a 6-digit code to the address; the request is only created after the code is verified. Code is **hashed** in cache, **10-min** expiry, **single-use**, rate-limited. | `PublicController.php` (`sendAppointmentOtp`) · `AppointmentBookingOtp.php` | "You can't book unless you prove you own the email. We send a 6-digit code, store it **hashed** with a 10-minute expiry, and it's single-use and rate-limited. That kills spam bookings from dummy emails." |
| **3** | Why not 24/7? Why shift to manual? | **No code change — this is a real-world constraint, not a system limit.** | — | "The **system** is online 24/7 — you can book at 2 AM. The **clinic** physically operates 8-5, so the available **slots** are within clinic hours. That's the hospital's constraint, not the software's. Emergencies aren't booked online; they go to the ER." |
| **4** | No copy of the booking / invoice | **Email receipt** on submission (with the reference number) + a **Print** button on the confirmation screen. | `AppointmentRequestReceived.php` · `BookPage.tsx` | "The patient now gets two copies: an **email receipt** with the reference number, and a **printable** copy on screen. So they always have proof of the booking." |
| **5** | The chief complaint has no proper label | Replaced the vague free-text box with a properly **labeled "Chief complaint" dropdown** of standard options. | `BookPage.tsx` | "It's now explicitly labeled **Chief complaint** and it's a dropdown of standard complaints instead of free text — so it's clear to the patient and gives the doctor clean, structured data." |
| **6** | Why a temporary password at the start? | **Removed temp passwords entirely.** New patients get an emailed **activation link** and set their own password. | `PatientAccountActivation.php` · `PatientController.php` | "You were right — a temporary password is a **plaintext password sitting in an inbox**, and most people never change it. Now we email a **one-time activation link** and the patient sets their own password. Staff never sees it, and it's never transmitted." |
| **7** | Confidentiality needs a legal basis | **Paper, not code.** | — | "Our confidentiality controls are grounded in **RA 10173** (Data Privacy Act), **NPC** circulars, **ISO/IEC 27701**, and DOH policy — each control maps to a specific requirement: consent gate, audit trail, encryption, break-glass." |
| **8** | Is the e-signature approved / accepted by pharmacies? | **Answer, not code.** | — | "Electronic signatures are legally valid under **RA 8792** (E-Commerce Act), and the DOH has issued advisories allowing e-prescriptions. Ours carries the doctor's **PRC license**, their e-signature, and a **blockchain-verifiable reference** — which makes it *stronger* than paper, because the pharmacy can prove it wasn't altered." |
| **10** | What if the blockchain falls? | **Answer, not code** (this is the existing design). | `RecordPrescriptionOnLedger` (queued job) | "Nothing stops. The ledger write is an **async, retried background job** — the **database is the source of truth**, and no clinical action ever waits on the blockchain. Fabric auto-restarts via systemd, and the anchoring catches up when it's back." |

---

## 🗣️ Sir Jondel — Round 2

| # | His comment | What we changed | Where in the code | **Say this** |
|---|-------------|-----------------|-------------------|--------------|
| **A** | The confirmation email should have a reference number | Every appointment now gets a unique **`APT-YYYY-NNNN`**, generated in the model's `creating` hook, and it appears in the email and the API. | `Appointment.php` (`booted()` / `generateReferenceNo()`) · `AppointmentBooked.php` | "Every appointment now carries a unique reference like **APT-2026-0007**. We generate it in the **model hook**, not in the controller — which means it's impossible to create an appointment without one, no matter which path it came from: online booking, staff approval, or a follow-up." |
| **B** | The activation link should expire (about a week) | Added a separate **`activations`** password broker with a **7-day** expiry, kept apart from the normal reset flow. | `config/auth.php` · `AuthController.php` | "The activation link expires in **7 days**. We deliberately kept it **separate** from the password-reset broker: a *reset* link still dies in **60 minutes** because that's a live account under attack, while a *new patient* needs a realistic window to open their email. Two different risks, two different lifetimes." |
| **C** | Leave should be per-hour, not whole day + a "leave whole month" button | Doctors can now block **specific hours**; a null start/end still means a whole-day leave (backward compatible). Added a **"Leave whole month"** button. Partially-blocked hours are removed from the patient's bookable slots. | `DoctorLeaveController.php` · `DoctorLeave.php` · `DoctorAvailabilityPage.tsx` | "A doctor can now block **specific hours** — say 1 PM to 3 PM — instead of losing the entire day, and there's a one-click **Leave whole month** button for long absences. Those blocked hours disappear from the patient's booking slots automatically." |
| **D** | The report should contain the prescription number | **Already there** — it's the first column of the admin report and in the PDF export. | `ReportsPage.tsx:232` · `ReportController.php:73` | "That's already in place — the prescription reference number is the **first column** of the report and it's included in the PDF export." *(Show it on screen.)* |
| **E** | No duplicate users / duplicate passwords | **Users: already enforced** — `email` is `unique` at the database level. **Passwords: deliberately NOT de-duplicated.** | `create_users_table` migration (`->unique()`) | "Duplicate **accounts** are already impossible — email is `unique` at the **database** level, so it holds even if the app is bypassed. Duplicate **passwords** we deliberately do **not** block, and that's a security decision: passwords are stored as **salted bcrypt hashes**, so two identical passwords produce *different* hashes — we'd have to compare against every user's password to detect it. And telling someone *'that password is already taken'* would **leak another user's password**. So blocking it would make the system *less* secure, not more." |
| **G** | Do a pentest on the blockchain / can the backend be modified? | Assigned to **Nico**. | — | "That's being covered — [Nico's status]." |

---

## 🎯 The 3 answers that win points

These are the ones where the *reasoning* matters more than the fix. Learn these cold.

1. **E — refusing to de-duplicate passwords.** The panel expects "yes sir, we fixed it." The right answer is *"we deliberately didn't, and here's why it would have made the system weaker."* Salted bcrypt + the information leak. **This shows you understand hashing, not just that you used it.**

2. **#6 — why the temp password was actually a vulnerability.** Not "we changed it because you asked" but *"a temp password is a plaintext credential sitting in an inbox that most users never change."*

3. **#1 — server-side vs client-side validation.** Always add: *"the browser check is only for feedback — the server rule is the real control, because a client check can be bypassed with DevTools."* You already **proved** this in **PT02**.

---

## ⚠️ If they push back

| They say | You say |
|----------|---------|
| "Validation is only in the browser?" | "No — the regex is in the **Form Request** on the server. The browser copy is only for instant feedback." |
| "The OTP can be brute-forced." | "It's rate-limited, single-use, expires in 10 minutes, and is stored **hashed** — not in plaintext." |
| "Someone could still fake a booking." | "They'd need to control the email address. And every booking is tied to a reference number and an audit entry." |
| "Reference numbers could collide." | "It's unique at the **database** level — a duplicate is rejected by the DB, not just by the app." |
