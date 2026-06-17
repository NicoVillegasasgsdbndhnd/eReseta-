import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight,
  User, Loader2, Calendar,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { useDoctors } from '@/features/doctors/queries'
import { useCreateAppointment } from './queries'

// ── Schema ─────────────────────────────────────────────────────────────────
const schema = z.object({
  doctor_id:      z.string().min(1, 'Please select a doctor'),
  scheduled_date: z.string().min(1, 'Please select a date'),
  scheduled_time: z.string().min(1, 'Please select a time'),
  type:           z.enum(['consultation', 'follow_up', 'emergency']),
  notes:          z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ── Constants ──────────────────────────────────────────────────────────────
const TYPE_OPTIONS = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow_up',    label: 'Follow-up'    },
  { value: 'emergency',    label: 'Emergency'     },
]

const AM_SLOTS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30']
const PM_SLOTS = ['12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00']
const ALL_SLOTS = [...AM_SLOTS, ...PM_SLOTS]

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

// Rotating palette for doctor avatars
const AVATAR_COLORS = [
  { bg: 'hsl(201 60% 90%)', fg: 'hsl(201 100% 30%)' },
  { bg: 'hsl(270 50% 90%)', fg: 'hsl(270 60% 35%)' },
  { bg: 'hsl(175 50% 88%)', fg: 'hsl(175 60% 28%)' },
  { bg: 'hsl(38  70% 88%)', fg: 'hsl(38  80% 32%)' },
]

// ── Helpers ────────────────────────────────────────────────────────────────
function formatTime(v: string) {
  const [h, m] = v.split(':').map(Number)
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// Use local date to avoid UTC-offset issues in PH timezone
function toLocalIso(d: Date): string {
  const y  = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

function buildCalendarCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1).getDay()
  const count = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= count; d++) cells.push(new Date(year, month, d))
  return cells
}

// ── MiniCalendar ───────────────────────────────────────────────────────────
interface MiniCalendarProps {
  value:         string
  onChange:      (iso: string) => void
  viewMonth:     Date
  onMonthChange: (d: Date) => void
}

function MiniCalendar({ value, onChange, viewMonth, onMonthChange }: MiniCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = toLocalIso(today)

  const yr    = viewMonth.getFullYear()
  const mo    = viewMonth.getMonth()
  const cells = buildCalendarCells(yr, mo)

  const isThisMonth = yr === today.getFullYear() && mo === today.getMonth()

  const goPrev = () => {
    if (!isThisMonth) onMonthChange(new Date(yr, mo - 1, 1))
  }
  const goNext = () => {
    const n   = new Date(yr, mo + 1, 1)
    const max = new Date(today.getFullYear(), today.getMonth() + 6, 1)
    if (n <= max) onMonthChange(n)
  }

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={isThisMonth}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          style={{ color: 'hsl(215 16% 45%)' }}
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
          {MONTHS[mo]} {yr}
        </p>
        <button
          type="button"
          onClick={goNext}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
          style={{ color: 'hsl(215 16% 45%)' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-[11px] font-semibold py-1" style={{ color: 'hsl(215 16% 55%)' }}>
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />

          const iso        = toLocalIso(day)
          const isPast     = day < today
          const isToday    = iso === todayIso
          const isSelected = iso === value

          let circleBg    = 'transparent'
          let circleColor = 'hsl(215 30% 14%)'
          let fontWeight  = '400'
          let boxShadow   = 'none'

          if (isSelected) {
            circleBg    = 'hsl(201 100% 36%)'
            circleColor = 'white'
            fontWeight  = '600'
          } else if (isPast) {
            circleColor = 'hsl(215 16% 75%)'
          } else if (isToday) {
            circleColor = 'hsl(201 100% 36%)'
            fontWeight  = '700'
            boxShadow   = '0 0 0 2px hsl(201 100% 36%)'
          }

          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => onChange(iso)}
              className="flex flex-col items-center py-0.5 rounded-lg hover:bg-slate-50 disabled:hover:bg-transparent transition-colors"
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ backgroundColor: circleBg, color: circleColor, fontWeight, boxShadow }}
              >
                {day.getDate()}
              </span>
              {/* Availability dot on future dates */}
              {!isPast && !isSelected && (
                <span
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ backgroundColor: 'hsl(201 100% 55%)', opacity: 0.55 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── BookAppointmentPage ────────────────────────────────────────────────────
export default function BookAppointmentPage() {
  const navigate = useNavigate()
  const [submitted,  setSubmitted]  = useState(false)
  const [viewMonth, setViewMonth]  = useState(() => new Date())

  const { data: doctorsData, isLoading: doctorsLoading } = useDoctors()
  const createAppointment = useCreateAppointment()
  const doctors = doctorsData?.data ?? []

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver:      zodResolver(schema),
    defaultValues: { type: 'consultation' },
  })

  const selectedType     = watch('type')
  const selectedDoctorId = watch('doctor_id')
  const selectedDate     = watch('scheduled_date')
  const selectedTime     = watch('scheduled_time')
  const selectedDoctor   = doctors.find((d) => d.id === Number(selectedDoctorId))

  // On today, hide already-past time slots
  const todayIso = toLocalIso(new Date())
  const visibleSlots = ALL_SLOTS.filter((slot) => {
    if (selectedDate !== todayIso) return true
    const [h, m] = slot.split(':').map(Number)
    const now = new Date()
    return h * 60 + m > now.getHours() * 60 + now.getMinutes()
  })

  const onSubmit = async (data: FormData) => {
    await createAppointment.mutateAsync({
      doctor_id:    Number(data.doctor_id),
      scheduled_at: `${data.scheduled_date}T${data.scheduled_time}:00`,
      type:         data.type,
      notes:        data.notes || undefined,
    })
    setSubmitted(true)
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
            <p className="flex items-center gap-2 text-sm font-semibold mb-4" style={{ color: 'hsl(215 30% 14%)' }}>
              <User size={15} style={{ color: 'hsl(201 100% 36%)' }} />
              Select a doctor
            </p>

            {doctorsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-slate-300" />
              </div>
            ) : doctors.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'hsl(215 16% 55%)' }}>
                No doctors available.
              </p>
            ) : (
              <div className="space-y-2">
                {doctors.map((doctor, idx) => {
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
                        const isSel = slot === selectedTime
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setValue('scheduled_time', slot, { shouldValidate: true })}
                            className={`h-9 rounded-lg text-xs font-semibold transition-all ${
                              isSel ? '' : 'bg-white hover:bg-slate-50'
                            }`}
                            style={
                              isSel
                                ? { backgroundColor: 'hsl(201 100% 36%)', color: 'white' }
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

          {/* Type selection — stacked list */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(215 16% 50%)' }}>Type</p>
            <div className="space-y-1.5">
              {TYPE_OPTIONS.map((opt) => {
                const isActive = selectedType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue('type', opt.value as FormData['type'])}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive ? '' : 'bg-white hover:bg-slate-50'
                    }`}
                    style={
                      isActive
                        ? {
                            border:          '2px solid hsl(201 100% 36%)',
                            color:           'hsl(201 100% 30%)',
                            backgroundColor: 'hsl(201 60% 97%)',
                          }
                        : {
                            border: '1px solid hsl(210 18% 88%)',
                            color:  'hsl(215 16% 40%)',
                          }
                    }
                  >
                    {opt.label}
                  </button>
                )
              })}
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
