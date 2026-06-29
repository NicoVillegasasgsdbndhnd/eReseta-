import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Paginated, Prescription } from '@/mocks/types'

export interface RxSafety {
  known_allergies: string | null
  active_medications: string[]
}

/** Patient allergies + active medication names for prescribing-safety checks. */
export function usePatientRxSafety(patientId: number | string | undefined) {
  return useQuery({
    queryKey: ['rx-safety', patientId],
    queryFn: () => api.get<RxSafety>(`/patients/${patientId}/rx-safety`).then((r) => r.data),
    enabled: !!patientId,
  })
}

export function usePrescriptions(params?: { status?: string; patient_id?: number | string; page?: number }) {
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

export interface DispensePayload {
  id: number | string
  /** Per-item actual amounts for partial dispensing. Omit to dispense the full prescribed amount. */
  items?: { id: number; dispensed_quantity: number }[]
}

export function useDispensePrescription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, items }: DispensePayload) =>
      api.put<Prescription>(`/prescriptions/${id}/dispense`, items ? { items } : undefined).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions'] }),
  })
}
