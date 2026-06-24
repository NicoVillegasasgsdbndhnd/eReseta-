import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Appointment, Paginated } from '@/mocks/types'

export function useAppointments(params?: { status?: string; date?: string; page?: number }) {
  return useQuery({
    queryKey: ['appointments', params],
    queryFn: () => api.get<Paginated<Appointment>>('/appointments', { params }).then((r) => r.data),
  })
}

export function useAppointment(id: number | string | undefined) {
  return useQuery({
    queryKey: ['appointments', id],
    queryFn: () => api.get<Appointment>(`/appointments/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post<Appointment>('/appointments', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
      scheduled_at,
    }: {
      id: number | string
      status: string
      notes?: string
      scheduled_at?: string
    }) =>
      api
        .put<Appointment>(`/appointments/${id}/status`, { status, notes, scheduled_at })
        .then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['appointments', id] })
    },
  })
}

// ── Guest appointment requests (staff/admin review queue) ────────────────────
export interface AppointmentRequest {
  id: number
  reference_no: string
  full_name: string
  dob: string | null
  sex: string
  mobile: string
  email: string
  doctor_id: number
  doctor?: { id: number; specialization: string; user?: { name?: string } }
  preferred_date: string
  reason: string | null
  status: 'pending' | 'approved' | 'declined' | 'cancelled'
  appointment_id: number | null
  decline_reason: string | null
}

export function useAppointmentRequests(status?: string) {
  return useQuery({
    queryKey: ['appointment-requests', status],
    queryFn: () =>
      api
        .get<Paginated<AppointmentRequest>>('/appointment-requests', { params: status ? { status } : undefined })
        .then((r) => r.data),
  })
}

export function useApproveAppointmentRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.post<AppointmentRequest>(`/appointment-requests/${id}/approve`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointment-requests'] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export function useDeclineAppointmentRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decline_reason }: { id: number; decline_reason?: string }) =>
      api.post<AppointmentRequest>(`/appointment-requests/${id}/decline`, { decline_reason }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointment-requests'] }),
  })
}

export function useDoctorAvailability(
  doctorId: number | string | undefined,
  date: string,
) {
  return useQuery({
    queryKey: ['doctors', doctorId, 'availability', date],
    queryFn: () =>
      api
        .get(`/doctors/${doctorId}/availability`, { params: { date } })
        .then((r) => r.data),
    enabled: !!doctorId && !!date,
  })
}
