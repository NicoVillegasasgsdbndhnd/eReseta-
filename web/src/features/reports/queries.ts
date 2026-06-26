import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { AppointmentStatus, AppointmentType, PrescriptionStatus } from '@/mocks/types'

export interface AppointmentReportRow {
  id: number
  patient: string | null
  doctor: string | null
  scheduled_at: string | null
  status: AppointmentStatus
  type: AppointmentType
}

export interface AppointmentReport {
  summary: {
    total: number
    by_status: Record<string, number>
    by_type: Record<string, number>
    served_rate: number
  }
  appointments: AppointmentReportRow[]
}

export interface PrescriptionReportRow {
  reference_no: string
  patient: string | null
  doctor: string | null
  items_count: number
  status: PrescriptionStatus
  issued_at: string
}

export interface PrescriptionReport {
  summary: {
    total: number
    by_status: Record<string, number>
  }
  prescriptions: PrescriptionReportRow[]
}

export function useAppointmentReport(params?: {
  from?: string
  to?: string
  status?: string
  doctor_id?: number
}) {
  return useQuery({
    queryKey: ['reports', 'appointments', params],
    queryFn: () => api.get<AppointmentReport>('/reports/appointments', { params }).then((r) => r.data),
  })
}

export function usePrescriptionReport(params?: {
  from?: string
  to?: string
  status?: string
}) {
  return useQuery({
    queryKey: ['reports', 'prescriptions', params],
    queryFn: () => api.get<PrescriptionReport>('/reports/prescriptions', { params }).then((r) => r.data),
  })
}
