import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, CheckCircle2, Calendar, Clock, User, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useDoctors } from '@/features/doctors/queries'
import { useCreateAppointment } from './queries'

const schema = z.object({
  doctor_id: z.string().min(1, 'Please select a doctor'),
  scheduled_date: z.string().min(1, 'Please select a date'),
  scheduled_time: z.string().min(1, 'Please select a time'),
  type: z.enum(['consultation', 'follow_up', 'emergency']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const TYPE_OPTIONS = [
  { value: 'consultation', label: 'Consultation', desc: 'General consultation visit' },
  { value: 'follow_up', label: 'Follow-up', desc: 'Follow-up on a previous visit' },
  { value: 'emergency', label: 'Emergency', desc: 'Urgent medical attention' },
]

function FieldLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
      <span className="text-slate-500">{icon}</span>
      {children}
    </label>
  )
}

const AM_SLOTS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30']
const PM_SLOTS = ['12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00']

function formatTime(v: string) {
  const [h, m] = v.split(':').map(Number)
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

function TimePicker({ value, onChange, hasError }: { value: string; onChange: (v: string) => void; hasError?: boolean }) {
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) setPeriod(parseInt(value.split(':')[0]) < 12 ? 'AM' : 'PM')
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const slots = period === 'AM' ? AM_SLOTS : PM_SLOTS

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
        className={`w-full h-10 flex items-center justify-between px-3 rounded-lg text-sm bg-white transition-all focus:outline-none focus:ring-2 focus:ring-teal-500`}
        style={{ border: `1px solid ${hasError ? '#f87171' : 'var(--color-border)'}` }}
      >
        <span className={value ? 'text-slate-700 font-medium' : 'text-slate-500'}>
          {value ? formatTime(value) : 'Select time…'}
        </span>
        <Clock size={14} className="text-slate-500 shrink-0" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1.5 w-full bg-white rounded-xl shadow-xl overflow-hidden"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {/* AM / PM toggle */}
          <div className="flex gap-1.5 p-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
            {(['AM', 'PM'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all ${
                  period === p ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Time slots */}
          <div className="p-2 grid grid-cols-2 gap-1">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => { onChange(slot); setOpen(false) }}
                className={`h-9 rounded-lg text-sm font-semibold transition-all ${
                  value === slot
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                {formatTime(slot)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BookAppointmentPage() {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const { data: doctorsData } = useDoctors()
  const createAppointment = useCreateAppointment()
  const doctors = doctorsData?.data ?? []

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'consultation' as const },
  })

  const selectedType = watch('type')
  const selectedDoctorId = watch('doctor_id')
  const selectedDoctor = doctors.find((d) => d.id === Number(selectedDoctorId))

  const onSubmit = async (data: FormData) => {
    await createAppointment.mutateAsync({
      doctor_id: Number(data.doctor_id),
      scheduled_at: `${data.scheduled_date}T${data.scheduled_time}:00`,
      type: data.type,
      notes: data.notes || undefined,
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center" style={{ border: '1px solid var(--color-border)' }}>
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Appointment Booked!</h3>
          <p className="text-sm text-slate-500 mb-6">
            Your appointment request has been submitted and is pending confirmation from your doctor.
          </p>
          <button
            onClick={() => navigate('/appointments')}
            className="bg-teal-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            View My Appointments
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/appointments')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Book an Appointment</h2>
          <p className="text-xs text-slate-500">Fill in the details below to request an appointment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <form onSubmit={handleSubmit(onSubmit)} className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Appointment Details</p>

            <div className="space-y-4">
              <div>
                <FieldLabel icon={<User size={13} />}>Select Doctor</FieldLabel>
                <select
                  {...register('doctor_id')}
                  className="w-full h-10 rounded-lg border text-sm text-slate-700 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  style={{ borderColor: errors.doctor_id ? '#ef4444' : 'var(--color-border)' }}
                >
                  <option value="">Choose a doctor…</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user?.name} — {d.specialization}
                    </option>
                  ))}
                </select>
                {errors.doctor_id && <p className="text-xs text-red-500 mt-1">{errors.doctor_id.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel icon={<Calendar size={13} />}>Date</FieldLabel>
                  <Input
                    type="date"
                    {...register('scheduled_date')}
                    min={new Date().toISOString().split('T')[0]}
                    className={`h-10 text-sm ${errors.scheduled_date ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {errors.scheduled_date && <p className="text-xs text-red-500 mt-1">{errors.scheduled_date.message}</p>}
                </div>
                <div>
                  <FieldLabel icon={<Clock size={13} />}>Time</FieldLabel>
                  <TimePicker
                    value={watch('scheduled_time') ?? ''}
                    onChange={(v) => setValue('scheduled_time', v, { shouldValidate: true })}
                    hasError={!!errors.scheduled_time}
                  />
                  {errors.scheduled_time && <p className="text-xs text-red-500 mt-1">{errors.scheduled_time.message}</p>}
                </div>
              </div>

              <div>
                <FieldLabel icon={<Calendar size={13} />}>Appointment Type</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex flex-col p-3 rounded-lg cursor-pointer transition-all ${selectedType === opt.value ? 'bg-teal-50 ring-2 ring-teal-500' : 'bg-slate-50 ring-1 ring-slate-200 hover:ring-slate-300'}`}
                    >
                      <input type="radio" {...register('type')} value={opt.value} className="sr-only" />
                      <span className={`text-xs font-semibold ${selectedType === opt.value ? 'text-teal-700' : 'text-slate-700'}`}>{opt.label}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel icon={<FileText size={13} />}>Notes (optional)</FieldLabel>
                <Textarea
                  {...register('notes')}
                  placeholder="Describe your symptoms or reason for visit…"
                  rows={3}
                  className="text-sm border-slate-200 resize-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 text-sm shadow-sm"
          >
            {isSubmitting ? 'Submitting…' : 'Book Appointment'}
          </button>
        </form>

        <div className="space-y-3">
          {selectedDoctor ? (
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-4" style={{ border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Selected Doctor</p>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-600 shrink-0">
                  {selectedDoctor.user?.name?.charAt(0) ?? 'D'}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{selectedDoctor.user?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedDoctor.specialization}</p>
                  <p className="text-xs font-mono text-slate-500 mt-1">PRC {selectedDoctor.license_no}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    License valid until {new Date(selectedDoctor.prc_expiry).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-4 text-center" style={{ border: '1px solid var(--color-border)' }}>
              <User size={20} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs text-slate-500">Select a doctor to see their details</p>
            </div>
          )}

          <div className="bg-teal-50 rounded-xl p-4" style={{ border: '1px solid hsl(168 45% 82%)' }}>
            <p className="text-xs font-semibold text-teal-700 mb-2">How it works</p>
            <ol className="text-xs text-teal-600 space-y-1 list-decimal list-inside">
              <li>Submit your appointment request</li>
              <li>Doctor confirms the schedule</li>
              <li>Visit the hospital at your scheduled time</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
