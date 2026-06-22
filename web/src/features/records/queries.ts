import { useMutation, useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { PatientRecord, Prescription } from '@/mocks/types'

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
}

/** Reading a chart writes a READ audit entry on the server (auditing-on-read). */
export function usePatientChart(patientId: number | string | undefined) {
  return useQuery({
    queryKey: ['patient-chart', patientId],
    queryFn: () => api.get<PatientChart>(`/patients/${patientId}/chart`).then((r) => r.data),
    enabled: !!patientId,
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
