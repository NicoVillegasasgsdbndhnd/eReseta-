import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { PatientRecord } from '@/mocks/types'

export interface ChartMedication {
  id: number
  drug_name: string
  dosage: string
  quantity: number
  quantity_unit: string | null
  frequency: string
  duration: string
  status: string
  reference_no: string
  issued_at: string | null
}

export interface ChartProcedure {
  id: number
  name: string
  category: 'procedure' | 'surgery'
  performed_at: string
  doctor: string | null
  notes: string | null
}

export interface ChartLabImaging {
  id: number
  reference_no: string
  ordered_at: string
  status: string
  doctor?: { user?: { name?: string } } | null
  items?: { id: number; test_name: string; clinical_reason: string | null }[]
}

export interface PatientChart {
  patient: { id: number; name: string; sex: string; dob: string }
  active_medications: ChartMedication[]
  encounters: PatientRecord[]
  procedures: ChartProcedure[]
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
