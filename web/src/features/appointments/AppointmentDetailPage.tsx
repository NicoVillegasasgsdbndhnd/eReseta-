import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, User, Stethoscope, FileText, MapPin, CheckCircle, RotateCcw, X, Loader2, Clock } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import StatusTimeline from '@/components/common/StatusTimeline'
import { useAuthStore } from '@/features/auth/authStore'
import { useAppointment, useUpdateAppointmentStatus } from './queries'

const TYPE_LABEL: Record<string, string> = {
  consultation: 'Consultation',
  follow_up:    'Follow-up',
}

// Short label shown in the hero badge.
const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Reserved', confirmed: 'Confirmed', served: 'Completed', rescheduled: 'Rescheduled', cancelled: 'Cancelled',
}

// Workflow-aligned status line (booking auto-reserves the slot — no doctor confirmation is awaited).
const STATUS_MESSAGE: Record<string, string> = {
  scheduled:   'Your slot is reserved — no confirmation needed',
  confirmed:   'Confirmed by the clinic',
  served:      'Visit completed',
  rescheduled: 'Rescheduled — your slot is reserved',
}

/** "Today" / "Tomorrow" / "in N days" / "N days ago" relative to the appointment date. */
function dayCountLabel(iso: string): string {
  const target = new Date(iso); target.setHours(0, 0, 0, 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return diff > 0 ? `${diff} days away` : `${Math.abs(diff)} days ago`
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
  const canManage = user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'staff'
  const isTerminal = status === 'served' || status === 'cancelled'

  const cancelTag = appt.cancelled_by === 'patient' ? 'patient' : appt.cancelled_by === 'clinic' ? 'clinic' : null
  const heroLabel = status === 'cancelled' && cancelTag
    ? `Cancelled by ${cancelTag}`
    : (STATUS_LABEL[status] ?? status)
  const heroMessage = status === 'cancelled'
    ? (cancelTag ? `Cancelled by the ${cancelTag}` : 'This appointment was cancelled')
    : (STATUS_MESSAGE[status] ?? '')
  // Translucent button style for the blue hero header.
  const heroBtn = 'flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-colors disabled:opacity-50'
  const canAct = canManage || user?.role === 'patient'

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

  const timelineSteps = [
    {
      label: 'Slot Reserved',
      date: appt.created_at,
      actor: appt.patient?.user?.name,
      completed: true,
    },
    {
      label: 'Confirmed by Doctor',
      date: status === 'confirmed' || status === 'served' ? appt.updated_at : undefined,
      completed: status === 'confirmed' || status === 'served',
      current: status === 'confirmed',
    },
    {
      label: 'Consultation Completed',
      date: status === 'served' ? appt.updated_at : undefined,
      completed: status === 'served',
    },
    ...(status === 'cancelled' ? [{ label: 'Appointment Cancelled', date: appt.updated_at, completed: true }] : []),
    ...(status === 'rescheduled' ? [{ label: 'Rescheduled', date: appt.updated_at, completed: true }] : []),
  ]

  return (
    <div className="max-w-3xl mx-auto">
      {/* ── Hero header (blue gradient, date-forward) ── */}
      <div className="rounded-2xl overflow-hidden shadow-sm mb-5">
        <div className="px-6 pt-5 pb-6" style={{ background: 'linear-gradient(135deg, hsl(201 100% 38%) 0%, hsl(212 92% 50%) 100%)' }}>
          <button
            onClick={() => navigate('/appointments')}
            className="flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white bg-white/15 hover:bg-white/25 rounded-lg px-3 py-1.5 transition-colors mb-4"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs font-medium text-white/70">Appointment #{appt.id}</p>
              <h2 className="text-2xl font-bold text-white leading-tight mt-0.5">
                {new Date(appt.scheduled_at).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              <p className="text-sm text-white/85 mt-1">
                {new Date(appt.scheduled_at).toLocaleTimeString('en-PH', { timeStyle: 'short' })} · DEAMHI Hospital · {TYPE_LABEL[appt.type] ?? appt.type}
              </p>
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white whitespace-nowrap">
                {heroLabel}
              </span>
              {canAct && !isTerminal && (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {canManage && (status === 'scheduled' || status === 'rescheduled') && (
                    <button onClick={() => runAction('confirm', 'confirmed')} disabled={!!actionLoading} className={heroBtn}>
                      <CheckCircle size={14} /> {actionLoading === 'confirm' ? 'Confirming…' : 'Confirm'}
                    </button>
                  )}
                  {canManage && status === 'confirmed' && user?.role !== 'doctor' && (
                    <button onClick={() => runAction('serve', 'served')} disabled={!!actionLoading} className={heroBtn}>
                      <CheckCircle size={14} /> {actionLoading === 'serve' ? 'Updating…' : 'Mark as Completed'}
                    </button>
                  )}
                  {/* Reschedule = move a still-valid appointment to a better time. */}
                  <button onClick={() => setShowReschedule((v) => !v)} disabled={!!actionLoading} className={heroBtn}>
                    <RotateCcw size={14} /> Reschedule
                  </button>
                  <button
                    onClick={() => user?.role === 'patient' ? setShowCancelChoice(true) : runAction('cancel', 'cancelled')}
                    disabled={!!actionLoading}
                    className={heroBtn}
                  >
                    <X size={14} /> {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status line — workflow-aligned (booking auto-reserves; no doctor confirmation awaited) */}
        <div className="px-6 py-2.5 flex items-center gap-2 text-sm font-medium text-white" style={{ backgroundColor: 'hsl(214 88% 42%)' }}>
          <Clock size={14} className="opacity-80 shrink-0" />
          <span>{dayCountLabel(appt.scheduled_at)}</span>
          {heroMessage && (
            <>
              <span className="opacity-50">·</span>
              <span className="opacity-90">{heroMessage}</span>
            </>
          )}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <InfoCard title="Patient" icon={<User size={14} className="text-teal-600" />} color="bg-teal-50">
          <p className="font-bold text-slate-800">{appt.patient?.user?.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{appt.patient?.user?.email}</p>
          <p className="text-xs text-slate-500 mt-0.5">{appt.patient?.contact}</p>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <MapPin size={10} /> {appt.patient?.address}
          </p>
        </InfoCard>

        <InfoCard title="Physician" icon={<Stethoscope size={14} className="text-teal-600" />} color="bg-teal-50">
          <p className="font-bold text-slate-800">{appt.doctor?.user?.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{appt.doctor?.specialization}</p>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">PRC {appt.doctor?.license_no}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            License expiry:{' '}
            {appt.doctor?.prc_expiry
              ? new Date(appt.doctor.prc_expiry).toLocaleDateString('en-PH', { dateStyle: 'medium' })
              : '—'}
          </p>
        </InfoCard>

        <InfoCard title="Details" icon={<Calendar size={14} className="text-emerald-600" />} color="bg-emerald-50">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Appointment</p>
          <p className="font-bold text-slate-800">#{appt.id}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2.5">Status</p>
          <div className="mt-0.5"><StatusBadge status={status} cancelledBy={appt.cancelled_by} /></div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-2.5">Booked on</p>
          <p className="text-sm font-medium text-slate-700">
            {new Date(appt.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
          </p>
        </InfoCard>

        {appt.notes && (
          <InfoCard title="Notes" icon={<FileText size={14} className="text-amber-600" />} color="bg-amber-50">
            {isStaff
              ? <p className="text-sm tracking-widest text-slate-300 select-none font-mono">••••••••••••</p>
              : <p className="text-sm text-slate-600 leading-relaxed">{appt.notes}</p>
            }
          </InfoCard>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid var(--color-border)' }}>
        <p className="text-sm font-semibold text-slate-700 mb-5">Appointment Timeline</p>
        <StatusTimeline steps={timelineSteps} />
      </div>
    </div>
  )
}
