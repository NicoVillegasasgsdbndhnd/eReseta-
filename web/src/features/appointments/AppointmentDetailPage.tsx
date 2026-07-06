import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, User, Stethoscope, FileText, MapPin, RotateCcw, X, Loader2, Clock, ClipboardCheck, Mail, Phone, CreditCard, UserPlus, ShieldCheck } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import { useAuthStore } from '@/features/auth/authStore'
import { useAppointment, useUpdateAppointmentStatus } from './queries'

const TYPE_LABEL: Record<string, string> = {
  consultation: 'Consultation',
  follow_up:    'Follow-up',
}


const STATUS_TEXT: Record<string, string> = {
  scheduled:   'Reserved',
  rescheduled: 'Rescheduled',
  confirmed:   'Confirmed',
  served:      'Completed',
  cancelled:   'Cancelled',
}

function countdownLabel(iso: string, now: Date): string {
  const diffMs = new Date(iso).getTime() - now.getTime()
  if (diffMs <= 0) return 'Ready now'

  const totalMinutes = Math.ceil(diffMs / 60_000)
  if (totalMinutes < 60) return `${totalMinutes} min`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours < 24) return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days} day${days === 1 ? '' : 's'} ${remainingHours} hr` : `${days} day${days === 1 ? '' : 's'}`
}

function InfoCard({ title, icon, color, children }: {
  title: string; icon: React.ReactNode; color: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      </div>
      {children}
    </div>
  )
}

export default function AppointmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: appt, isLoading } = useAppointment(id)
  const updateStatus = useUpdateAppointmentStatus()

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showReschedule, setShowReschedule] = useState(false)
  const [showCancelChoice, setShowCancelChoice] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [rescheduleNotes, setRescheduleNotes] = useState('')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  if (!appt) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center" style={{ border: '1px solid var(--color-border)' }}>
        <p className="text-lg font-semibold text-slate-700 mb-2">Appointment not found</p>
        <button onClick={() => navigate('/appointments')} className="text-sm text-teal-600 hover:underline">
          ← Back to Appointments
        </button>
      </div>
    )
  }

  const status = appt.status
  const isStaff = user?.role === 'staff'
  const isPatient = user?.role === 'patient'
  const canRegisterGuest = user?.role === 'staff' || user?.role === 'admin'

  const canRegisterNow = true
  const canManage = user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'staff'
  const isTerminal = status === 'served' || status === 'cancelled'

  const statusText  = STATUS_TEXT[status] ?? status
  const canAct = canManage || user?.role === 'patient'
  const btnBase = 'flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-60'

  const runAction = async (action: string, next: string) => {
    setActionLoading(action)
    try {
      await updateStatus.mutateAsync({ id: appt.id, status: next })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReschedule = async () => {
    if (!newDate || !newTime) return
    setActionLoading('reschedule')
    try {
      await updateStatus.mutateAsync({
        id: appt.id,
        status: 'rescheduled',
        scheduled_at: `${newDate}T${newTime}:00`,
        notes: rescheduleNotes || undefined,
      })
      setShowReschedule(false)
      setNewDate('')
      setNewTime('')
      setRescheduleNotes('')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      {isPatient && (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => navigate('/appointments')}
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                style={{ border: '1px solid hsl(210 18% 88%)' }}
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <span className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-500 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
                Appointment #{appt.id}
              </span>
            </div>
          </div>

          <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
            <div
              className="grid gap-5 p-4 sm:p-6 md:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]"
              style={{ background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(205 92% 30%) 58%, hsl(152 48% 35%) 100%)' }}
            >
              <div className="min-w-0 text-white">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
                  <ShieldCheck size={14} />
                  Visit pass
                </div>
                <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                  {new Date(appt.scheduled_at).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h1>
                <p className="mt-2 max-w-xl text-sm" style={{ color: 'rgba(255,255,255,0.76)' }}>
                  Keep this page handy for your consultation schedule, physician details, and appointment status.
                </p>
                <div className="mt-5 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                  {[
                    { label: 'Time', value: new Date(appt.scheduled_at).toLocaleTimeString('en-PH', { timeStyle: 'short' }) },
                    { label: 'Type', value: TYPE_LABEL[appt.type] ?? appt.type },
                    { label: 'Status', value: statusText },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg px-3 py-2 sm:px-4" style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}>
                      <p className="text-base font-bold leading-none">{item.value}</p>
                      <p className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-lg">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Physician</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-lg font-bold text-sky-700">
                    {(appt.doctor?.user?.name ?? '?').replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-slate-900">{appt.doctor?.user?.name}</p>
                    <p className="truncate text-sm text-slate-500">{appt.doctor?.specialization ?? 'Physician'}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Clock size={16} />
                    </span>
                    <span className="font-medium">{countdownLabel(appt.scheduled_at, now)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                      <MapPin size={16} />
                    </span>
                    <span className="font-medium">DEAMHI Hospital</span>
                  </div>
                </div>
                {canAct && !isTerminal && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowReschedule((v) => !v)}
                      disabled={!!actionLoading}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60"
                    >
                      <RotateCcw size={14} /> Reschedule
                    </button>
                    <button
                      onClick={() => setShowCancelChoice(true)}
                      disabled={!!actionLoading}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
                    >
                      <X size={14} /> {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {/* ── Header (white, date-forward) ── */}
      <div
        className={`overflow-hidden rounded-xl bg-white p-5 shadow-sm ${isPatient ? 'hidden' : ''}`}
        style={{
          border: '1px solid hsl(210 18% 88%)',
          background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(205 92% 30%) 58%, hsl(152 48% 35%) 100%)',
        }}
      >
        <div className={`flex items-center justify-between gap-3 flex-wrap ${isPatient ? '' : 'mb-3'}`}>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => navigate('/appointments')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <span className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white" style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}>Appointment #{appt.id}</span>
          </div>

          {canAct && !isTerminal && !isPatient && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Guest appointment (approved request, no account yet): staff/admin register
                  the patient at the visit, creating the account from the intake form. */}
              {!appt.patient_id && canRegisterGuest && (
                <button
                  onClick={() => canRegisterNow && navigate(`/patients/new?appointment_id=${appt.id}`)}
                  disabled={!!actionLoading || !canRegisterNow}
                  title={canRegisterNow ? 'Register this guest as a patient' : 'Available at the scheduled appointment time'}
                  className={`${btnBase} border-transparent ${canRegisterNow ? 'text-white' : 'text-sky-500 cursor-not-allowed'}`}
                  style={{ backgroundColor: canRegisterNow ? 'hsl(201 100% 36%)' : 'hsl(201 85% 94%)' }}
                >
                  <UserPlus size={14} /> Register patient
                </button>
              )}
              {/* Doctor shortcut: jump straight to the New Record form for this patient. */}
              {user?.role === 'doctor' && appt.patient_id && (
                <button
                  onClick={() => navigate('/consultations', { state: { patientId: appt.patient_id } })}
                  disabled={!!actionLoading}
                  className={`${btnBase} bg-teal-600 hover:bg-teal-700 text-white border-teal-600`}
                >
                  <Stethoscope size={14} /> Start Consultation
                </button>
              )}
              {/* Reschedule = move a still-valid appointment to a better time. */}
              <button onClick={() => setShowReschedule((v) => !v)} disabled={!!actionLoading}
                className={`${btnBase} bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200`}>
                <RotateCcw size={14} /> Reschedule
              </button>
              <button onClick={() => user?.role === 'patient' ? setShowCancelChoice(true) : runAction('cancel', 'cancelled')} disabled={!!actionLoading}
                className={`${btnBase} bg-red-50 hover:bg-red-100 text-red-600 border-red-200`}>
                <X size={14} /> {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel'}
              </button>
            </div>
          )}
        </div>

        <h2 className={`text-2xl font-bold leading-tight text-white sm:text-3xl ${isPatient ? 'hidden' : ''}`}>
          {new Date(appt.scheduled_at).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
        <div className={`mt-2 flex flex-wrap items-center gap-2 text-sm text-white/80 ${isPatient ? 'hidden' : ''}`}>
          <span>{new Date(appt.scheduled_at).toLocaleTimeString('en-PH', { timeStyle: 'short' })}</span>
          <span className="text-slate-300">·</span>
          <span>DEAMHI Hospital</span>
          <span className="text-slate-300">·</span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold" style={{ color: 'hsl(201 100% 34%)' }}>{TYPE_LABEL[appt.type] ?? appt.type}</span>
        </div>
      </div>

      {/* ── 3-segment info strip — aligns above the cards ── */}
      <div className={`mb-4 grid grid-cols-1 gap-3 md:grid-cols-3 ${isPatient ? 'hidden' : ''}`}>
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
            <Clock size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Time until visit</p>
            <p className="truncate text-sm font-bold text-slate-800">{countdownLabel(appt.scheduled_at, now)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <User size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Physician</p>
            <p className="truncate text-sm font-bold text-slate-800">{appt.doctor?.user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <ClipboardCheck size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
            <p className={`truncate text-sm font-bold ${status === 'cancelled' ? 'text-red-600' : (status === 'scheduled' || status === 'rescheduled') ? 'text-amber-600' : 'text-slate-800'}`}>{statusText}</p>
          </div>
        </div>
      </div>

      {/* Cancel → confirmation with rebook vs fully cancel vs go back */}
      {showCancelChoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCancelChoice(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-800 mb-1">Are you sure you want to cancel this appointment?</h3>
            <p className="text-sm text-slate-500 mb-5">
              Please select an option below to proceed:
            </p>
            <div className="space-y-2">
              {/* Rebook = the original is being cancelled (dead); book a fresh appointment to replace it. */}
              <button
                onClick={async () => { setShowCancelChoice(false); await runAction('cancel', 'cancelled'); navigate('/appointments/new') }}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'hsl(201 100% 36%)' }}
              >
                <RotateCcw size={15} /> Cancel &amp; Rebook Later
              </button>
              <button
                onClick={async () => { setShowCancelChoice(false); await runAction('cancel', 'cancelled') }}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors"
              >
                <X size={15} /> Fully Cancel
              </button>
              <button
                onClick={() => setShowCancelChoice(false)}
                className="w-full h-10 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {showReschedule && (
        <div className="bg-amber-50 rounded-xl p-5 mb-4" style={{ border: '1px solid hsl(40 80% 85%)' }}>
          <p className="text-sm font-semibold text-amber-800 mb-3">Reschedule Appointment</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide">New Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full h-9 text-sm border border-amber-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide">New Time</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full h-9 text-sm border border-amber-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Notes (optional)</label>
              <textarea
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                placeholder="Reason for rescheduling…"
                rows={2}
                className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReschedule}
              disabled={!newDate || !newTime || actionLoading === 'reschedule'}
              className="text-sm font-semibold px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {actionLoading === 'reschedule' ? 'Saving…' : 'Confirm Reschedule'}
            </button>
            <button
              onClick={() => setShowReschedule(false)}
              className="text-sm font-semibold px-4 py-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isPatient && (
        <div className="mb-4 rounded-xl bg-white p-5 shadow-sm" style={{ border: '1px solid var(--color-border)' }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800">Visit information</p>
              <p className="text-xs text-slate-500">Patient, physician, appointment, and notes in one place.</p>
            </div>
            <StatusBadge status={status} cancelledBy={appt.cancelled_by} />
          </div>

          <div className="grid gap-3 lg:grid-cols-4">
            <section className="rounded-lg bg-slate-50 p-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <User size={15} />
                </span>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Patient</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold" style={{ backgroundColor: 'hsl(258 60% 92%)', color: 'hsl(258 70% 45%)' }}>
                  {(appt.patient?.user?.name ?? appt.guest_name ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{appt.patient?.user?.name ?? appt.guest_name ?? '-'}</p>
                  <p className="text-xs text-slate-500">{appt.patient_id ? 'Patient' : 'Guest'}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                {appt.patient_id ? (
                  <>
                    <p className="flex items-center gap-2"><Mail size={12} className="text-slate-400" /> <span className="truncate">{appt.patient?.user?.email}</span></p>
                    <p className="flex items-center gap-2"><Phone size={12} className="text-slate-400" /> {appt.patient?.contact}</p>
                  </>
                ) : (
                  <p className="flex items-center gap-2"><Phone size={12} className="text-slate-400" /> {appt.guest_contact ?? '-'}</p>
                )}
              </div>
            </section>

            <section className="rounded-lg bg-slate-50 p-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                  <Stethoscope size={15} />
                </span>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Physician</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold" style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 32%)' }}>
                  {(appt.doctor?.user?.name ?? '?').replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{appt.doctor?.user?.name}</p>
                  <p className="truncate text-xs text-slate-500">{appt.doctor?.specialization}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                <p className="flex items-center gap-2 font-mono"><CreditCard size={12} className="text-slate-400" /> {appt.doctor?.license_no}</p>
                <p className="flex items-center gap-2"><MapPin size={12} className="text-slate-400" /> DEAMHI Hospital</p>
              </div>
            </section>

            <section className="rounded-lg bg-slate-50 p-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Calendar size={15} />
                </span>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Appointment</p>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Appointment No.</p>
                  <p className="font-bold text-slate-800">#{appt.id}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Type</p>
                  <p className="text-sm font-semibold text-slate-700">{TYPE_LABEL[appt.type] ?? appt.type}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Booked on</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {new Date(appt.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-lg bg-slate-50 p-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <FileText size={15} />
                </span>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Notes</p>
              </div>
              {appt.notes ? (
                <p className="text-sm leading-6 text-slate-600">{appt.notes}</p>
              ) : (
                <div className="rounded-lg bg-white px-3 py-4 text-center" style={{ border: '1px dashed hsl(210 18% 86%)' }}>
                  <FileText size={22} strokeWidth={1.5} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-400">No notes yet</p>
                  <p className="mt-0.5 text-xs text-slate-400">Added by doctor after your visit</p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      <div className={`mb-4 rounded-xl bg-white p-5 shadow-sm ${isPatient ? 'hidden' : ''}`} style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-800">Appointment overview</p>
            <p className="text-xs text-slate-500">Patient, physician, schedule, and notes in one balanced panel.</p>
          </div>
          <StatusBadge status={status} cancelledBy={appt.cancelled_by} />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-lg bg-slate-50 p-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                <User size={15} />
              </span>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Patient</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold" style={{ backgroundColor: 'hsl(258 60% 92%)', color: 'hsl(258 70% 45%)' }}>
                {(appt.patient?.user?.name ?? appt.guest_name ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-800">{appt.patient?.user?.name ?? appt.guest_name ?? '-'}</p>
                <p className="text-xs text-slate-500">{appt.patient_id ? 'Registered patient' : 'Guest - not yet registered'}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {appt.patient_id ? (
                <>
                  <p className="flex min-w-0 items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500" style={{ border: '1px solid hsl(210 18% 92%)' }}>
                    <Mail size={13} className="shrink-0 text-slate-400" />
                    <span className="truncate">{appt.patient?.user?.email}</span>
                  </p>
                  <p className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500" style={{ border: '1px solid hsl(210 18% 92%)' }}>
                    <Phone size={13} className="shrink-0 text-slate-400" />
                    {appt.patient?.contact ?? '-'}
                  </p>
                  <p className="flex min-w-0 items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500 sm:col-span-2" style={{ border: '1px solid hsl(210 18% 92%)' }}>
                    <MapPin size={13} className="shrink-0 text-slate-400" />
                    <span className="truncate">{appt.patient?.address ?? '-'}</span>
                  </p>
                </>
              ) : (
                <p className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500 sm:col-span-2" style={{ border: '1px solid hsl(210 18% 92%)' }}>
                  <Phone size={13} className="shrink-0 text-slate-400" />
                  {appt.guest_contact ?? '-'}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg bg-slate-50 p-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <Stethoscope size={15} />
              </span>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Physician</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold" style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 32%)' }}>
                {(appt.doctor?.user?.name ?? '?').replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-800">{appt.doctor?.user?.name}</p>
                <p className="truncate text-xs text-slate-500">{appt.doctor?.specialization ?? 'Physician'}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <p className="flex min-w-0 items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500" style={{ border: '1px solid hsl(210 18% 92%)' }}>
                <CreditCard size={13} className="shrink-0 text-slate-400" />
                <span className="truncate font-mono">{appt.doctor?.license_no ?? '-'}</span>
              </p>
              <p className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500" style={{ border: '1px solid hsl(210 18% 92%)' }}>
                <Calendar size={13} className="shrink-0 text-slate-400" />
                {appt.doctor?.prc_expiry ? new Date(appt.doctor.prc_expiry).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '-'}
              </p>
              <p className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500 sm:col-span-2" style={{ border: '1px solid hsl(210 18% 92%)' }}>
                <MapPin size={13} className="shrink-0 text-slate-400" />
                DEAMHI Hospital
              </p>
            </div>
          </section>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="rounded-lg bg-slate-50 p-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Calendar size={15} />
              </span>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Details</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { label: 'Appointment No.', value: `#${appt.id}` },
                { label: 'Type', value: TYPE_LABEL[appt.type] ?? appt.type },
                { label: 'Booked on', value: new Date(appt.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' }) },
                { label: 'Status', value: statusText },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-white px-3 py-2" style={{ border: '1px solid hsl(210 18% 92%)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg bg-slate-50 p-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <FileText size={15} />
              </span>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Notes</p>
            </div>
            {appt.notes ? (
              isStaff ? (
                <div className="rounded-lg bg-white px-3 py-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
                  <p className="select-none font-mono text-sm tracking-widest text-slate-300">••••••••••••</p>
                </div>
              ) : (
                <p className="min-h-[72px] rounded-lg bg-white px-3 py-3 text-sm leading-6 text-slate-600" style={{ border: '1px solid hsl(210 18% 92%)' }}>
                  {appt.notes}
                </p>
              )
            ) : (
              <div className="flex min-h-[88px] items-center justify-center rounded-lg bg-white px-3 py-4 text-center" style={{ border: '1px dashed hsl(210 18% 86%)' }}>
                <div>
                  <FileText size={24} strokeWidth={1.5} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-400">No notes yet</p>
                  <p className="mt-0.5 text-xs text-slate-400">Added by doctor after your visit</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className={`hidden ${isPatient ? 'hidden' : ''}`}>
        <InfoCard title="Patient" icon={<User size={14} className="text-teal-600" />} color="bg-teal-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0" style={{ backgroundColor: 'hsl(258 60% 92%)', color: 'hsl(258 70% 45%)' }}>
              {(appt.patient?.user?.name ?? appt.guest_name ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate">{appt.patient?.user?.name ?? appt.guest_name ?? '—'}</p>
              <p className="text-xs text-slate-500">{appt.patient_id ? 'Patient' : 'Guest — not yet registered'}</p>
            </div>
          </div>
          <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
            {appt.patient_id ? (
              <>
                <p className="text-xs text-slate-500 flex items-center gap-2"><Mail size={12} className="text-slate-400 shrink-0" /> <span className="truncate">{appt.patient?.user?.email}</span></p>
                <p className="text-xs text-slate-500 flex items-center gap-2"><Phone size={12} className="text-slate-400 shrink-0" /> {appt.patient?.contact}</p>
                <p className="text-xs text-slate-500 flex items-center gap-2"><MapPin size={12} className="text-slate-400 shrink-0" /> <span className="truncate">{appt.patient?.address}</span></p>
              </>
            ) : (
              <p className="text-xs text-slate-500 flex items-center gap-2"><Phone size={12} className="text-slate-400 shrink-0" /> {appt.guest_contact ?? '—'}</p>
            )}
          </div>
        </InfoCard>

        <InfoCard title="Physician" icon={<Stethoscope size={14} className="text-teal-600" />} color="bg-teal-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0" style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 32%)' }}>
              {(appt.doctor?.user?.name ?? '?').replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate">{appt.doctor?.user?.name}</p>
              <p className="text-xs text-slate-500">{appt.doctor?.specialization}</p>
            </div>
          </div>
          <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p className="text-xs text-slate-500 flex items-center gap-2 font-mono"><CreditCard size={12} className="text-slate-400 shrink-0" /> {appt.doctor?.license_no}</p>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Calendar size={12} className="text-slate-400 shrink-0" /> License expiry:{' '}
              {appt.doctor?.prc_expiry ? new Date(appt.doctor.prc_expiry).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—'}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-2"><MapPin size={12} className="text-slate-400 shrink-0" /> DEAMHI Hospital</p>
          </div>
        </InfoCard>

        {/* Details + Notes stacked in the third column */}
        <div className="space-y-4">
          <InfoCard title="Details" icon={<Calendar size={14} className="text-emerald-600" />} color="bg-emerald-50">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Appointment No.</p>
            <p className="font-bold text-slate-800">#{appt.id}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2.5">Status</p>
            <div className="mt-0.5"><StatusBadge status={status} cancelledBy={appt.cancelled_by} /></div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2.5">Type</p>
            <p className="text-sm font-medium text-slate-700">{TYPE_LABEL[appt.type] ?? appt.type}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2.5">Booked on</p>
            <p className="text-sm font-medium text-slate-700">
              {new Date(appt.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
            </p>
          </InfoCard>

          <InfoCard title="Notes" icon={<FileText size={14} className="text-amber-600" />} color="bg-amber-50">
            {appt.notes
              ? (isStaff
                  ? <p className="text-sm tracking-widest text-slate-300 select-none font-mono">••••••••••••</p>
                  : <p className="text-sm text-slate-600 leading-relaxed">{appt.notes}</p>)
              : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <FileText size={28} strokeWidth={1.5} className="text-slate-300" />
                  <p className="text-sm font-medium text-slate-400 mt-2">No notes yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">Added by doctor after your visit</p>
                </div>
              )}
          </InfoCard>
        </div>
      </div>
    </div>
  )
}
