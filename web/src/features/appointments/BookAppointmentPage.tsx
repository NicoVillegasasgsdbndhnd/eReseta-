import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, CheckCircle2, Calendar, Clock, User, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { mockDoctors } from '@/mocks/data'

const schema = z.object({
  doctor_id: z.string().min(1, 'Please select a doctor'),
  scheduled_date: z.string().min(1, 'Please select a date'),
  scheduled_time: z.string().min(1, 'Please select a time'),
  type: z.enum(['consultation', 'follow_up', 'emergency']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const TIMES = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM']

const TYPE_OPTIONS = [
  { value: 'consultation', label: 'Consultation', desc: 'First-time or general visit' },
  { value: 'follow_up', label: 'Follow-up', desc: 'Returning for ongoing treatment' },
  { value: 'emergency', label: 'Emergency', desc: 'Urgent medical attention' },
]

function FieldLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
      <span className="text-slate-400">{icon}</span>
      {children}
    </label>
  )
}

export default function BookAppointmentPage() {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'consultation' },
  })

  const selectedType = watch('type')
  const selectedDoctorId = watch('doctor_id')
  const selectedDoctor = mockDoctors.find((d) => d.id === Number(selectedDoctorId))

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 800))
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Appointment Booked!</h3>
          <p className="text-sm text-slate-500 mb-6">
            Your appointment request has been submitted and is pending confirmation from your doctor.
          </p>
          <button
            onClick={() => navigate('/appointments')}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
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
          style={{ border: '1px solid hsl(214 20% 90%)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Book an Appointment</h2>
          <p className="text-xs text-slate-500">Fill in the details below to request an appointment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main form */}
        <form onSubmit={handleSubmit(onSubmit)} className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">Appointment Details</p>

            <div className="space-y-4">
              <div>
                <FieldLabel icon={<User size={13} />}>Select Doctor</FieldLabel>
                <select
                  {...register('doctor_id')}
                  className="w-full h-10 rounded-lg border text-sm text-slate-700 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: errors.doctor_id ? '#ef4444' : 'hsl(214 20% 90%)' }}
                >
                  <option value="">Choose a doctor…</option>
                  {mockDoctors.map((d) => (
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
                  <select
                    {...register('scheduled_time')}
                    className="w-full h-10 rounded-lg border text-sm text-slate-700 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: errors.scheduled_time ? '#ef4444' : 'hsl(214 20% 90%)' }}
                  >
                    <option value="">Select time…</option>
                    {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.scheduled_time && <p className="text-xs text-red-500 mt-1">{errors.scheduled_time.message}</p>}
                </div>
              </div>

              <div>
                <FieldLabel icon={<Calendar size={13} />}>Appointment Type</FieldLabel>
                <div className="grid grid-cols-3 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex flex-col p-3 rounded-lg cursor-pointer transition-all ${selectedType === opt.value ? 'bg-blue-50 ring-2 ring-blue-500' : 'bg-slate-50 ring-1 ring-slate-200 hover:ring-slate-300'}`}
                    >
                      <input type="radio" {...register('type')} value={opt.value} className="sr-only" />
                      <span className={`text-xs font-semibold ${selectedType === opt.value ? 'text-blue-700' : 'text-slate-700'}`}>{opt.label}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
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
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 text-sm shadow-sm"
          >
            {isSubmitting ? 'Submitting…' : 'Book Appointment'}
          </button>
        </form>

        {/* Doctor preview */}
        <div className="space-y-3">
          {selectedDoctor ? (
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-4" style={{ border: '1px solid hsl(214 20% 90%)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Selected Doctor</p>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                  {selectedDoctor.user?.name?.charAt(4) ?? 'D'}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{selectedDoctor.user?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedDoctor.specialization}</p>
                  <p className="text-xs font-mono text-slate-400 mt-1">PRC {selectedDoctor.license_no}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    License valid until {new Date(selectedDoctor.prc_expiry).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-4 text-center" style={{ border: '1px solid hsl(214 20% 90%)' }}>
              <User size={20} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs text-slate-400">Select a doctor to see their details</p>
            </div>
          )}

          <div className="bg-blue-50 rounded-xl p-4" style={{ border: '1px solid hsl(214 60% 88%)' }}>
            <p className="text-xs font-semibold text-blue-700 mb-2">How it works</p>
            <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
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
