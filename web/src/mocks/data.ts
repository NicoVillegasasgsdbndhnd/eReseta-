import type {
  User, Patient, Doctor, Appointment, PatientRecord,
  Prescription, PrescriptionItem, PrescriptionEvent,
  BillingRecord, ActivityLog,
} from './types'

// ── Users ─────────────────────────────────────────────────────────────────────
export const mockUsers: User[] = [
  { id: 1, name: 'Juan dela Cruz', email: 'patient@deamhi.test', phone: '09171234567', address: 'Brgy. San Jose, Manila', role: 'patient', status: 'active', created_at: '2026-01-10T08:00:00Z', updated_at: '2026-01-10T08:00:00Z' },
  { id: 2, name: 'Maria Santos', email: 'patient2@deamhi.test', phone: '09182345678', address: 'Brgy. Sta. Cruz, Quezon City', role: 'patient', status: 'active', created_at: '2026-01-15T08:00:00Z', updated_at: '2026-01-15T08:00:00Z' },
  { id: 3, name: 'Roberto Reyes', email: 'patient3@deamhi.test', phone: '09193456789', address: 'Brgy. Poblacion, Makati', role: 'patient', status: 'active', created_at: '2026-02-01T08:00:00Z', updated_at: '2026-02-01T08:00:00Z' },
  { id: 4, name: 'Ana Lim', email: 'patient4@deamhi.test', phone: '09204567890', address: 'Brgy. Bagong Silang, Caloocan', role: 'patient', status: 'active', created_at: '2026-02-10T08:00:00Z', updated_at: '2026-02-10T08:00:00Z' },
  { id: 5, name: 'Pedro Garcia', email: 'patient5@deamhi.test', phone: '09215678901', address: 'Brgy. Talipapa, Quezon City', role: 'patient', status: 'active', created_at: '2026-03-01T08:00:00Z', updated_at: '2026-03-01T08:00:00Z' },
  { id: 10, name: 'Dr. Maria Santos', email: 'doctor@deamhi.test', phone: '09181234567', address: 'Quezon City', role: 'doctor', status: 'active', created_at: '2025-06-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z' },
  { id: 11, name: 'Dr. Jose Rizal', email: 'doctor2@deamhi.test', phone: '09192345678', address: 'Manila', role: 'doctor', status: 'active', created_at: '2025-06-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z' },
  { id: 12, name: 'Dr. Corazon Aquino', email: 'doctor3@deamhi.test', phone: '09203456789', address: 'Taguig', role: 'doctor', status: 'active', created_at: '2025-06-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z' },
  { id: 20, name: 'Ana Reyes', email: 'pharmacist@deamhi.test', phone: '09191234567', address: 'Makati', role: 'pharmacist', status: 'active', created_at: '2025-06-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z' },
  { id: 30, name: 'Admin User', email: 'admin@deamhi.test', phone: '09201234567', address: 'Pasig', role: 'admin', status: 'active', created_at: '2025-06-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z' },
  { id: 40, name: 'IT Admin', email: 'it@deamhi.test', phone: '09211234567', address: 'Taguig', role: 'it_admin', status: 'active', created_at: '2025-06-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z' },
]

// ── Patients ──────────────────────────────────────────────────────────────────
export const mockPatients: Patient[] = [
  { id: 1, user_id: 1, user: mockUsers[0], dob: '1990-05-15', sex: 'male', address: 'Brgy. San Jose, Manila', philhealth_no: 'PH-001-234-567', contact: '09171234567', created_at: '2026-01-10T08:00:00Z', updated_at: '2026-01-10T08:00:00Z' },
  { id: 2, user_id: 2, user: mockUsers[1], dob: '1985-08-22', sex: 'female', address: 'Brgy. Sta. Cruz, Quezon City', philhealth_no: 'PH-002-345-678', contact: '09182345678', created_at: '2026-01-15T08:00:00Z', updated_at: '2026-01-15T08:00:00Z' },
  { id: 3, user_id: 3, user: mockUsers[2], dob: '1978-03-10', sex: 'male', address: 'Brgy. Poblacion, Makati', philhealth_no: 'PH-003-456-789', contact: '09193456789', created_at: '2026-02-01T08:00:00Z', updated_at: '2026-02-01T08:00:00Z' },
  { id: 4, user_id: 4, user: mockUsers[3], dob: '1995-11-30', sex: 'female', address: 'Brgy. Bagong Silang, Caloocan', philhealth_no: null, contact: '09204567890', created_at: '2026-02-10T08:00:00Z', updated_at: '2026-02-10T08:00:00Z' },
  { id: 5, user_id: 5, user: mockUsers[4], dob: '2001-07-04', sex: 'male', address: 'Brgy. Talipapa, Quezon City', philhealth_no: 'PH-005-678-901', contact: '09215678901', created_at: '2026-03-01T08:00:00Z', updated_at: '2026-03-01T08:00:00Z' },
]

// ── Doctors ───────────────────────────────────────────────────────────────────
export const mockDoctors: Doctor[] = [
  { id: 1, user_id: 10, user: mockUsers[5], license_no: 'PRC-2019-001234', specialization: 'General Medicine', prc_expiry: '2027-06-30', created_at: '2025-06-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z' },
  { id: 2, user_id: 11, user: mockUsers[6], license_no: 'PRC-2018-005678', specialization: 'Internal Medicine', prc_expiry: '2026-12-31', created_at: '2025-06-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z' },
  { id: 3, user_id: 12, user: mockUsers[7], license_no: 'PRC-2020-009012', specialization: 'Pediatrics', prc_expiry: '2028-03-31', created_at: '2025-06-01T08:00:00Z', updated_at: '2025-06-01T08:00:00Z' },
]

// ── Appointments ──────────────────────────────────────────────────────────────
export const mockAppointments: Appointment[] = [
  { id: 1, patient_id: 1, doctor_id: 1, patient: mockPatients[0], doctor: mockDoctors[0], scheduled_at: '2026-05-12T09:00:00Z', status: 'scheduled', type: 'consultation', notes: 'Follow-up on hypertension management', created_at: '2026-05-10T08:00:00Z', updated_at: '2026-05-10T08:00:00Z' },
  { id: 2, patient_id: 2, doctor_id: 1, patient: mockPatients[1], doctor: mockDoctors[0], scheduled_at: '2026-05-12T10:00:00Z', status: 'confirmed', type: 'follow_up', notes: null, created_at: '2026-05-09T08:00:00Z', updated_at: '2026-05-10T09:00:00Z' },
  { id: 3, patient_id: 3, doctor_id: 2, patient: mockPatients[2], doctor: mockDoctors[1], scheduled_at: '2026-05-12T11:00:00Z', status: 'served', type: 'consultation', notes: 'Diabetes monitoring', created_at: '2026-05-08T08:00:00Z', updated_at: '2026-05-12T11:30:00Z' },
  { id: 4, patient_id: 4, doctor_id: 2, patient: mockPatients[3], doctor: mockDoctors[1], scheduled_at: '2026-05-13T09:00:00Z', status: 'scheduled', type: 'consultation', notes: null, created_at: '2026-05-10T08:00:00Z', updated_at: '2026-05-10T08:00:00Z' },
  { id: 5, patient_id: 5, doctor_id: 3, patient: mockPatients[4], doctor: mockDoctors[2], scheduled_at: '2026-05-11T14:00:00Z', status: 'cancelled', type: 'follow_up', notes: 'Patient requested cancellation', created_at: '2026-05-09T08:00:00Z', updated_at: '2026-05-11T07:00:00Z' },
  { id: 6, patient_id: 1, doctor_id: 2, patient: mockPatients[0], doctor: mockDoctors[1], scheduled_at: '2026-05-14T10:00:00Z', status: 'scheduled', type: 'consultation', notes: null, created_at: '2026-05-11T08:00:00Z', updated_at: '2026-05-11T08:00:00Z' },
  { id: 7, patient_id: 2, doctor_id: 3, patient: mockPatients[1], doctor: mockDoctors[2], scheduled_at: '2026-05-15T09:00:00Z', status: 'confirmed', type: 'consultation', notes: 'Pediatric check-up for child', created_at: '2026-05-11T09:00:00Z', updated_at: '2026-05-11T10:00:00Z' },
  { id: 8, patient_id: 3, doctor_id: 1, patient: mockPatients[2], doctor: mockDoctors[0], scheduled_at: '2026-05-10T15:00:00Z', status: 'rescheduled', type: 'follow_up', notes: 'Rescheduled from May 8', created_at: '2026-05-08T08:00:00Z', updated_at: '2026-05-10T08:00:00Z' },
]

// ── Patient Records ───────────────────────────────────────────────────────────
export const mockPatientRecords: PatientRecord[] = [
  { id: 1, patient_id: 1, doctor_id: 1, patient: mockPatients[0], doctor: mockDoctors[0], visit_date: '2026-04-20', chief_complaint: 'Headache and elevated blood pressure', diagnosis: 'Stage 1 Hypertension', notes: 'Prescribed Amlodipine 5mg OD. Advised low-sodium diet and regular exercise. Follow-up in 2 weeks.', created_at: '2026-04-20T10:00:00Z', updated_at: '2026-04-20T10:00:00Z' },
  { id: 2, patient_id: 2, doctor_id: 2, patient: mockPatients[1], doctor: mockDoctors[1], visit_date: '2026-04-25', chief_complaint: 'Fatigue, frequent urination, excessive thirst', diagnosis: 'Type 2 Diabetes Mellitus', notes: 'FBS 210 mg/dL. Started on Metformin 500mg BID. Referred for HbA1c and lipid profile. Dietary counseling given.', created_at: '2026-04-25T09:30:00Z', updated_at: '2026-04-25T09:30:00Z' },
  { id: 3, patient_id: 3, doctor_id: 1, patient: mockPatients[2], doctor: mockDoctors[0], visit_date: '2026-05-05', chief_complaint: 'Productive cough for 5 days, low-grade fever', diagnosis: 'Acute Bronchitis', notes: 'Prescribed Azithromycin 500mg OD for 3 days and Salbutamol inhaler PRN. Advised rest and adequate hydration.', created_at: '2026-05-05T11:00:00Z', updated_at: '2026-05-05T11:00:00Z' },
  { id: 4, patient_id: 1, doctor_id: 2, patient: mockPatients[0], doctor: mockDoctors[1], visit_date: '2026-05-10', chief_complaint: 'Follow-up for hypertension, BP still elevated', diagnosis: 'Stage 1 Hypertension — uncontrolled', notes: 'BP 150/95. Increased Amlodipine to 10mg OD. Added Losartan 50mg OD. Repeat BP check in 1 week.', created_at: '2026-05-10T10:00:00Z', updated_at: '2026-05-10T10:00:00Z' },
]

// ── Prescription Items ────────────────────────────────────────────────────────
const rxItems: Record<number, PrescriptionItem[]> = {
  1: [
    { id: 1, prescription_id: 1, drug_name: 'Amlodipine', dosage: '5mg', quantity: 30, frequency: 'Once daily', duration: '30 days', instructions: 'Take in the morning with or without food' },
  ],
  2: [
    { id: 2, prescription_id: 2, drug_name: 'Metformin', dosage: '500mg', quantity: 60, frequency: 'Twice daily', duration: '30 days', instructions: 'Take with meals to reduce GI side effects' },
    { id: 3, prescription_id: 2, drug_name: 'Atorvastatin', dosage: '20mg', quantity: 30, frequency: 'Once daily at bedtime', duration: '30 days', instructions: null },
  ],
  3: [
    { id: 4, prescription_id: 3, drug_name: 'Azithromycin', dosage: '500mg', quantity: 3, frequency: 'Once daily', duration: '3 days', instructions: 'Take on empty stomach' },
    { id: 5, prescription_id: 3, drug_name: 'Salbutamol Inhaler', dosage: '100mcg/puff', quantity: 1, frequency: 'As needed (PRN)', duration: '7 days', instructions: '1-2 puffs every 4-6 hours as needed for wheezing' },
  ],
  4: [
    { id: 6, prescription_id: 4, drug_name: 'Amlodipine', dosage: '10mg', quantity: 30, frequency: 'Once daily', duration: '30 days', instructions: 'Take in the morning' },
    { id: 7, prescription_id: 4, drug_name: 'Losartan', dosage: '50mg', quantity: 30, frequency: 'Once daily', duration: '30 days', instructions: 'May be taken with or without food' },
  ],
}

// ── Prescription Events ───────────────────────────────────────────────────────
const rxEvents: Record<number, PrescriptionEvent[]> = {
  1: [
    { id: 1, prescription_id: 1, event_type: 'ISSUED', actor_id: 10, actor: mockUsers[5], occurred_at: '2026-04-20T10:15:00Z', blockchain_tx_id: 'abc123def456' },
    { id: 2, prescription_id: 1, event_type: 'VERIFIED', actor_id: 20, actor: mockUsers[8], occurred_at: '2026-04-20T14:00:00Z', blockchain_tx_id: 'def456ghi789' },
    { id: 3, prescription_id: 1, event_type: 'DISPENSED', actor_id: 20, actor: mockUsers[8], occurred_at: '2026-04-20T14:10:00Z', blockchain_tx_id: 'ghi789jkl012' },
  ],
  2: [
    { id: 4, prescription_id: 2, event_type: 'ISSUED', actor_id: 11, actor: mockUsers[6], occurred_at: '2026-04-25T09:45:00Z', blockchain_tx_id: 'jkl012mno345' },
    { id: 5, prescription_id: 2, event_type: 'VERIFIED', actor_id: 20, actor: mockUsers[8], occurred_at: '2026-04-26T10:00:00Z', blockchain_tx_id: 'mno345pqr678' },
  ],
  3: [
    { id: 6, prescription_id: 3, event_type: 'ISSUED', actor_id: 10, actor: mockUsers[5], occurred_at: '2026-05-05T11:20:00Z', blockchain_tx_id: 'pqr678stu901' },
  ],
  4: [
    { id: 7, prescription_id: 4, event_type: 'ISSUED', actor_id: 11, actor: mockUsers[6], occurred_at: '2026-05-10T10:15:00Z', blockchain_tx_id: 'stu901vwx234' },
  ],
}

// ── Prescriptions ─────────────────────────────────────────────────────────────
export const mockPrescriptions: Prescription[] = [
  { id: 1, reference_no: 'RX-2026-0001', patient_record_id: 1, doctor_id: 1, patient_record: mockPatientRecords[0], doctor: mockDoctors[0], items: rxItems[1], events: rxEvents[1], issued_at: '2026-04-20T10:15:00Z', status: 'dispensed', blockchain_tx_id: 'abc123def456', created_at: '2026-04-20T10:15:00Z', updated_at: '2026-04-20T14:10:00Z' },
  { id: 2, reference_no: 'RX-2026-0002', patient_record_id: 2, doctor_id: 2, patient_record: mockPatientRecords[1], doctor: mockDoctors[1], items: rxItems[2], events: rxEvents[2], issued_at: '2026-04-25T09:45:00Z', status: 'verified', blockchain_tx_id: 'jkl012mno345', created_at: '2026-04-25T09:45:00Z', updated_at: '2026-04-26T10:00:00Z' },
  { id: 3, reference_no: 'RX-2026-0003', patient_record_id: 3, doctor_id: 1, patient_record: mockPatientRecords[2], doctor: mockDoctors[0], items: rxItems[3], events: rxEvents[3], issued_at: '2026-05-05T11:20:00Z', status: 'issued', blockchain_tx_id: 'pqr678stu901', created_at: '2026-05-05T11:20:00Z', updated_at: '2026-05-05T11:20:00Z' },
  { id: 4, reference_no: 'RX-2026-0004', patient_record_id: 4, doctor_id: 2, patient_record: mockPatientRecords[3], doctor: mockDoctors[1], items: rxItems[4], events: rxEvents[4], issued_at: '2026-05-10T10:15:00Z', status: 'issued', blockchain_tx_id: 'stu901vwx234', created_at: '2026-05-10T10:15:00Z', updated_at: '2026-05-10T10:15:00Z' },
]

// ── Billing Records ───────────────────────────────────────────────────────────
export const mockBillingRecords: BillingRecord[] = [
  { id: 1, patient_id: 1, appointment_id: 3, patient: mockPatients[0], amount: 500, status: 'paid', paymongo_id: 'pay_abc123', paid_at: '2026-04-20T15:00:00Z', created_at: '2026-04-20T10:00:00Z', updated_at: '2026-04-20T15:00:00Z' },
  { id: 2, patient_id: 2, appointment_id: 7, patient: mockPatients[1], amount: 750, status: 'pending', paymongo_id: null, paid_at: null, created_at: '2026-04-25T09:00:00Z', updated_at: '2026-04-25T09:00:00Z' },
  { id: 3, patient_id: 3, appointment_id: 8, patient: mockPatients[2], amount: 500, status: 'paid', paymongo_id: 'pay_def456', paid_at: '2026-05-05T12:00:00Z', created_at: '2026-05-05T11:00:00Z', updated_at: '2026-05-05T12:00:00Z' },
  { id: 4, patient_id: 1, appointment_id: 6, patient: mockPatients[0], amount: 750, status: 'pending', paymongo_id: null, paid_at: null, created_at: '2026-05-10T10:00:00Z', updated_at: '2026-05-10T10:00:00Z' },
]

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const mockAuditLogs: ActivityLog[] = [
  { id: 1, user_id: 10, user: mockUsers[5], action: 'CREATE', target_type: 'Prescription', target_id: 4, ip_address: '192.168.1.10', created_at: '2026-05-10T10:15:00Z' },
  { id: 2, user_id: 20, user: mockUsers[8], action: 'VERIFY', target_type: 'Prescription', target_id: 2, ip_address: '192.168.1.20', created_at: '2026-04-26T10:00:00Z' },
  { id: 3, user_id: 30, user: mockUsers[9], action: 'UPDATE', target_type: 'Appointment', target_id: 2, ip_address: '192.168.1.30', created_at: '2026-05-10T09:00:00Z' },
  { id: 4, user_id: 10, user: mockUsers[5], action: 'CREATE', target_type: 'PatientRecord', target_id: 4, ip_address: '192.168.1.10', created_at: '2026-05-10T10:00:00Z' },
  { id: 5, user_id: 40, user: mockUsers[10], action: 'VIEW', target_type: 'AuditLog', target_id: 0, ip_address: '192.168.1.40', created_at: '2026-05-11T08:00:00Z' },
  { id: 6, user_id: 11, user: mockUsers[6], action: 'CREATE', target_type: 'Prescription', target_id: 2, ip_address: '192.168.1.11', created_at: '2026-04-25T09:45:00Z' },
]
