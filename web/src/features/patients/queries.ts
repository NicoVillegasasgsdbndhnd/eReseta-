import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Patient, PatientRecord, Paginated } from '@/mocks/types'

export function usePatients(params?: { search?: string; page?: number }) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () => api.get<Paginated<Patient>>('/patients', { params }).then((r) => r.data),
  })
}

export function usePatient(id: number | string | undefined) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => api.get<Patient>(`/patients/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}



export type CreatePatientResponse = Patient & { temp_password?: string | null }

export function useCreatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post<CreatePatientResponse>('/patients', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export function usePatientRecords(patientId: number | string | undefined) {
  return useQuery({
    queryKey: ['patients', patientId, 'records'],
    queryFn: () => api.get<PatientRecord[]>(`/patients/${patientId}/records`).then((r) => r.data),
    enabled: !!patientId,
  })
}

export function useAllPatientRecords(params?: { doctor_id?: number | string; patient_id?: number | string; page?: number }) {
  return useQuery({
    queryKey: ['patient-records', params],
    queryFn: () => api.get<Paginated<PatientRecord>>('/patient-records', { params }).then((r) => r.data),
  })
}

export function useCreatePatientRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post<PatientRecord>('/patient-records', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-records'] })
      qc.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}


export function useUpdatePatientRecord(patientId?: number | string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) =>
      api.put<PatientRecord>(`/patient-records/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients', patientId, 'records'] })
      qc.invalidateQueries({ queryKey: ['patient-records'] })
    },
  })
}

export function useDeletePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => api.delete(`/patients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export function useUpdatePatient(id: number | string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) =>
      api.put<Patient>(`/patients/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['patients', id] })
    },
  })
}
