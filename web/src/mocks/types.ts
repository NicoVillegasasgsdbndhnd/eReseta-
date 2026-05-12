// ── Roles ────────────────────────────────────────────────────────────────────

export type Role = 'patient' | 'doctor' | 'pharmacist' | 'admin' | 'it_admin'

// ── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  address: string | null
  role: Role
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

// ── Patient ───────────────────────────────────────────────────────────────────

export interface Patient {
  id: number
  user_id: number
  user?: User
  dob: string
  sex: 'male' | 'female'
  address: string
  philhealth_no: string | null
  contact: string
  created_at: string
  updated_at: string
}

// ── Doctor ────────────────────────────────────────────────────────────────────

export interface Doctor {
  id: number
  user_id: number
  user?: User
  license_no: string
  specialty: string
  prc_expiry: string
  created_at: string
  updated_at: string
}

export interface DoctorAvailability {
  doctor_id: number
  date: string
  slots: TimeSlot[]
}

export interface TimeSlot {
  time: string
  available: boolean
}

// ── Appointment ───────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'served'
  | 'rescheduled'
  | 'cancelled'

export type AppointmentType = 'in_person' | 'teleconsult'

export interface Appointment {
  id: number
  patient_id: number
  doctor_id: number
  patient?: Patient
  doctor?: Doctor
  scheduled_at: string
  status: AppointmentStatus
  type: AppointmentType
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AppointmentStatusHistory {
  id: number
  appointment_id: number
  from_status: AppointmentStatus | null
  to_status: AppointmentStatus
  changed_by: number
  changed_by_user?: User
  notes: string | null
  created_at: string
}

// ── Patient Record ────────────────────────────────────────────────────────────

export interface PatientRecord {
  id: number
  patient_id: number
  doctor_id: number
  patient?: Patient
  doctor?: Doctor
  record_date: string
  chief_complaint: string
  diagnosis: string
  notes: string | null
  created_at: string
  updated_at: string
}

// ── Prescription ──────────────────────────────────────────────────────────────

export type PrescriptionStatus = 'issued' | 'verified' | 'dispensed' | 'cancelled'

export interface PrescriptionItem {
  id: number
  prescription_id: number
  medication: string
  dosage: string
  qty: number
  frequency: string
  duration: string
}

export interface PrescriptionEvent {
  id: number
  prescription_id: number
  event_type: 'issued' | 'verified' | 'dispensed' | 'cancelled' | 'noted'
  actor_id: number
  actor?: User
  notes: string | null
  created_at: string
}

export interface Prescription {
  id: number
  reference_no: string
  patient_record_id: number
  doctor_id: number
  patient_record?: PatientRecord
  doctor?: Doctor
  items: PrescriptionItem[]
  events?: PrescriptionEvent[]
  issued_at: string
  status: PrescriptionStatus
  blockchain_tx_id: string | null
  created_at: string
  updated_at: string
}

// ── Billing ───────────────────────────────────────────────────────────────────

export type BillingStatus = 'pending' | 'paid' | 'waived'

export interface BillingRecord {
  id: number
  patient_id: number
  appointment_id: number
  patient?: Patient
  appointment?: Appointment
  amount: number
  status: BillingStatus
  paid_at: string | null
  created_at: string
  updated_at: string
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: number
  user_id: number
  user?: User
  action: string
  model_type: string
  model_id: number
  created_at: string
}

// ── API Pagination wrapper ────────────────────────────────────────────────────

export interface Paginated<T> {
  data: T[]
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}
