// ── Roles ────────────────────────────────────────────────────────────────────

export type Role = 'patient' | 'doctor' | 'pharmacist' | 'admin' | 'staff'

// ── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  address: string | null
  role: Role
  status: 'active' | 'inactive'
  must_change_password?: boolean
  profile_photo_url: string | null
  doctor?: ({
    id: number
    specialization: string
    license_no: string
    ptr_no?: string | null
    s2_license?: string | null
    signature?: string | null
    prc_expiry: string | null
  } & DoctorCredentials) | null
  assigned_doctor?: {
    id: number
    specialization: string
    user?: { id: number; name: string }
  } | null
  staff_request?: {
    id: number
    status: 'pending' | 'approved' | 'rejected'
  } | null
  created_at: string
  updated_at: string
}

// ── Staff Request ─────────────────────────────────────────────────────────────

export interface StaffRequest {
  id: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  staff_user: { id: number; name: string; email: string }
}

// ── Patient ───────────────────────────────────────────────────────────────────

export interface Patient {
  id: number
  patient_code?: string
  user_id: number
  user?: User
  dob: string
  sex: 'male' | 'female'
  address: string
  philhealth_no: string | null
  contact: string
  preferred_language?: string | null
  known_allergies?: string | null
  gov_id_type?: string | null
  gov_id_no?: string | null
  hmo_provider?: string | null
  hmo_policy_no?: string | null
  hmo_group_no?: string | null
  copay?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relation?: string | null
  created_at: string
  updated_at: string
}

// ── Doctor ────────────────────────────────────────────────────────────────────

// Mentor add-user credentialing fields. Most are nullable + only present for clinical/admin
// viewers (see DoctorResource access matrix). Patients receive only the public-facing subset.
export interface DoctorCredentials {
  suffix?: string | null
  gender?: 'male' | 'female' | 'other' | null
  date_of_birth?: string | null
  corporate_email?: string | null
  secure_phone?: string | null
  secretary_phone?: string | null
  clinic_email?: string | null
  trunkline_ext?: string | null
  profile_photo?: string | null
  signature_image?: string | null            // uploaded e-signature image URL
  philhealth_accreditation?: string | null   // PAN
  tin?: string | null                          // admin-only
  hospital_department?: string | null
  consultant_type?: string | null
  clinic_room_no?: string | null
  medical_society_affiliations?: string[] | null
  hmo_partners?: string[] | null
  clinic_available_days?: string[] | null
  consultation_fee?: string | number | null
  followup_fee?: string | number | null
  inpatient_fee?: string | number | null
  er_referral_fee?: string | number | null
}

export interface Doctor extends DoctorCredentials {
  id: number
  user_id: number
  user?: User
  license_no: string
  ptr_no?: string | null
  s2_license?: string | null
  signature?: string | null
  specialization: string
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

export type AppointmentType = 'consultation' | 'follow_up'

export interface Appointment {
  id: number
  patient_id: number | null
  doctor_id: number
  patient?: Patient | null
  doctor?: Doctor
  // Guest appointments (approved from a public request) have no patient account yet —
  // these snapshot fields carry the guest's name/contact until staff register them.
  guest_name?: string | null
  guest_contact?: string | null
  display_name?: string | null
  is_guest?: boolean
  scheduled_at: string
  status: AppointmentStatus
  cancelled_by?: 'patient' | 'clinic' | null
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
  visit_date: string
  chief_complaint: string
  diagnosis: string
  notes: string | null
  restriction_category?: string | null
  restricted_specialization?: string | null
  restriction_label?: string | null
  prescriptions?: Prescription[]
  diagnostic_orders?: DiagnosticOrder[]
  created_at: string
  updated_at: string
}

export type RestrictionCategory =
  | 'mental_health' | 'genetic' | 'substance_abuse' | 'vip' | 'patient_requested'

// ── Diagnostic / lab orders ────────────────────────────────────────────────

export interface DiagnosticTest {
  id: number
  name: string
  category: string | null
  is_available: boolean
}

export interface DiagnosticOrderItem {
  id: number
  test_name: string
  clinical_reason: string | null
}

export interface DiagnosticOrder {
  id: number
  reference_no: string
  patient_record_id: number
  doctor_id: number
  doctor?: Doctor
  ordered_at: string
  status: 'ordered' | 'completed' | 'cancelled'
  notes: string | null
  items: DiagnosticOrderItem[]
  created_at: string
}

// ── Prescription ──────────────────────────────────────────────────────────────

export type PrescriptionStatus = 'issued' | 'verified' | 'dispensed' | 'expired'

export interface PrescriptionItem {
  id: number
  prescription_id: number
  drug_name: string
  dosage: string
  quantity: number
  quantity_unit?: string | null
  frequency: string
  duration: string
  instructions: string | null
}

export interface PrescriptionEvent {
  id: number
  prescription_id: number
  event_type: 'ISSUED' | 'VERIFIED' | 'DISPENSED'
  actor_id: number
  actor?: User
  occurred_at: string
  blockchain_tx_id: string | null
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
  paymongo_id: string | null
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
  target_type: string
  target_id: number
  ip_address: string | null
  context?: string | null
  created_at: string
}

// ── Medicines (generic catalog) ───────────────────────────────────────────────

export interface Medicine {
  id: number
  generic_name: string
  brand_name: string | null
  dosage_form: string | null
  strength: string | null
  route: string | null
  is_available: boolean
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
