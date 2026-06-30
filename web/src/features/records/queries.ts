import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { BreakGlassAlert, PatientConsent, PatientRecord, Prescription } from '@/mocks/types'

/** An attached administrative document (ID, insurance card, intake/HIPAA form). */
export interface ChartDocument {
  id: number
  category: string
  category_label: string
  original_name: string
  url: string
  mime: string | null
  size: number
  uploaded_at: string | null
}

export const DOCUMENT_CATEGORIES: { value: string; label: string }[] = [
  { value: 'id',        label: 'Government ID' },
  { value: 'insurance', label: 'Insurance / HMO Card' },
  { value: 'intake',    label: 'Intake Form' },
  { value: 'hipaa',     label: 'HIPAA / Privacy Consent' },
  { value: 'other',     label: 'Other Document' },
]

/** One restricted record in the chart's Restricted Files list. Content is null while locked. */
export interface RestrictedFile {
  id: number
  visit_date: string | null
  restriction_category: string
  restriction_label: string
  restricted_specialization: string | null
  doctor_name: string | null
  locked: boolean
  record: PatientRecord | null
}

export interface ChartLabImaging {
  id: number
  reference_no: string
  patient_record_id: number
  ordered_at: string
  status: string
  doctor?: { user?: { name?: string } } | null
  items?: { id: number; test_name: string; clinical_reason: string | null }[]
}

export interface ChartPatient {
  id: number
  name: string
  patient_code: string
  sex: string
  dob: string | null
  age: number | null
  email: string | null
  contact: string | null
  address: string | null
  philhealth_no: string | null
  preferred_language: string | null
  known_allergies: string | null
  gov_id_type: string | null
  gov_id_no: string | null
  hmo_provider: string | null
  hmo_policy_no: string | null
  hmo_group_no: string | null
  copay: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relation: string | null
  registered_at: string | null
  visits_count: number
  rx_count: number
}

export interface PatientChart {
  patient: ChartPatient
  active_prescriptions: Prescription[]
  encounters: PatientRecord[]
  lab_imaging: ChartLabImaging[]
  restricted_files: RestrictedFile[]
  documents: ChartDocument[]
}

/** Reading a chart writes a READ audit entry on the server (auditing-on-read). */
export function usePatientChart(patientId: number | string | undefined) {
  return useQuery({
    queryKey: ['patient-chart', patientId],
    queryFn: () => api.get<PatientChart>(`/patients/${patientId}/chart`).then((r) => r.data),
    enabled: !!patientId,
  })
}

/** The authenticated patient's OWN read-only chart (self-service portal). */
export function useMyChart(enabled = true) {
  return useQuery({
    queryKey: ['my-chart'],
    queryFn: () => api.get<PatientChart>('/me/chart').then((r) => r.data),
    enabled,
  })
}

/**
 * Audited emergency override that reveals one restricted record's content. The reveal is held in
 * local component state (not cached) so it does not persist past the session / a manual refresh.
 */
export function useBreakGlass() {
  return useMutation({
    mutationFn: ({ recordId, reason }: { recordId: number; reason: string }) =>
      api.post<PatientRecord>(`/patient-records/${recordId}/break-glass`, { reason }).then((r) => r.data),
  })
}

// ── RA 10173: DPA consent + chart-level break-glass ─────────────────────────────

/** Current DPA consent + history for a patient (staff/doctor/admin). */
export function usePatientConsent(patientId: number | string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['patient-consent', patientId],
    queryFn: () =>
      api.get<{ current: PatientConsent | null; history: PatientConsent[] }>(
        `/patients/${patientId}/consent`,
      ).then((r) => r.data),
    enabled: !!patientId && enabled,
  })
}

/** Record a DPA consent state (given / withdrawn) — clinic-mediated. */
export function useRecordConsent(patientId: number | string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { status: 'given' | 'withdrawn'; notes?: string }) =>
      api.post(`/patients/${patientId}/consent`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-consent', patientId] })
      qc.invalidateQueries({ queryKey: ['patient-chart', patientId] })
    },
  })
}

/** Doctor break-the-glass — emergency chart access with a justification (24h grant). */
export function useChartBreakGlass(patientId: number | string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) =>
      api.post(`/patients/${patientId}/break-glass`, { reason }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-chart', patientId] }),
  })
}

/** Admin Security Alerts — recent break-glass overrides. */
export function useBreakGlassAlerts(enabled = true) {
  return useQuery({
    queryKey: ['break-glass-alerts'],
    queryFn: () =>
      api.get<{ data: BreakGlassAlert[] }>('/break-glass-alerts').then((r) => r.data.data),
    enabled,
  })
}

/** Upload an administrative document for a patient (multipart). */
export function useUploadDocument(patientId: number | string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, category }: { file: File; category: string }) => {
      const form = new FormData()
      form.append('file', file)
      form.append('category', category)
      return api.post(`/patients/${patientId}/documents`, form).then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-chart', patientId] }),
  })
}

/** Delete an attached patient document. */
export function useDeleteDocument(patientId: number | string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: number) => api.delete(`/patient-documents/${documentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-chart', patientId] }),
  })
}
