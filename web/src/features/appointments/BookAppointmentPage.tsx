import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, CheckCircle2,
  User, Users, Loader2, Calendar, AlertTriangle, Stethoscope,
  Clock3, MapPin, Pill, ShieldCheck,
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

  // Category-first: no doctors are shown until a specialization is picked (mentor review).
  const [specialty, setSpecialty] = useState<string>('')

  const { data: doctorsData, isLoading: doctorsLoading } = useDoctors()
  const createAppointment = useCreateAppointment()
  const doctors = doctorsData?.data ?? []

  // Category tiles: "All doctors" + each distinct specialization, with a doctor count.
  const specialtyOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of doctors) {
      if (d.specialization) counts.set(d.specialization, (counts.get(d.specialization) ?? 0) + 1)
    }
    const list = Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ key: name, label: name, count }))
    return [{ key: 'all', label: 'All doctors', count: doctors.length }, ...list]
  }, [doctors])

  const visibleDoctors = useMemo(
    () => (specialty === 'all' ? doctors : specialty ? doctors.filter((d) => d.specialization === specialty) : []),
    [doctors, specialty],
  )

  // Auto-scroll: center the date card when a doctor is chosen, and the time slots when a date is.
  const dateRef  = useRef<HTMLDivElement>(null)
  const slotsRef = useRef<HTMLDivElement>(null)

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

  // When a doctor is picked, the date card appears — scroll it into the centre of the screen.
  useEffect(() => {
    if (selectedDoctorId) {
      requestAnimationFrame(() => dateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    }
  }, [selectedDoctorId])

  // When a date is picked, the time slots appear — scroll them into the centre of the screen.
  useEffect(() => {
    if (selectedDate) {
      requestAnimationFrame(() => slotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    }
  }, [selectedDate])

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
      <div className="mx-auto max-w-md">
        <div className="rounded-xl bg-white p-10 text-center shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-50">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">
            Appointment booked
          </h3>
          <p className="mb-6 text-sm text-slate-500">
            Your consultation slot is reserved. You can review the visit details anytime.
          </p>
          <button
            onClick={() => navigate('/appointments')}
            className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <div
          className="grid gap-5 p-5 md:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.75fr)]"
          style={{ background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(205 92% 30%) 58%, hsl(152 48% 35%) 100%)' }}
        >
          <div className="min-w-0 text-white">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
              <Calendar size={14} />
              Book a DEAMHI visit
            </div>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">Choose your physician, date, and time.</h1>
            <p className="mt-2 max-w-xl text-sm" style={{ color: 'rgba(255,255,255,0.76)' }}>
              Select an available doctor and reserve a consultation slot that fits your schedule.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { icon: <Stethoscope size={15} />, label: 'Physician selection' },
                { icon: <Clock3 size={15} />, label: 'Live slot availability' },
                { icon: <ShieldCheck size={15} />, label: 'Reserved immediately' },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}>
                  {item.icon}
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Booking summary</p>
            <div className="mt-4 space-y-3">
              {[
                { icon: Stethoscope, label: selectedDoctor?.user?.name ?? 'Select doctor', sub: selectedDoctor?.specialization ?? 'Required' },
                {
                  icon: Calendar,
                  label: selectedDate
                    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', { dateStyle: 'full' })
                    : 'Pick a date',
                  sub: selectedTime ? formatTime(selectedTime) : 'Required',
                },
                { icon: MapPin, label: 'DEAMHI Hospital', sub: 'Consultation' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={`${label}-${sub}`} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-900">{label}</span>
                    <span className="block truncate text-xs text-slate-500">{sub}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/appointments')}
          className="flex items-center gap-1.5 text-sm bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors hover:text-slate-800"
          style={{ color: 'hsl(215 16% 50%)', border: '1px solid hsl(210 18% 88%)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Book an Appointment</h2>
          <p className="text-xs text-slate-500">Pick a specialization and doctor, choose a date and time, then reserve.</p>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-12">

        {/* ── Left panel ── */}
        <div className="space-y-4 lg:col-span-8">

          {/* 1. Doctor selection */}
          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>
                  <User size={15} style={{ color: 'hsl(201 100% 36%)' }} />
                  Select a doctor
                </p>
                <p className="mt-1 text-xs" style={{ color: 'hsl(215 16% 50%)' }}>
                  Filter by specialization, then choose one physician for this visit.
                </p>
              </div>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold" style={{ color: 'hsl(215 16% 45%)' }}>
                {specialty ? visibleDoctors.length : doctors.length} available
              </span>
            </div>

            {specialtyOptions.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {specialtyOptions.map((opt) => {
                  const active = specialty === opt.key
                  const isAll  = opt.key === 'all'
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSpecialty(opt.key)
                        // Switching category clears any stale doctor / date / time selection.
                        setValue('doctor_id', '', { shouldValidate: false })
                        setValue('scheduled_date', '', { shouldValidate: false })
                        setValue('scheduled_time', '', { shouldValidate: false })
                      }}
                      className="flex min-w-fit items-center gap-2 rounded-full px-3 py-2 text-left transition-all hover:shadow-sm"
                      style={
                        active
                          ? { border: '2px solid hsl(201 100% 36%)', backgroundColor: 'hsl(201 60% 97%)' }
                          : { border: '1px solid hsl(210 18% 88%)', backgroundColor: 'white' }
                      }
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: active ? 'hsl(201 100% 36%)' : 'hsl(210 16% 95%)',
                          color:           active ? 'white' : 'hsl(201 100% 36%)',
                        }}
                      >
                        {isAll ? <Users size={15} /> : <Stethoscope size={15} />}
                      </div>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold leading-tight" style={{ color: 'hsl(215 30% 14%)' }}>
                          {opt.label}
                        </span>
                        <span className="block text-[11px]" style={{ color: 'hsl(215 16% 55%)' }}>
                          {opt.count} doctor{opt.count !== 1 ? 's' : ''}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {!specialty ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 py-8 text-center">
                <Stethoscope size={26} className="text-slate-300" />
                <p className="text-sm font-medium mt-2" style={{ color: 'hsl(215 16% 55%)' }}>
                  Choose a specialization to show available doctors.
                </p>
              </div>
            ) : doctorsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-slate-300" />
              </div>
            ) : visibleDoctors.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'hsl(215 16% 55%)' }}>
                No doctors available in this specialization.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
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
                      className={`flex min-h-[76px] w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                        isChosen ? '' : 'bg-white hover:bg-slate-50'
                      }`}
                      style={
                        isChosen
                          ? { border: '2px solid hsl(201 100% 36%)', backgroundColor: 'hsl(201 60% 97%)' }
                          : { border: '1px solid hsl(210 18% 88%)' }
                      }
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{ backgroundColor: col.bg, color: col.fg }}
                      >
                        {(doctor.user?.name ?? 'D').charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'hsl(215 30% 14%)' }}>
                          {doctor.user?.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'hsl(215 16% 50%)' }}>
                          {doctor.specialization || 'Physician'}
                        </p>
                        <p className="mt-0.5 text-[11px] truncate" style={{ color: 'hsl(215 16% 60%)' }}>
                          DEAMHI Hospital
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
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
            <div ref={dateRef} className="bg-white rounded-xl p-5 scroll-mt-24" style={{ border: '1px solid hsl(210 18% 88%)' }}>
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
                <div ref={slotsRef} className="mt-5 pt-4 scroll-mt-24" style={{ borderTop: '1px solid hsl(210 18% 93%)' }}>
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
          className="sticky top-24 self-start rounded-xl bg-white p-5 shadow-sm lg:col-span-4"
          style={{ border: '1px solid hsl(210 18% 88%)' }}
        >
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>
            <Pill size={15} style={{ color: 'hsl(201 100% 36%)' }} />
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
