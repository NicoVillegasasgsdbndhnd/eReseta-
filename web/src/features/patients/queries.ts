import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Patient, Paginated } from '@/mocks/types'

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

export function useCreatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post<Patient>('/patients', data).then((r) => r.data),
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
