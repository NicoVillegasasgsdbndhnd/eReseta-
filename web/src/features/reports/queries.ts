import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export function useAppointmentReport(params?: {
  from?: string
  to?: string
  status?: string
  doctor_id?: number
}) {
  return useQuery({
    queryKey: ['reports', 'appointments', params],
    queryFn: () => api.get('/reports/appointments', { params }).then((r) => r.data),
  })
}

export function usePrescriptionReport(params?: {
  from?: string
  to?: string
  status?: string
}) {
  return useQuery({
    queryKey: ['reports', 'prescriptions', params],
    queryFn: () => api.get('/reports/prescriptions', { params }).then((r) => r.data),
  })
}
