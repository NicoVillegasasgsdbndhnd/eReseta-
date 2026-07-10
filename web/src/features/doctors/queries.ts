import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Doctor, Paginated } from '@/mocks/types'

export function useDoctors() {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get<Paginated<Doctor>>('/doctors').then((r) => r.data),
  })
}

export interface DoctorLeave {
  id: number
  date: string
  start_time: string | null
  end_time: string | null
  reason: string | null
}

export function useDoctorLeaves(doctorId: number | null | undefined) {
  return useQuery({
    queryKey: ['doctors', doctorId, 'leaves'],
    queryFn: () =>
      api.get<{ data: DoctorLeave[] }>(`/doctors/${doctorId}/leaves`).then((r) => r.data.data),
    enabled: !!doctorId,
  })
}

export function useAddDoctorLeave(doctorId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { date: string; start_time?: string; end_time?: string; reason?: string }) =>
      api.post(`/doctors/${doctorId}/leaves`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors', doctorId, 'leaves'] }),
  })
}

export function useAddMonthLeave(doctorId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { month: string; reason?: string }) =>
      api.post(`/doctors/${doctorId}/leaves/month`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors', doctorId, 'leaves'] }),
  })
}

export function useRemoveDoctorLeave(doctorId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (leaveId: number) => api.delete(`/doctors/${doctorId}/leaves/${leaveId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors', doctorId, 'leaves'] }),
  })
}
