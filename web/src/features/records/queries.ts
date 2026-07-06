import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { BreakGlassAlert, PatientConsent, PatientRecord, Prescription } from '@/mocks/types'


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


export function usePatientChart(patientId: number | string | undefined) {
  return useQuery({
    queryKey: ['patient-chart', patientId],
    queryFn: () => api.get<PatientChart>(`/patients/${patientId}/chart`).then((r) => r.data),
    enabled: !!patientId,
  })
}


export function useMyChart(enabled = true) {
  return useQuery({
    queryKey: ['my-chart'],
    queryFn: () => api.get<PatientChart>('/me/chart').then((r) => r.data),
    enabled,
  })
}





export function useBreakGlass() {
  return useMutation({
    mutationFn: ({ recordId, reason }: { recordId: number; reason: string }) =>
      api.post<PatientRecord>(`/patient-records/${recordId}/break-glass`, { reason }).then((r) => r.data),
  })
}




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


export function useChartBreakGlass(patientId: number | string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) =>
      api.post(`/patients/${patientId}/break-glass`, { reason }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-chart', patientId] }),
  })
}



export interface PrivacyLogEntry {
  id: number
  actor_name: string
  actor_role: string | null
  action: string
  context: string | null
  at: string
}


export function useMyConsent() {
  return useQuery({
    queryKey: ['my-consent'],
    queryFn: () =>
      api.get<{ current: PatientConsent | null; history: PatientConsent[] }>('/me/consent').then((r) => r.data),
  })
}


export function useMyPrivacyLog() {
  return useQuery({
    queryKey: ['my-privacy-log'],
    queryFn: () => api.get<{ data: PrivacyLogEntry[] }>('/me/privacy-log').then((r) => r.data.data),
  })
}


export function useWithdrawMyConsent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/me/consent/withdraw').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-consent'] })
      qc.invalidateQueries({ queryKey: ['my-privacy-log'] })
    },
  })
}


export function useBreakGlassAlerts(enabled = true) {
  return useQuery({
    queryKey: ['break-glass-alerts'],
    queryFn: () =>
      api.get<{ data: BreakGlassAlert[] }>('/break-glass-alerts').then((r) => r.data.data),
    enabled,
  })
}


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


export function useDeleteDocument(patientId: number | string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: number) => api.delete(`/patient-documents/${documentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-chart', patientId] }),
  })
}
