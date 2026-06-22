import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, CheckCircle2,
  User, Loader2, Calendar, AlertTriangle, Stethoscope,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { useDoctors, useDoctorLeaves } from '@/features/doctors/queries'
import { useCreateAppointment, useDoctorAvailability } from './queries'
import type { Appointment } from '@/mocks/types'
import MiniCalendar from '@/components/common/MiniCalendar'
import { formatTime, visibleSlotsForDate } from '@/lib/slots'
import { AVATAR_COLORS } from '@/lib/avatar'

// ── Schema ─────────────────────────────────────────────────────────────────
const schema = z.object({
  doctor_id:      z.string().min(1, 'Please select a doctor'),
  scheduled_date: z.string().min(1, 'Please select a date'),
  scheduled_time: z.string().min(1, 'Please select a time'),
  notes:          z.string().optional(),
})
type FormData = z.infer<typeof schema>

// Patients always book a "consultation" (mentor review 2026-06-18). Follow-ups
// are scheduled for the patient by the doctor/staff during a consultation, so the
// patient booking form no longer exposes an appointment-type selector.

// ── BookAppointmentPage ────────────────────────────────────────────────────
export default function BookAppointmentPage() {
  const navigate = useNavigate()
  const [submitted,  setSubmitted]  = useState(false)
  const [viewMonth, setViewMonth]  = useState(() => new Date())
  const [bookingError, setBookingError] = useState<string | null>(null)

  const [specialty, setSpecialty] = useState<string>('all')

  const { data: doctorsData, isLoading: doctorsLoading } = useDoctors()
  const createAppointment = useCreateAppointment()
  const doctors = doctorsData?.data ?? []

  // Distinct specializations for the "doctor category" filter (mentor review).
  const specialties = useMemo(() => {
    const set = new Set(doctors.map((d) => d.specialization).filter(Boolean) as string[])
    return ['all', ...Array.from(set).sort()]
  }, [doctors])

  const visibleDoctors = useMemo(
    () => (specialty === 'all' ? doctors : doctors.filter((d) => d.specialization === specialty)),
    [doctors, specialty],
  )

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const selectedDoctorId = watch('doctor_id')
  const selectedDate     = watch('scheduled_date')
  const selectedTime     = watch('scheduled_time')
  const selectedDoctor   = doctors.find((d) => d.id === Number(selectedDoctorId))

  // Already-reserved slots for this doctor+date — a booked slot auto-reserves and
  // can't be picked again (mentor review).
  const { data: availability } = useDoctorAvailability(
    selectedDoctorId ? Number(selectedDoctorId) : undefined,
    selectedDate,
  )
  const bookedTimes = useMemo(() => {
    const rows = (availability?.data ?? availability ?? []) as Appointment[]
    return new Set(
      rows
        .filter((a) => a.status !== 'cancelled' && a.status !== 'rescheduled')
        .map((a) => {
          const d = new Date(a.scheduled_at)
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        }),
    )
  }, [availability])

  // Doctor's blocked leave dates — disabled in the calendar (mentor review).
  const { data: leaves } = useDoctorLeaves(selectedDoctorId ? Number(selectedDoctorId) : undefined)
  const blockedDates = useMemo(
    () => new Set((leaves ?? []).map((l) => l.date.slice(0, 10))),
    [leaves],
  )

  // On today, hide already-past time slots
  const visibleSlots = selectedDate ? visibleSlotsForDate(selectedDate) : []

  const onSubmit = async (data: FormData) => {
    setBookingError(null)
    try {
      await createAppointment.mutateAsync({
        doctor_id:    Number(data.doctor_id),
        scheduled_at: `${data.scheduled_date}T${data.scheduled_time}:00`,
        type:         'consultation',
        notes:        data.notes || undefined,
      })
      setSubmitted(true)
    } catch (err) {
      // Surface the backend's reason — e.g. the slot is already booked or the patient already
      // has an appointment at this time (422).
      const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      setBookingError(
        e.response?.data?.errors?.scheduled_at?.[0] ??
        e.response?.data?.message ??
        'Could not book the appointment. Please try again.',
      )
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'hsl(215 30% 14%)' }}>
            Appointment Booked!
          </h3>
          <p className="text-sm mb-6" style={{ color: 'hsl(215 16% 50%)' }}>
            Your appointment request has been submitted and is pending confirmation from your doctor.
          </p>
          <button
            onClick={() => navigate('/appointments')}
            className="text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'hsl(201 100% 36%)' }}
          >
            View My Appointments
          </button>
        </div>
      </div>
    )
  }

  // ── Booking form ───────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/appointments')}
          className="flex items-center gap-1.5 text-sm bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors hover:text-slate-800"
          style={{ color: 'hsl(215 16% 50%)', border: '1px solid hsl(210 18% 88%)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
            Book an Appointment
          </h2>
          <p className="text-xs" style={{ color: 'hsl(215 16% 50%)' }}>
            Select a doctor, choose a date and time, then confirm
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5 items-start">

        {/* ── Left panel ── */}
        <div className="col-span-3 space-y-4">

          {/* 1. Doctor selection */}
          <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
            <p className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: 'hsl(215 30% 14%)' }}>
              <User size={15} style={{ color: 'hsl(201 100% 36%)' }} />
              Select a doctor
            </p>

            {/* Specialization filter (doctor category) */}
            {specialties.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {specialties.map((s) => {
                  const active = specialty === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpecialty(s)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                      style={
                        active
                          ? { backgroundColor: 'hsl(201 100% 36%)', color: 'white' }
                          : { border: '1px solid hsl(210 18% 88%)', color: 'hsl(215 16% 45%)' }
                      }
                    >
                      {s !== 'all' && <Stethoscope size={11} />}
                      {s === 'all' ? 'All specializations' : s}
                    </button>
                  )
                })}
              </div>
            )}

            {doctorsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-slate-300" />
              </div>
            ) : visibleDoctors.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'hsl(215 16% 55%)' }}>
                No doctors available.
              </p>
            ) : (
              <div className="space-y-2">
                {visibleDoctors.map((doctor, idx) => {
                  const col      = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                  const isChosen = String(doctor.id) === selectedDoctorId

                  return (
                    <button
                      key={doctor.id}
                      type="button"
                      onClick={() => {
                        setValue('doctor_id', String(doctor.id), { shouldValidate: true })
                        setValue('scheduled_date', '', { shouldValidate: false })
                        setValue('scheduled_time', '', { shouldValidate: false })
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        isChosen ? '' : 'bg-white hover:bg-slate-50'
                      }`}
                      style={
                        isChosen
                          ? { border: '2px solid hsl(201 100% 36%)', backgroundColor: 'hsl(201 60% 97%)' }
                          : { border: '1px solid hsl(210 18% 88%)' }
                      }
                    >
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ backgroundColor: col.bg, color: col.fg }}
                      >
                        {(doctor.user?.name ?? 'D').charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'hsl(215 30% 14%)' }}>
                          {doctor.user?.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'hsl(215 16% 50%)' }}>
                          {doctor.specialization} · DEAMHI Hospital
                        </p>
                      </div>

                      {/* Right: badge + checkmark */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                          Available
                        </span>
                        {isChosen && (
                          <CheckCircle2 size={18} style={{ color: 'hsl(201 100% 36%)' }} />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {errors.doctor_id && (
              <p className="text-xs text-red-500 mt-2">{errors.doctor_id.message}</p>
            )}
          </div>

          {/* 2. Calendar + time slots (revealed after doctor selected) */}
          {selectedDoctorId && (
            <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
              <p className="flex items-center gap-2 text-sm font-semibold mb-1" style={{ color: 'hsl(215 30% 14%)' }}>
                <Calendar size={15} style={{ color: 'hsl(201 100% 36%)' }} />
                Pick a date
              </p>
              <p className="text-xs mb-4" style={{ color: 'hsl(215 16% 55%)' }}>
                Highlighted dates have available slots
              </p>

              <MiniCalendar
                value={selectedDate}
                onChange={(iso) => {
                  setValue('scheduled_date', iso, { shouldValidate: true })
                  setValue('scheduled_time', '',  { shouldValidate: false })
                }}
                viewMonth={viewMonth}
                onMonthChange={setViewMonth}
                blockedDates={blockedDates}
              />

              {errors.scheduled_date && !selectedDate && (
                <p className="text-xs text-red-500 mt-2">{errors.scheduled_date.message}</p>
              )}

              {/* Time slot grid */}
              {selectedDate && (
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid hsl(210 18% 93%)' }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(215 16% 45%)' }}>
                    Available slots —{' '}
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', {
                      month: 'long', day: 'numeric',
                    })}
                  </p>

                  {visibleSlots.length === 0 ? (
                    <p className="text-xs text-center py-3" style={{ color: 'hsl(215 16% 55%)' }}>
                      No slots available for today. Please select another date.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {visibleSlots.map((slot) => {
                        const isSel    = slot === selectedTime
                        const isBooked = bookedTimes.has(slot)
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={isBooked}
                            onClick={() => setValue('scheduled_time', slot, { shouldValidate: true })}
                            title={isBooked ? 'Already reserved' : undefined}
                            className={`h-9 rounded-lg text-xs font-semibold transition-all ${
                              isSel ? '' : isBooked ? 'cursor-not-allowed line-through' : 'bg-white hover:bg-slate-50'
                            }`}
                            style={
                              isSel
                                ? { backgroundColor: 'hsl(201 100% 36%)', color: 'white' }
                                : isBooked
                                  ? { border: '1px solid hsl(210 18% 92%)', color: 'hsl(215 16% 75%)', backgroundColor: 'hsl(210 18% 97%)' }
                                  : { border: '1px solid hsl(210 18% 88%)', color: 'hsl(215 30% 20%)' }
                            }
                          >
                            {formatTime(slot)}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {errors.scheduled_time && !selectedTime && (
                    <p className="text-xs text-red-500 mt-2">{errors.scheduled_time.message}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div
          className="col-span-2 bg-white rounded-xl p-5 sticky top-24 self-start"
          style={{ border: '1px solid hsl(210 18% 88%)' }}
        >
          <p className="text-sm font-semibold mb-4" style={{ color: 'hsl(215 30% 14%)' }}>
            Appointment details
          </p>

          {/* Type — patients book consultations only (auto-set); no selector. */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(215 16% 50%)' }}>Type</p>
            <div
              className="w-full px-3 py-2.5 rounded-lg text-sm font-medium"
              style={{
                border:          '1px solid hsl(201 60% 85%)',
                color:           'hsl(201 100% 30%)',
                backgroundColor: 'hsl(201 60% 97%)',
              }}
            >
              Consultation
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(215 16% 50%)' }}>
              Notes{' '}
              <span className="font-normal" style={{ color: 'hsl(215 16% 65%)' }}>(optional)</span>
            </p>
            <Textarea
              {...register('notes')}
              placeholder="Describe your symptoms or reason for visit…"
              rows={3}
              className="text-sm resize-none"
              style={{ borderColor: 'hsl(210 18% 88%)' }}
            />
          </div>

          {/* Live booking summary */}
          {selectedDoctor && selectedDate && selectedTime && (
            <div
              className="rounded-xl p-3 mb-4"
              style={{
                backgroundColor: 'hsl(152 50% 96%)',
                border:          '1px solid hsl(152 40% 82%)',
              }}
            >
              <p className="text-[11px] font-bold mb-1" style={{ color: 'hsl(152 50% 32%)' }}>
                ✓ Selected
              </p>
              <p className="text-sm font-semibold" style={{ color: 'hsl(152 40% 22%)' }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}{' · '}{formatTime(selectedTime)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(152 40% 32%)' }}>
                {selectedDoctor.user?.name}
              </p>
            </div>
          )}

          {/* Booking error (e.g. slot already taken) */}
          {bookingError && (
            <div
              className="rounded-xl px-3 py-2.5 mb-3 text-xs font-medium text-red-600 bg-red-50 flex items-start gap-1.5"
              style={{ border: '1px solid hsl(0 80% 90%)' }}
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {bookingError}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || !selectedDoctorId || !selectedDate || !selectedTime}
            className="w-full h-11 rounded-xl font-semibold text-sm text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'hsl(201 100% 36%)' }}
          >
            {isSubmitting ? 'Booking…' : '✓ Book appointment'}
          </button>

          {Object.keys(errors).length > 0 && (
            <p className="text-xs text-red-500 mt-2 text-center">
              Please complete all required fields above.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
