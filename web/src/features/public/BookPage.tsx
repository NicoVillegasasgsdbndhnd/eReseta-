import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User, Loader2, Calendar, CheckCircle2, AlertTriangle, Stethoscope, ArrowRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import MiniCalendar from '@/components/common/MiniCalendar'
import { formatTime, visibleSlotsForDate } from '@/lib/slots'
import { avatarColor, initial } from '@/lib/avatar'
import { usePublicDoctors, usePublicAvailability, useCreateAppointmentRequest, type AppointmentRequestResult } from './queries'

const BLUE = 'hsl(201 100% 36%)'

const schema = z.object({
  doctor_id:      z.string().min(1, 'Please select a doctor'),
  scheduled_date: z.string().min(1, 'Please select a date'),
  scheduled_time: z.string().min(1, 'Please select a time'),
  full_name:      z.string().min(2, 'Please enter your full name'),
  dob:            z.string().min(1, 'Date of birth is required'),
  sex:            z.enum(['male', 'female', 'other'], { message: 'Please select your gender' }),
  mobile:         z.string().min(7, 'Please enter a valid mobile number'),
  email:          z.string().email('Please enter a valid email'),
  reason:         z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function BookPage() {
  const [params] = useSearchParams()
  const [viewMonth, setViewMonth] = useState(() => new Date())
  const [confirmation, setConfirmation] = useState<AppointmentRequestResult | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: doctors, isLoading: doctorsLoading } = usePublicDoctors()
  const createRequest = useCreateAppointmentRequest()
  const list = doctors ?? []

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const selectedDoctorId = watch('doctor_id')
  const selectedDate     = watch('scheduled_date')
  const selectedTime     = watch('scheduled_time')
  const selectedDoctor   = list.find((d) => d.id === Number(selectedDoctorId))


  useEffect(() => {
    const pre = params.get('doctor')
    if (pre && list.some((d) => d.id === Number(pre))) {
      setValue('doctor_id', pre, { shouldValidate: true })
    }
  }, [params, list, setValue])

  const { data: availability } = usePublicAvailability(
    selectedDoctorId ? Number(selectedDoctorId) : undefined,
    selectedDate || undefined,
  )
  const bookedTimes  = useMemo(() => new Set(availability?.booked ?? []), [availability])
  const blockedDates = useMemo(() => new Set(availability?.leaves ?? []), [availability])

  const visibleSlots = selectedDate ? visibleSlotsForDate(selectedDate) : []

  const specialties = useMemo(() => {
    const set = new Set(list.map((d) => d.specialization).filter(Boolean))
    return ['all', ...Array.from(set).sort()]
  }, [list])
  const [specialty, setSpecialty] = useState('all')
  const visibleDoctors = specialty === 'all' ? list : list.filter((d) => d.specialization === specialty)

  const onSubmit = async (data: FormData) => {
    setSubmitError(null)
    try {
      const res = await createRequest.mutateAsync({
        full_name:      data.full_name,
        dob:            data.dob,
        sex:            data.sex,
        mobile:         data.mobile,
        email:          data.email,
        doctor_id:      Number(data.doctor_id),
        preferred_date: `${data.scheduled_date}T${data.scheduled_time}:00`,
        reason:         data.reason || undefined,
      })
      setConfirmation(res)
    } catch (err) {
      const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      setSubmitError(
        e.response?.data?.errors?.scheduled_at?.[0] ??
        e.response?.data?.message ??
        'Could not submit your request. Please try again.',
      )
    }
  }


  if (confirmation) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16">
        <div className="bg-white rounded-2xl shadow-sm p-8" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>

          <div className="text-sm leading-relaxed text-slate-600 space-y-3">
            <p>Hello <span className="font-semibold text-slate-800">{confirmation.full_name}</span>,</p>
            <p>We have received your appointment request. The clinic will review it shortly.</p>

            <div className="rounded-xl px-4 py-3 space-y-2" style={{ backgroundColor: 'hsl(201 60% 96%)' }}>
              <p>
                <span className="text-slate-500">Reference No.: </span>
                <span className="font-mono font-bold" style={{ color: BLUE }}>{confirmation.reference_no}</span>
              </p>
              <p>
                <span className="text-slate-500">Doctor: </span>
                <span className="font-semibold text-slate-800">{confirmation.doctor}</span>
              </p>
              <p>
                <span className="text-slate-500">Preferred schedule: </span>
                <span className="font-semibold text-slate-800">{confirmation.preferred_schedule}</span>
              </p>
            </div>

            <p>Please keep your reference number. You will be contacted once it is approved.</p>
            <p>Thank you for choosing DEAMHI.</p>
            <p className="text-slate-500">
              Regards,<br />
              <span className="font-semibold" style={{ color: BLUE }}>eReseta+</span>
            </p>
          </div>

          <Link
            to="/"
            className="inline-block text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity mt-6"
            style={{ backgroundColor: BLUE }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(215 30% 14%)' }}>Request an Appointment</h1>
        <p className="text-sm text-slate-500 mt-1">
          No account needed. Pick a doctor and time, share a few details, and we'll confirm your visit.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-5 items-start">
        {/* Left: doctor + calendar */}
        <div className="col-span-3 space-y-4">
          {/* Doctor */}
          <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
            <p className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: 'hsl(215 30% 14%)' }}>
              <User size={15} style={{ color: BLUE }} /> Select a doctor
            </p>

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
                      style={active
                        ? { backgroundColor: BLUE, color: 'white' }
                        : { border: '1px solid hsl(210 18% 88%)', color: 'hsl(215 16% 45%)' }}
                    >
                      {s !== 'all' && <Stethoscope size={11} />}
                      {s === 'all' ? 'All' : s}
                    </button>
                  )
                })}
              </div>
            )}

            {doctorsLoading ? (
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
            ) : visibleDoctors.length === 0 ? (
              <p className="text-sm text-center py-4 text-slate-500">No doctors available.</p>
            ) : (
              <div className="space-y-2">
                {visibleDoctors.map((doctor, idx) => {
                  const col = avatarColor(idx)
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
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                      style={isChosen
                        ? { border: '2px solid hsl(201 100% 36%)', backgroundColor: 'hsl(201 60% 97%)' }
                        : { border: '1px solid hsl(210 18% 88%)' }}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: col.bg, color: col.fg }}>
                        {initial(doctor.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'hsl(215 30% 14%)' }}>{doctor.name}</p>
                        <p className="text-xs truncate text-slate-500">{doctor.specialization} · DEAMHI Hospital</p>
                      </div>
                      {isChosen && <CheckCircle2 size={18} style={{ color: BLUE }} className="shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
            {errors.doctor_id && <p className="text-xs text-red-500 mt-2">{errors.doctor_id.message}</p>}
          </div>

          {/* Calendar + slots */}
          {selectedDoctorId && (
            <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
              <p className="flex items-center gap-2 text-sm font-semibold mb-4" style={{ color: 'hsl(215 30% 14%)' }}>
                <Calendar size={15} style={{ color: BLUE }} /> Pick a date &amp; time
              </p>
              <MiniCalendar
                value={selectedDate}
                onChange={(iso) => {
                  setValue('scheduled_date', iso, { shouldValidate: true })
                  setValue('scheduled_time', '', { shouldValidate: false })
                }}
                viewMonth={viewMonth}
                onMonthChange={setViewMonth}
                blockedDates={blockedDates}
              />
              {errors.scheduled_date && !selectedDate && <p className="text-xs text-red-500 mt-2">{errors.scheduled_date.message}</p>}

              {selectedDate && (
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid hsl(210 18% 93%)' }}>
                  <p className="text-xs font-semibold mb-3 text-slate-500">
                    Available slots — {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })}
                  </p>
                  {visibleSlots.length === 0 ? (
                    <p className="text-xs text-center py-3 text-slate-500">No slots left today. Please pick another date.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {visibleSlots.map((slot) => {
                        const isSel = slot === selectedTime
                        const isBooked = bookedTimes.has(slot)
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={isBooked}
                            onClick={() => setValue('scheduled_time', slot, { shouldValidate: true })}
                            title={isBooked ? 'Already reserved' : undefined}
                            className={`h-9 rounded-lg text-xs font-semibold transition-all ${isSel ? '' : isBooked ? 'cursor-not-allowed line-through' : 'bg-white hover:bg-slate-50'}`}
                            style={isSel
                              ? { backgroundColor: BLUE, color: 'white' }
                              : isBooked
                                ? { border: '1px solid hsl(210 18% 92%)', color: 'hsl(215 16% 75%)', backgroundColor: 'hsl(210 18% 97%)' }
                                : { border: '1px solid hsl(210 18% 88%)', color: 'hsl(215 30% 20%)' }}
                          >
                            {formatTime(slot)}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {errors.scheduled_time && !selectedTime && <p className="text-xs text-red-500 mt-2">{errors.scheduled_time.message}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: guest details */}
        <div className="col-span-2 bg-white rounded-xl p-5 sticky top-24 self-start" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'hsl(215 30% 14%)' }}>Your details</p>

          <div className="space-y-3">
            <Field label="Full name" error={errors.full_name?.message}>
              <Input {...register('full_name')} placeholder="Juan Dela Cruz" className="h-10 text-sm" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date of birth" error={errors.dob?.message}>
                <Input type="date" {...register('dob')} className="h-10 text-sm" />
              </Field>
              <Field label="Gender" error={errors.sex?.message}>
                <select {...register('sex')} className="h-10 w-full text-sm rounded-md px-2" style={{ border: '1px solid hsl(210 18% 88%)' }} defaultValue="">
                  <option value="" disabled>Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>
            <Field label="Mobile number" error={errors.mobile?.message}>
              <Input {...register('mobile')} placeholder="09XXXXXXXXX" className="h-10 text-sm" />
            </Field>
            <Field label="Email address" error={errors.email?.message}>
              <Input type="email" {...register('email')} placeholder="you@example.com" className="h-10 text-sm" />
            </Field>
            <Field label="Reason for visit (optional)">
              <Textarea {...register('reason')} rows={2} placeholder="Briefly describe your symptoms…" className="text-sm resize-none" />
            </Field>
          </div>

          {selectedDoctor && selectedDate && selectedTime && (
            <div className="rounded-xl p-3 mt-4" style={{ backgroundColor: 'hsl(152 50% 96%)', border: '1px solid hsl(152 40% 82%)' }}>
              <p className="text-[11px] font-bold mb-1" style={{ color: 'hsl(152 50% 32%)' }}>✓ Selected</p>
              <p className="text-sm font-semibold" style={{ color: 'hsl(152 40% 22%)' }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })} · {formatTime(selectedTime)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(152 40% 32%)' }}>{selectedDoctor.name}</p>
            </div>
          )}

          {submitError && (
            <div className="rounded-xl px-3 py-2.5 mt-3 text-xs font-medium text-red-600 bg-red-50 flex items-start gap-1.5" style={{ border: '1px solid hsl(0 80% 90%)' }}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {submitError}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl font-semibold text-sm text-white transition-opacity disabled:opacity-40 mt-4 inline-flex items-center justify-center gap-2"
            style={{ backgroundColor: BLUE }}
          >
            {isSubmitting ? 'Submitting…' : <>Submit request <ArrowRight size={15} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 text-slate-500">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
