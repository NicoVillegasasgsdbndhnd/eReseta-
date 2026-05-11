# eReseta+ — Healthcare System Development Plan

> **Appointment Booking · Patient Record Management · Digital Prescription**
> Powered by Hyperledger Fabric Blockchain

**Client:** Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI)
**Version:** 1.0 · May 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Confirmed Tech Stack](#2-confirmed-tech-stack)
3. [Project Structure (Monorepo)](#3-project-structure-monorepo)
4. [Development Phases at a Glance](#4-development-phases-at-a-glance)
5. [Phase 0 — Project Setup & Design System](#5-phase-0--project-setup--design-system-week-0-23-days)
6. [Phase 1 — Frontend (UI-First with Mock Data)](#6-phase-1--frontend-ui-first-with-mock-data--weeks-14)
7. [Phase 2 — Backend (Laravel REST API)](#7-phase-2--backend-laravel-rest-api--weeks-57)
8. [Phase 3 — Hyperledger Fabric Blockchain](#8-phase-3--hyperledger-fabric-blockchain--weeks-79)
9. [Phase 4 — Integration & PayMongo](#9-phase-4--integration--paymongo--weeks-911)
10. [Phase 5 — Security, Testing & Compliance](#10-phase-5--security-testing--compliance--weeks-1113)
11. [Phase 6 — Deployment & Demo](#11-phase-6--deployment--demo--weeks-1315)
12. [Third-Party Integration Timeline](#12-third-party-integration-timeline)
13. [Risk Mitigation](#13-risk-mitigation)
14. [Key Business Rules](#14-key-business-rules)
15. [Appendix — API Endpoint Summary](#15-appendix--api-endpoint-summary)

---

## 1. Project Overview

eReseta+ is a web-based healthcare system developed for Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI). It modernizes three core hospital workflows — outpatient appointment scheduling, patient record management, and digital prescription handling — anchored by a private Hyperledger Fabric blockchain for tamper-resistant prescription traceability.

### 1.1 General Objective

To develop a healthcare system for appointment booking and patient record management with a blockchain-based e-prescription using Hyperledger Fabric for DEAMHI.

### 1.2 Specific Objectives

1. Create an appointment scheduling system that enables patients, hospital personnel, and IT administrators to manage schedules, user access, and appointment records.
2. Design and develop a patient record management module that stores and manages essential patient details, documented treatment records, and billing-related data for hospital use.
3. Integrate a blockchain-based prescription module using Hyperledger Fabric that records prescription issuance, verification, and dispensing as immutable ledger events.
4. Align the system's security controls and data handling practices with ISO/IEC 27001, ISO/IEC 27701, and the Philippine Data Privacy Act of 2012.
5. Evaluate the overall system's functionality, usability, reliability, performance, and security (FURPS) within the hospital setting.

### 1.3 Scope

- **Appointment Scheduling Module** — patient appointment entry, scheduling coordination, doctor availability management, queue tracking, appointment status lifecycle (Scheduled → Served / Rescheduled / Cancelled).
- **Patient Record Management Module** — encoding, updating, and retrieval of patient profiles, visit records, and billing references by authorized hospital personnel.
- **Digital Prescription (E-Prescription) Module** — doctor-generated digital prescriptions containing drug name, dosage, quantity, frequency, duration, and digital physician signature. Prescription lifecycle (Issued → Verified → Dispensed) recorded on Hyperledger Fabric. Patients may view or print prescriptions; pharmacy personnel verify before dispensing.
- **Security & Compliance** — authentication, RBAC, audit logging, encrypted data handling aligned with ISO/IEC 27001, ISO/IEC 27701, and RA 10173 (Data Privacy Act).
- **Evaluation** — FURPS-based evaluation by hospital stakeholders using a 4-point Likert scale.

### 1.4 Delimitations

- System is scoped exclusively to DEAMHI's OPD and in-house pharmacy workflow.
- No integration with external community pharmacies or cross-hospital prescription sharing.
- Does not cover laboratory, radiology, PhilHealth processing, or inventory management systems.
- No full BizBox synchronization or real-time third-party HIS integration.
- Blockchain limited to a controlled private Fabric network — not a nationwide infrastructure.
- Does not include formal DPO designation or full DPIA (institutional responsibility).

---

## 2. Confirmed Tech Stack

| Layer / Concern       | Technology                                      |
|-----------------------|-------------------------------------------------|
| **Backend**           | Laravel (PHP 8.4+) — REST API                   |
| **Frontend**          | React.js (Vite + TypeScript)                    |
| **Database**          | MariaDB                                         |
| **UI Framework**      | Tailwind CSS + shadcn/ui                        |
| **Server State**      | TanStack Query                                  |
| **Client State**      | Zustand                                         |
| **Forms & Validation**| React Hook Form + Zod                          |
| **Charts**            | Recharts                                        |
| **Blockchain**        | Hyperledger Fabric                              |
| **Payments**          | PayMongo                                        |
| **Authentication**    | Laravel Sanctum + Spatie Permissions (or JWT)   |

---

## 3. Project Structure (Monorepo)

```
eReseta/
├── api/                        # Laravel REST API (Phase 2)
│   ├── app/
│   │   ├── Http/Controllers/
│   │   ├── Http/Middleware/
│   │   ├── Http/Requests/
│   │   ├── Http/Resources/
│   │   ├── Models/
│   │   ├── Services/
│   │   ├── Enums/
│   │   ├── Jobs/
│   │   ├── Notifications/
│   │   ├── Observers/
│   │   └── Policies/
│   ├── database/migrations/
│   ├── database/seeders/
│   ├── routes/api.php
│   └── tests/
├── web/                        # React SPA (Phase 1)
│   ├── src/
│   │   ├── api/                # Axios client (mock → real)
│   │   ├── mocks/              # Mock data for all modules
│   │   ├── components/         # Reusable UI components
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── appointments/
│   │   │   ├── patients/
│   │   │   ├── prescriptions/
│   │   │   ├── pharmacy/
│   │   │   ├── admin/
│   │   │   └── reports/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── utils/
│   │   └── routes/
│   └── package.json
├── blockchain/                 # Hyperledger Fabric (Phase 3)
│   ├── chaincode/              # Go chaincode for prescriptions
│   ├── network/                # Fabric network config
│   └── gateway/                # Node.js Fabric gateway SDK
├── docker-compose.yml
└── README.md
```

> The monorepo separates three distinct runtimes: the React SPA (`web/`), the Laravel REST API (`api/`), and the Hyperledger Fabric network and chaincode (`blockchain/`). All three are orchestrated via Docker Compose for local development.

---

## 4. Development Phases at a Glance

| Phase     | Focus                              | Timeline           | Sprint   |
|-----------|------------------------------------|--------------------|----------|
| Phase 0   | Project Setup & Design System      | Week 0 (2–3 days)  | Sprint 0 |
| Phase 1   | Frontend (UI-First with Mock Data) | Weeks 1–4          | Sprints 1–2 |
| Phase 2   | Backend (Laravel REST API)         | Weeks 5–7          | Sprint 3 |
| Phase 3   | Blockchain (Hyperledger Fabric)    | Weeks 7–9          | Sprint 4 |
| Phase 4   | Integration & PayMongo             | Weeks 9–11         | Sprint 5 |
| Phase 5   | Security, Testing & Compliance     | Weeks 11–13        | Sprint 6 |
| Phase 6   | Deployment & Demo                  | Weeks 13–15        | Sprint 7 |

### Timeline Overview

```
Task                              W1  W2  W3  W4  W5  W6  W7  W8  W9  W10 W11 W12 W13 W14 W15
─────────────────────────────────────────────────────────────────────────────────────────────
Phase 0: Setup                    ██  ██  ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·
Phase 1: Frontend UI              ██  ██  ██  ██  ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·
Phase 2: Backend API              ·   ·   ·   ·   ██  ██  ██  ·   ·   ·   ·   ·   ·   ·   ·
Phase 3: Hyperledger Fabric       ·   ·   ·   ·   ·   ·   ██  ██  ██  ·   ·   ·   ·   ·   ·
Phase 4: Integration & PayMongo   ·   ·   ·   ·   ·   ·   ·   ·   ██  ██  ██  ·   ·   ·   ·
Phase 5: Security & Testing       ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ██  ██  ██  ·   ·
Phase 6: Deployment & Demo        ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ·   ██  ██  ██
```

---

## 5. Phase 0 — Project Setup & Design System (Week 0, 2–3 days)

### Goals

Establish the full project scaffold, toolchain, and shared design tokens so every subsequent sprint starts from a clean foundation.

### Tasks

- [ ] Initialize git repository (monorepo: `web/`, `api/`, `blockchain/`)
- [ ] Scaffold React SPA: `npm create vite@latest web -- --template react-ts`
- [ ] Install frontend dependencies: React Router, TanStack Query, Zustand, Tailwind CSS, shadcn/ui, React Hook Form, Zod, Recharts, Axios, date-fns
- [ ] Set up Tailwind config + shadcn/ui base components (Button, Input, Card, Dialog, Table, Select, Badge, Toast)
- [ ] Build app layout shell: sidebar navigation, topbar, content area, role-based route guards
- [ ] Create mock auth context — role switcher dropdown (Patient, Doctor, Pharmacist, Admin, IT Admin) for frictionless development
- [ ] Create `web/src/mocks/` folder and define TypeScript interfaces for all entities:
  - `User`, `Patient`, `Appointment`, `PatientRecord`, `Prescription`, `PrescriptionItem`, `BillingRecord`
- [ ] Create `web/src/api/` Axios client with base URL pointing to mock handlers (switches to real API in Phase 4)
- [ ] Initialize Laravel project: `composer create-project laravel/laravel api`
- [ ] Configure `.env`: MariaDB connection, Sanctum, queue driver
- [ ] Install Laravel packages: Sanctum, Spatie Permissions, Laravel Excel, DomPDF, CORS
- [ ] Initialize Hyperledger Fabric test-network in `blockchain/` directory
- [ ] Set up `docker-compose.yml` wiring all three services

### Verification

- [ ] React SPA renders layout shell with role switcher
- [ ] Laravel returns `200` on `GET /api/health`
- [ ] Fabric test-network starts and peers are healthy

---

## 6. Phase 1 — Frontend (UI-First with Mock Data) — Weeks 1–4

> All pages built with mock data in `web/src/mocks/`. No backend required. Mock data files mirror the future API response shape so Phase 4 integration is seamless.

---

### Sprint 1 (Weeks 1–2): Core Modules UI

#### Week 1 — Auth + Layouts + Appointment Scheduling UI

**Auth pages:**
- [ ] Login page (email + password form)
- [ ] Registration page
- [ ] Forgot password page
- [ ] Role switcher dev tool (dropdown to preview each role's view)

**Layouts per role:**
- [ ] **Patient** — appointments, prescriptions, profile
- [ ] **Doctor** — dashboard, appointments, consultations, prescriptions
- [ ] **Pharmacist** — verification queue, dispense history
- [ ] **Admin** — all modules
- [ ] **IT Admin** — users, audit logs

**Appointment Scheduling pages:**
- [ ] Appointment list (data table: search, filter by status/doctor/date, pagination)
- [ ] Appointment booking form (patient selects doctor, date, time slot, type)
- [ ] Doctor availability calendar view
- [ ] Appointment detail page (status timeline, patient info, linked record)
- [ ] Admin schedule management (approve, reschedule, cancel with notes)

---

#### Week 2 — Patient Record Management UI

- [ ] Patient list (searchable data table)
- [ ] Patient profile page (demographics, visit history, prescriptions, billing)
- [ ] Patient create/edit form (name, DOB, sex, address, PhilHealth no., contact)
- [ ] Visit record entry form (chief complaint, diagnosis, treatment notes, attending doctor)
- [ ] Visit history list per patient (date, doctor, diagnosis summary)
- [ ] Billing record view (linked to appointment, amount, status)

**Shared components built this week:**
- [ ] Status badge component (color-coded per status)
- [ ] Status timeline component (vertical stepper: Scheduled → Served)
- [ ] Reusable data table component (all modules)
- [ ] Modal/dialog + confirmation dialog components

---

### Sprint 2 (Weeks 3–4): Prescription + Dashboard + Admin UI

#### Week 3 — E-Prescription Module UI

- [ ] **Doctor:** New Prescription form (patient lookup, drug name, dosage, quantity, frequency, duration, special instructions, digital signature placeholder)
- [ ] **Doctor:** My Prescriptions list (filter by status, patient, date)
- [ ] **Doctor:** Prescription detail (read-only view with all fields + blockchain status badge)
- [ ] **Patient:** My Prescriptions view (read-only, print/download button)
- [ ] **Pharmacist:** Verification queue (list of prescriptions pending dispensing)
- [ ] **Pharmacist:** Prescription verify & dispense form (scan/enter Rx reference, confirm dispensing, add notes)
- [ ] Prescription lifecycle status display: `Issued → Verified → Dispensed → Expired`
- [ ] Blockchain audit trail display (list of timestamped events: issued by, verified by, dispensed by)

---

#### Week 4 — Dashboard + Reports + Admin UI

**Role-based dashboards:**
- [ ] **Doctor:** Today's appointments, recent prescriptions issued, pending consultations
- [ ] **Admin:** KPI cards (total appointments today, pending verifications, new patients), appointment status breakdown chart (Recharts), recent activity log
- [ ] **Pharmacist:** Verification queue count, dispensing history, daily dispense chart
- [ ] **Patient:** My upcoming appointments, my recent prescriptions, my billing summary

**Reports pages:**
- [ ] Appointment summary (by period, by doctor) — Recharts bar/line charts
- [ ] Prescription activity log
- [ ] Patient visit frequency

**Admin / IT Admin pages:**
- [ ] User list (all users, role badges, status — Active/Inactive)
- [ ] User create/edit form (assign role, link to patient/doctor profile)
- [ ] System audit log table (action, actor, target, IP, timestamp)
- [ ] My profile page (edit name, email, phone, password)

### Phase 1 Verification

- [ ] All pages render correctly with mock data
- [ ] Role switcher shows correct navigation and page access per role
- [ ] All forms interactive with React Hook Form + Zod validation
- [ ] Recharts render on dashboard pages

---

## 7. Phase 2 — Backend (Laravel REST API) — Weeks 5–7

### Architecture Pattern

```
Controller → FormRequest (validation) → Service (business logic) → Model (data)
```

- Thin controllers, business logic in Services
- API Resources for all JSON responses
- PHP 8.4 Enums for statuses and roles
- Model Observers for side effects (audit logs)
- Laravel Queues: `sync` driver for dev, `database` for prod

---

### Sprint 3 (Weeks 5–6): Foundation + Core Modules API

#### Week 5 — Auth + Appointments + Patients API

**Auth:**
- [ ] `POST /api/register`
- [ ] `POST /api/login`
- [ ] `POST /api/logout`
- [ ] `GET /api/me`
- [ ] Role seeder: Patient, Doctor, Pharmacist, Admin, IT Admin + Spatie permissions

**Patients & Doctors:**
- [ ] `GET/POST/PUT/DELETE /api/patients`
- [ ] `GET /api/patients/{id}/records`
- [ ] `GET /api/patients/{id}/prescriptions`
- [ ] `GET /api/doctors`
- [ ] `GET /api/doctors/{id}/availability`

**Appointments:**
- [ ] `POST /api/appointments` — patient creates
- [ ] `GET /api/appointments` — filtered by role
- [ ] `GET /api/appointments/{id}`
- [ ] `PUT /api/appointments/{id}/status` — confirm, reschedule, cancel, serve
- [ ] Appointment status history logging via Observer

---

#### Week 6 — Patient Records + Prescriptions + Billing API

**Patient Records:**
- [ ] `POST /api/patient-records`
- [ ] `GET /api/patient-records/{id}`
- [ ] `PUT /api/patient-records/{id}`

**Prescriptions:**
- [ ] `POST /api/prescriptions` — doctor creates → triggers Fabric write (Phase 3)
- [ ] `GET /api/prescriptions` — filtered by role
- [ ] `GET /api/prescriptions/{id}`
- [ ] `PUT /api/prescriptions/{id}/verify` — Pharmacist
- [ ] `PUT /api/prescriptions/{id}/dispense` — Pharmacist
- [ ] Prescription event logging (fires Fabric chaincode write — wired in Phase 3)

**Billing:**
- [ ] `GET /api/billing-records`
- [ ] `POST /api/billing-records`
- [ ] `GET /api/patients/{id}/billing-summary`

**Dashboard & Reports:**
- [ ] `GET /api/dashboard/summary` — role-scoped KPIs
- [ ] `GET /api/dashboard/appointment-stats`
- [ ] `GET /api/dashboard/prescription-activity`
- [ ] `GET /api/reports/appointments` — with date filters, Excel/PDF export
- [ ] `GET /api/reports/prescriptions`
- [ ] `GET /api/audit-logs` — IT Admin only

---

### Database Migrations

| # | Table                         | Key Columns |
|---|-------------------------------|-------------|
| 1 | `users`                       | id, name, email, password, role, status, phone, address |
| 2 | `roles / permissions (Spatie)`| Spatie Roles & Permissions tables |
| 3 | `patients`                    | id, user_id, dob, sex, address, philhealth_no, contact |
| 4 | `doctors`                     | id, user_id, license_no, specialization, prc_expiry |
| 5 | `appointments`                | id, patient_id, doctor_id, scheduled_at, status, type, notes |
| 6 | `appointment_status_histories`| id, appointment_id, from_status, to_status, changed_by |
| 7 | `patient_records`             | id, patient_id, doctor_id, visit_date, chief_complaint, diagnosis, notes |
| 8 | `prescriptions`               | id, patient_record_id, doctor_id, issued_at, status, blockchain_tx_id |
| 9 | `prescription_items`          | id, prescription_id, drug_name, dosage, quantity, frequency, duration, instructions |
| 10| `prescription_events`         | id, prescription_id, event_type, actor_id, occurred_at, blockchain_tx_id |
| 11| `billing_records`             | id, patient_id, appointment_id, amount, status, paymongo_id |
| 12| `audit_logs`                  | id, user_id, action, target_type, target_id, ip_address, created_at |

### Seeders

- [ ] 5+ users per role with realistic Philippine names
- [ ] 20+ patient profiles with visit histories
- [ ] 10+ doctor profiles with specializations and license numbers
- [ ] 30+ appointments across all statuses
- [ ] 20+ prescriptions across all lifecycle stages
- [ ] Billing records linked to appointments

### Phase 2 Verification

- [ ] All endpoints return correct responses in Postman
- [ ] RBAC enforced — unauthorized access returns `403`
- [ ] Business rules enforced: only doctors create prescriptions, only pharmacists dispense
- [ ] Seeders create realistic, navigable data

---

## 8. Phase 3 — Hyperledger Fabric Blockchain — Weeks 7–9

> Hyperledger Fabric records the prescription lifecycle as immutable, tamper-resistant ledger events. **MariaDB remains the primary application data store.** Fabric provides the audit trail and traceability layer only.

---

### 8.1 Fabric Network Setup

- [ ] Private permissioned network with one organization (`DEAMHI-MSP`)
- [ ] Orderer: single-node RAFT (suitable for controlled private network scope)
- [ ] Peers: 2 peers for the hospital organization
- [ ] Channel: `ereseta-channel` dedicated to prescription events
- [ ] Certificate Authority: Fabric CA for identity management
- [ ] Local dev: `fabric-samples/test-network`; production: Docker Compose multi-container

---

### 8.2 Chaincode (Smart Contract)

- **Language:** Go (recommended) or Node.js
- **Contract name:** `PrescriptionContract`

| Function | Trigger | Description |
|----------|---------|-------------|
| `CreatePrescription(prescriptionId, patientId, doctorId, issuedAt, drugList)` | `POST /prescriptions` | Writes new Rx to ledger |
| `VerifyPrescription(prescriptionId, pharmacistId, verifiedAt)` | `PUT /prescriptions/{id}/verify` | Records verification event |
| `DispensePrescription(prescriptionId, pharmacistId, dispensedAt)` | `PUT /prescriptions/{id}/dispense` | Records dispensing event |
| `GetPrescriptionHistory(prescriptionId)` | Audit trail view | Returns full ledger event trail |
| `QueryPrescriptionById(prescriptionId)` | Verification check | Returns current world state |

> Each function validates caller identity (MSP role) before writing to the ledger.

---

### 8.3 Laravel ↔ Fabric Gateway

```
Laravel API
    │
    │  HTTP (internal)
    ▼
Fabric Gateway Service (Node.js — blockchain/gateway/)
    │  @hyperledger/fabric-gateway SDK
    ▼
Fabric Peer (DEAMHI-MSP)
    │
    ▼
ereseta-channel Ledger
```

- [ ] Laravel fires HTTP requests to the gateway service after each prescription status transition
- [ ] Gateway service signs transactions using the hospital's enrolled identity and submits to Fabric peer
- [ ] `blockchain_tx_id` returned and stored in MariaDB `prescriptions` and `prescription_events` tables
- [ ] Frontend displays blockchain audit trail from gateway `GET` endpoint (timestamped ledger events)

---

### 8.4 Prescription Verification Flow (Blockchain)

```
Doctor creates Rx
    → Laravel writes to MariaDB
    → calls Gateway → Fabric CreatePrescription
    → tx_id stored in prescriptions.blockchain_tx_id

Pharmacist scans/enters Rx reference
    → calls Gateway → GetPrescriptionById
    → validates status on ledger
    → Laravel returns current state to frontend

Pharmacist dispenses
    → Laravel updates MariaDB status
    → calls Gateway → Fabric DispensePrescription
    → tx_id stored in prescription_events

Patient/Doctor views audit trail
    → Gateway GetPrescriptionHistory
    → immutable event list displayed on frontend
```

### Phase 3 Verification

- [ ] Fabric test-network channels and chaincode deployed and instantiated
- [ ] All chaincode functions execute and return responses via gateway
- [ ] Prescription events appear in Fabric ledger after each status transition
- [ ] Tamper test: manually altering a ledger record fails endorsement validation

---

## 9. Phase 4 — Integration & PayMongo — Weeks 9–11

### 9.1 Frontend → Backend Integration

- [ ] Replace all mock data imports with real Axios API calls
- [ ] Configure TanStack Query hooks for every endpoint (queries + mutations)
- [ ] Wire up Laravel Sanctum auth flow (token stored in httpOnly cookie or Zustand)
- [ ] Wire up all CRUD operations: Appointments, Patients, Records, Prescriptions
- [ ] Wire up dashboard data and report downloads
- [ ] Wire up blockchain audit trail display on Prescription detail page

### 9.2 PayMongo Integration

- [ ] `POST /api/billing/{id}/payment-link` → PayMongo API → return payment URL
- [ ] Webhook handler: `POST /api/webhooks/paymongo` → verify signature → update billing status to `Paid`
- [ ] Patient billing page: **Pay Now** button → redirect to PayMongo hosted payment page
- [ ] Fallback: manual payment recording by Admin (no PayMongo dependency for MVP)

### Phase 4 Verification

- [ ] Full end-to-end: Login → Book Appointment → Doctor Consultation → Issue Prescription → Pharmacist Verification → Dispense → Blockchain Audit Trail visible
- [ ] PayMongo test webhook fires and updates billing status

---

## 10. Phase 5 — Security, Testing & Compliance — Weeks 11–13

### 10.1 Security Implementation

- [ ] Laravel Sanctum token auth with httpOnly cookies (CSRF protection enabled)
- [ ] Spatie Permissions RBAC enforcing all role-based route access
- [ ] Request validation via FormRequests (auto `422` responses on invalid input)
- [ ] Audit logging via Observer: all create/update/delete actions logged to `audit_logs` with actor, IP, timestamp
- [ ] Encrypted fields: patient sensitive data encrypted at rest using Laravel's `Crypt` facade
- [ ] HTTPS enforced in production; all API communication over TLS
- [ ] Prescription QR codes (optional): signed with doctor's private key, verified by Fabric

### 10.2 Compliance Alignment

| Standard | Implementation |
|----------|---------------|
| **ISO/IEC 27001** | Access control, audit logging, incident response procedures documented |
| **ISO/IEC 27701** | Privacy by design: minimum data collection, data subject access controls |
| **RA 10173 (Data Privacy Act)** | Consent management, data subject rights interface, breach notification procedure |
| **FDA Circular No. 2020-037** | Digital prescription format: patient info, drug info, physician credentials, date, signature |

### 10.3 Testing Strategy

| Phase | Method | Coverage |
|-------|--------|----------|
| Phase 1 (Frontend) | Visual verification with mock data | Role switching, all forms interactive, pages render correctly |
| Phase 2 (Backend) | Postman collection + DB seeders + Feature tests | RBAC, CRUD endpoints, business rule enforcement |
| Phase 3 (Blockchain) | Fabric test-network + chaincode unit tests | Prescription write/read, tamper detection, lifecycle events |
| Phase 4 (Integration) | End-to-end manual flows | Login → Appointment → Consult → Prescribe → Verify → Dispense |
| Phase 5 (Security) | OWASP ZAP, Laravel security scan, Postman auth tests | FURPS: Functionality, Usability, Reliability, Performance, Security |
| Phase 6 (UAT) | Hospital staff evaluation (doctors, pharmacists, admin) | Post-test questionnaire (4-point Likert scale) |

**Laravel Feature Tests (~20 tests):**
- [ ] RBAC enforcement
- [ ] Prescription lifecycle transitions
- [ ] Fabric gateway calls (mocked)
- [ ] PayMongo webhook handling

- [ ] Postman collection: full coverage of all API endpoints with dev/staging environment variables
- [ ] OWASP ZAP scan on staging before UAT

---

## 11. Phase 6 — Deployment & Demo — Weeks 13–15

### 11.1 Deployment Architecture

| Component               | Platform                   | Notes |
|-------------------------|----------------------------|-------|
| Laravel API             | Railway or Render (free)   | PHP 8.4+, MariaDB addon |
| React SPA               | Vercel or Netlify          | Static build via Vite |
| MariaDB                 | Railway (managed)          | Automated backups |
| Hyperledger Fabric      | VPS / Railway Container    | Docker Compose network |
| Fabric Gateway Service  | Railway (Node.js)          | Internal service, not public-facing |

### 11.2 Pre-Deployment Checklist

- [ ] Production environment variables set (`.env.production`)
- [ ] SSL/HTTPS certificates configured
- [ ] Production DB seeded with demo accounts per role
- [ ] Fabric network peers healthy and chaincode instantiated on production channel
- [ ] PayMongo webhook URL registered in production dashboard
- [ ] Demo walkthrough script prepared
- [ ] Backup video recording of full system demo

### 11.3 Demo Accounts

| Role        | Name              | Email                    | Access |
|-------------|-------------------|--------------------------|--------|
| Patient     | Juan dela Cruz    | patient@deamhi.test      | Appointments, Prescriptions |
| Doctor      | Dr. Maria Santos  | doctor@deamhi.test       | Consultations, Issue Rx |
| Pharmacist  | Ana Reyes         | pharmacist@deamhi.test   | Verify & Dispense Rx |
| Admin       | Admin User        | admin@deamhi.test        | All modules |
| IT Admin    | IT Admin          | it@deamhi.test           | Users, Audit Logs |

---

## 12. Third-Party Integration Timeline

| Integration                  | Phase               | Purpose |
|------------------------------|---------------------|---------|
| shadcn/ui + Tailwind CSS     | Phase 0 (Setup)     | UI component foundation |
| TanStack Query + Zustand     | Phase 1 (Week 1)    | State management |
| React Hook Form + Zod        | Phase 1 (Week 1)    | Form validation |
| Recharts                     | Phase 1 (Week 4)    | Dashboard charts and analytics |
| Laravel Sanctum + Spatie     | Phase 2 (Week 5)    | Auth + Role-Based Access Control |
| Hyperledger Fabric SDK       | Phase 3 (Week 7)    | Blockchain chaincode + gateway |
| PayMongo                     | Phase 4 (Week 10)   | Payment gateway for billing |

---

## 13. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Hyperledger Fabric complexity | 🔴 High | 🔴 High | Start chaincode setup early in Phase 0; use Fabric test-network for local dev |
| Mock-to-real data shape mismatch | 🟡 Medium | 🔴 High | Define TypeScript interfaces matching API shape from Day 1 |
| PayMongo integration delays | 🟢 Low | 🟡 Medium | Manual payment fallback flow first; gateway added last |
| Scope creep beyond 3 modules | 🟡 Medium | 🔴 High | Strict scope enforcement: Appointments, Records, E-Prescription only |
| ISO/DPA compliance gaps | 🟡 Medium | 🔴 High | RBAC, audit logs, encryption baked into every module |
| Team availability | 🟡 Medium | 🟡 Medium | Buffer weeks built into each phase; UI-first ensures visible progress |
| MariaDB ↔ Fabric sync issues | 🔴 High | 🟡 Medium | Off-chain DB for app data; on-chain only for prescription events |

---

## 14. Key Business Rules

1. Only licensed doctors (`role: Doctor`) may create prescriptions.
2. Only pharmacists (`role: Pharmacist`) may verify and dispense prescriptions.
3. Prescriptions may only transition **forward**: `Issued → Verified → Dispensed → Expired`.
4. A dispensed prescription **cannot be re-dispensed** (enforced on-chain by Fabric).
5. Prescription reference identifier must be **unique and QR-scannable**.
6. Patient records are accessible only to authorized doctors and admin — **not** to pharmacy staff.
7. All prescription lifecycle events must be written to the **Fabric ledger before** the API response is returned.
8. Audit logs must capture every data mutation (create/update/delete) with actor identity and IP address.
9. Digital prescriptions must include: patient info, drug info, dosage, quantity, frequency, duration, prescribing physician credentials, date, and physician signature.

---

## 15. Appendix — API Endpoint Summary

### Authentication

```
POST   /api/register                     Create account
POST   /api/login                        Authenticate, returns Sanctum token
POST   /api/logout                       Revoke token
GET    /api/me                           Authenticated user profile
```

### Appointments

```
GET    /api/appointments                 List (filtered by role)
POST   /api/appointments                 Create appointment (Patient)
GET    /api/appointments/{id}            Detail
PUT    /api/appointments/{id}/status     Update status (Doctor, Admin)
```

### Patients & Records

```
GET    /api/patients                     List
POST   /api/patients                     Create
PUT    /api/patients/{id}               Update
DELETE /api/patients/{id}               Delete
GET    /api/patients/{id}/records       Visit history
POST   /api/patient-records             Create visit record (Doctor)
PUT    /api/patient-records/{id}        Update visit record
```

### Prescriptions

```
POST   /api/prescriptions               Issue prescription (Doctor) → triggers Fabric write
GET    /api/prescriptions               List (filtered by role)
GET    /api/prescriptions/{id}          Detail + blockchain audit trail
PUT    /api/prescriptions/{id}/verify   Pharmacist verification → triggers Fabric write
PUT    /api/prescriptions/{id}/dispense Pharmacist dispense → triggers Fabric write
```

### Billing & Payments

```
GET    /api/billing-records             List
POST   /api/billing/{id}/payment-link   Generate PayMongo payment link
POST   /api/webhooks/paymongo           Webhook for payment confirmation
```

### Dashboard & Reports

```
GET    /api/dashboard/summary           Role-scoped KPIs
GET    /api/dashboard/appointment-stats Appointment breakdown
GET    /api/dashboard/prescription-activity Prescription activity
GET    /api/reports/appointments        Appointment report (Excel/PDF export)
GET    /api/reports/prescriptions       Prescription activity report
```

### Admin

```
GET    /api/users                       User management (Admin, IT Admin)
POST   /api/users                       Create user
PUT    /api/users/{id}                  Update user
GET    /api/audit-logs                  System audit log (IT Admin only)
```

---

*eReseta+ Development Plan v1.0 — May 2026*
*Barcelon · Licmo-an · Santos · Villegas — FEU Institute of Technology*
