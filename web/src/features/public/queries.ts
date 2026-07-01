import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'

export interface PublicDoctor {
  id: number
  name: string | null
  specialization: string
  bio: string | null
}

export interface PublicAvailability {
  date: string
  booked: string[]   // ["09:00", ...]
  leaves: string[]   // ["2026-07-01", ...]
}

export interface AppointmentRequestPayload {
  full_name: string
  dob: string
  sex: 'male' | 'female' | 'other'
  mobile: string
  email: string
  doctor_id: number
  preferred_date: string // "YYYY-MM-DDTHH:MM:SS"
  reason?: string
}

export function usePublicDoctors() {
  return useQuery({
    queryKey: ['public', 'doctors'],
    queryFn: () => api.get<{ data: PublicDoctor[] }>('/public/doctors').then((r) => r.data.data),
  })
}

export function usePublicAvailability(doctorId: number | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['public', 'availability', doctorId, date],
    queryFn: () =>
      api
        .get<PublicAvailability>(`/public/doctors/${doctorId}/availability`, { params: { date } })
        .then((r) => r.data),
    enabled: !!doctorId && !!date,
  })
}

export interface AppointmentRequestResult {
  reference_no: string
  full_name: string
  doctor: string
  preferred_schedule: string
  message: string
}

export function useCreateAppointmentRequest() {
  return useMutation({
    mutationFn: (payload: AppointmentRequestPayload) =>
      api.post<AppointmentRequestResult>('/public/appointment-requests', payload)
        .then((r) => r.data),
  })
}
