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
