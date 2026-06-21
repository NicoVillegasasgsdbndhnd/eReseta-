import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { PatientRecord, Prescription } from '@/mocks/types'

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
}

/** Reading a chart writes a READ audit entry on the server (auditing-on-read). */
export function usePatientChart(patientId: number | string | undefined) {
  return useQuery({
    queryKey: ['patient-chart', patientId],
    queryFn: () => api.get<PatientChart>(`/patients/${patientId}/chart`).then((r) => r.data),
    enabled: !!patientId,
  })
}
