# eReseta+ — User Manual

**System:** eReseta+ — Healthcare Appointment Booking and Patient Record Management System with
Digital Prescription using Hyperledger Fabric
**Institution:** Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI)
**System URL:** `https://deamhi.ph`

---

## 1. Getting Started

### 1.1 User roles
| Role | Who it is | What they do |
|------|-----------|--------------|
| **Patient** | Hospital patients | Book appointments, view own records and prescriptions, manage privacy |
| **Doctor** | Physicians | Consultations, patient records, issue prescriptions, manage own schedule |
| **Secretary / Staff** | Doctors' secretaries | Approve booking requests, register patients, manage the doctor's calendar |
| **Pharmacist** | Hospital pharmacy | Verify and dispense prescriptions, maintain medicine availability |
| **Administrator** | System administrators | Manage users, reports, audit logs, compliance, blockchain monitoring |

### 1.2 Signing in
1. Open **https://deamhi.ph** and click **Sign In**.
2. Enter your email and password, then click **Sign In**.
3. **First-time users** are asked to accept the **Terms & Privacy Agreement** before continuing.

> **Forgot your password?** Click *Forgot password* on the sign-in page. A reset link is emailed to
> you and is valid for **60 minutes**.

### 1.3 Activating a new patient account
New patients do **not** receive a password. Instead:
1. Staff registers the patient, and the system emails an **activation link**.
2. The link is valid for **48 hours** and can be used **once**.
3. Click **Set Up My Password** in the email and choose your own password.
4. You are then asked to **complete your profile** (home address, emergency contact, allergies)
   before using the system.

> If the link expires, you will receive an email with a **Request a New Activation Link** button.
> Clicking it notifies the clinic staff, who will send you a fresh link.

---

## 2. Patient Guide

### 2.1 Booking an appointment (no account needed)
1. Go to **https://deamhi.ph** and click **Book Appointment**.
2. **Choose a doctor** — filter by specialization if you wish.
3. **Pick a date and time** from the calendar. Unavailable slots are hidden; days the doctor is on
   leave are greyed out.
4. **Fill in your details** — first name, middle initial, last name, suffix, date of birth, sex,
   mobile number and email.
   - The name fields accept letters only; the mobile field accepts numbers only.
5. **Verify your email** — click **Send code**. A 6-digit code is emailed to you.
   - The code is valid for **2 minutes**. You may request another after a **2-minute** wait.
6. Enter the code, tick your **Symptoms experienced** (you may select several) or describe them in
   the box, then click **Submit Request**.
7. You will see a confirmation with your **reference number** (e.g. `REQ-2026-0007`), and receive an
   **email receipt**. Use **Print copy** to keep a printed copy.

> Your request is *pending* until the doctor's secretary approves it. You will receive another email
> once it is confirmed.

### 2.2 Viewing your records
Sign in, then use the sidebar:
- **My Records** — your consultation history, diagnoses and visit notes.
- **Prescriptions** — your prescriptions, their status (issued / verified / dispensed) and the
  blockchain reference for each.
- **Appointments** — upcoming and past appointments.

### 2.3 Privacy controls (Data Privacy Act)
Go to **Privacy & Access** to:
- See **who accessed your record**, and when.
- Review your **consent status**.
- **Withdraw consent** at any time.

### 2.4 Your profile
**Profile** lets you update your contact details, change your password, and upload a photo.

---

## 3. Secretary / Staff Guide

### 3.1 Approving booking requests
1. Open **Appointment Requests** — this lists requests for your assigned doctor only.
2. Review the patient's details, preferred schedule and symptoms.
3. Click **Approve** to place the visit on the doctor's calendar, or **Decline** and give a reason.
4. The patient is emailed automatically either way.

### 3.2 Registering a patient
After approving a request, the guest still has no account. To create one:
1. Open the **appointment** and click **Register patient**.
2. The form is pre-filled from the booking — name, contact, email, date of birth and sex.
3. Complete any remaining details and click **Save**.
4. An **activation link** is emailed to the patient automatically. *No temporary password is ever
   created or shared.*

### 3.3 Checking activation status
Open a patient's record → **Edit**. The activation panel shows:
- **Account activated** — the patient has set their password.
- **Activation link active — expires in X hours** — sent, not yet used.
- **Activation link expired** — with a button to send a new one.
- **⚠ Patient requested a new link** — click **Approve & send new link**.

### 3.4 Managing the doctor's schedule
Open **Availability**:
- The weekly grid shows **green** (available), **red** (booked) and **grey** (on leave).
- **Click any open slot** to mark that hour as leave — click again to undo.
- Use **Mark leave** on a day header to block the whole day.
- Use **Leave whole [month]** for extended absences.

Blocked hours disappear from the patient booking page automatically.

---

## 4. Doctor Guide

### 4.1 Your dashboard
**Dashboard** shows today's appointments, patient counts and recent prescription activity.

### 4.2 Conducting a consultation
1. Open **Consultations** (or select the patient from **Records**).
2. Record the **chief complaint**, **vital signs**, **physical examination** findings, **diagnosis**
   and **notes**.
3. Save the record — it is added to the patient's chart.

### 4.3 Issuing a prescription
1. From the consultation, click **New Prescription**.
2. Search and add medicines by **generic name** (RA 6675 Generics Act), then set **dosage**,
   **quantity**, **frequency**, **duration** and **instructions**.
3. Review the safety check — known allergies and interactions are flagged.
4. Click **Issue Prescription**.

The prescription receives a reference number (e.g. `RX-2026-0042`), is signed with your **PRC
license and e-signature**, and is **recorded on the blockchain** automatically in the background.

> If the blockchain is temporarily offline, the prescription is still issued and saved — it is
> anchored automatically once the network returns. Patient care is never blocked.

### 4.4 Patient records and consent
- **Records** — search and open any patient chart.
- Charts are **consent-gated**. In an emergency you may use **Break Glass** to override, but the
  access is logged, the patient is notified, and an administrator reviews it.

### 4.5 Your schedule
**Availability** — file leave by the hour, by the day, or for a whole month (see §3.4).

---

## 5. Pharmacist Guide

### 5.1 Verifying a prescription
1. Open **Verify Queue** — all newly issued prescriptions awaiting verification.
2. Open a prescription and check the patient, prescriber, drugs and dosages.
3. Click **Verify**. The status changes from *Issued* to *Verified* and the event is recorded on the
   blockchain.

### 5.2 Dispensing
1. From a verified prescription, click **Dispense**.
2. Select the **brand** actually dispensed for each generic and confirm the quantity.
3. Click **Confirm Dispense**. The status becomes *Dispensed*.

> The lifecycle is strictly **Issued → Verified → Dispensed**. Steps cannot be skipped or repeated —
> the system rejects invalid transitions.

### 5.3 Medicine availability
**Medicine Availability** — mark generics and brands as in or out of stock. Doctors see this while
prescribing.

### 5.4 Dispensing history
**Dispense History** — a record of everything dispensed, searchable by date, patient or medicine.

---

## 6. Administrator Guide

### 6.1 User management
**Users** — create, edit and deactivate accounts for doctors, secretaries, pharmacists and
administrators; assign roles and link secretaries to their doctor.

**Staff Requests** — approve or reject secretary account requests.

### 6.2 Patients
**Patients** — full patient directory; register, edit, and (where necessary) delete patient records.

### 6.3 Reports
**Reports** — appointment and prescription reports, filterable by date and status. The prescription
report lists the **prescription reference number** in the first column and can be **exported to CSV**
for audit.

### 6.4 Audit logs
**Audit Logs** — every significant action with the user, IP address and timestamp. Security-relevant
events are highlighted.

### 6.5 Compliance (RA 10173)
**Compliance** — the **consent register** and **terms-acceptance register**, for Data Privacy Act
reporting by the Data Protection Officer.

### 6.6 Blockchain monitoring
**Blockchain Explorer** — prescription transactions anchored to Hyperledger Fabric, with transaction
IDs and network status. If the network is offline, a notice is shown and pending records are
anchored automatically on recovery.

### 6.7 Diagnostic tests
**Diagnostic Tests** — maintain the catalogue of available laboratory and imaging tests.

---

## 7. Frequently Asked Questions

**Can I book an appointment without an account?**
Yes. Guest booking only requires email verification. An account is created by staff when you arrive.

**Why do I need to enter a code when booking?**
It confirms you own the email address, which prevents fake bookings and ensures your confirmation
reaches you.

**I never received my activation email.**
Check your spam folder. If the 48-hour link expired, use the **Request a New Activation Link** button
in the follow-up email, or ask staff to resend it.

**Why can't I use the same password as before?**
Passwords must be unique across accounts and meet the policy: at least 8 characters, upper and lower
case, a number and a symbol.

**Who can see my medical records?**
Only your doctor and authorised clinical staff, and only with your consent. You can review every
access under **Privacy & Access**, and withdraw consent at any time.

**What happens if the blockchain is down?**
Nothing stops. Prescriptions are issued and stored normally in the database, then anchored to the
ledger automatically once it is back.

**Can a prescription be altered after it is issued?**
No. Any change in the database would no longer match the blockchain record, making tampering
detectable. The ledger is append-only.

---

## 8. Support

For technical assistance, contact the DEAMHI system administrator.
For data privacy concerns, contact the **Data Protection Officer** via the in-app privacy page.
