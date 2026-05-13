import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ActivityLog, Paginated } from '@/mocks/types'

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.get<Record<string, number>>('/dashboard/summary').then((r) => r.data),
  })
}

export function useAppointmentStats() {
  return useQuery({
    queryKey: ['dashboard', 'appointment-stats'],
    queryFn: () =>
      api
        .get<{
          by_status: Record<string, number>
          by_doctor: { doctor: string | null; count: number }[]
        }>('/dashboard/appointment-stats')
        .then((r) => r.data),
  })
}

export function usePrescriptionActivity() {
  return useQuery({
    queryKey: ['dashboard', 'prescription-activity'],
    queryFn: () =>
      api
        .get<{
          by_status: Record<string, number>
          recent: {
            reference_no: string
            patient: string | null
            doctor: string | null
            status: string
            issued_at: string
          }[]
        }>('/dashboard/prescription-activity')
        .then((r) => r.data),
  })
}

export function useAuditLogs(params?: { action?: string; page?: number }) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => api.get<Paginated<ActivityLog>>('/dashboard/audit-logs', { params }).then((r) => r.data),
  })
}
