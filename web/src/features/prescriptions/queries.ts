import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Paginated, Prescription } from '@/mocks/types'

export function usePrescriptions(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ['prescriptions', params],
    queryFn: () =>
      api.get<Paginated<Prescription>>('/prescriptions', { params }).then((r) => r.data),
  })
}

export function usePrescription(id: number | string | undefined) {
  return useQuery({
    queryKey: ['prescriptions', id],
    queryFn: () => api.get<Prescription>(`/prescriptions/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreatePrescription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) =>
      api.post<Prescription>('/prescriptions', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions'] }),
  })
}

export function useVerifyPrescription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) =>
      api.put<Prescription>(`/prescriptions/${id}/verify`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions'] }),
  })
}

export function useDispensePrescription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) =>
      api.put<Prescription>(`/prescriptions/${id}/dispense`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions'] }),
  })
}
