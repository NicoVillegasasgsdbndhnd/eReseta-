import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Paginated, User, BillingRecord } from '@/mocks/types'

export function useUsers(params?: { role?: string; search?: string; page?: number }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api.get<Paginated<User>>('/users', { params }).then((r) => r.data),
  })
}

export function useBillingRecords(params?: { status?: string; patient_id?: number | string; page?: number }) {
  return useQuery({
    queryKey: ['billing-records', params],
    queryFn: () => api.get<Paginated<BillingRecord>>('/billing-records', { params }).then((r) => r.data),
  })
}

export function usePatientBillingSummary(patientId: number | string | undefined) {
  return useQuery({
    queryKey: ['patients', patientId, 'billing-summary'],
    queryFn: () => api.get(`/patients/${patientId}/billing-summary`).then((r) => r.data),
    enabled: !!patientId,
  })
}

export function useCreatePaymentLink() {
  return useMutation({
    mutationFn: (id: number | string) =>
      api.post<{ checkout_url: string; paymongo_id: string }>(`/billing-records/${id}/payment-link`)
        .then((r) => r.data),
  })
}

export function useMarkPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) =>
      api.post<BillingRecord>(`/billing-records/${id}/mark-paid`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing-records'] }),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post<User>('/users', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser(id: number | string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.put<User>(`/users/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
