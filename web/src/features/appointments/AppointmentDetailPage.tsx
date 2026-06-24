import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, User, Stethoscope, FileText, MapPin, CheckCircle, RotateCcw, X, Loader2, Clock, ClipboardCheck, Mail, Phone, CreditCard, UserPlus } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import { useAuthStore } from '@/features/auth/authStore'
import { useAppointment, useUpdateAppointmentStatus } from './queries'

const TYPE_LABEL: Record<string, string> = {
  consultation: 'Consultation',
  follow_up:    'Follow-up',
}

// Status shown in the third strip segment (booking auto-reserves the slot).
const STATUS_TEXT: Record<string, string> = {
  scheduled:   'Reserved',
  rescheduled: 'Rescheduled',
  confirmed:   'Confirmed',
  served:      'Completed',
  cancelled:   'Cancelled',
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

  const statusText  = STATUS_TEXT[status] ?? status
  const statusColor = status === 'cancelled'
    ? 'text-red-200'
    : (status === 'scheduled' || status === 'rescheduled') ? 'text-amber-200' : 'text-white'
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
    <div className="max-w-5xl mx-auto">
      {/* ── Header (white, date-forward) ── */}
      <div className="bg-white rounded-xl shadow-sm px-5 py-4 mb-3" style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => navigate('/appointments')}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-1.5 transition-colors"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <span className="text-sm font-medium text-slate-500">Appointment #{appt.id}</span>
          </div>

          {canAct && !isTerminal && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Guest appointment (approved request, no account yet): staff/admin register
                  the patient at the visit, creating the account from the intake form. */}
              {!appt.patient_id && (user?.role === 'staff' || user?.role === 'admin') && (
                <button onClick={() => navigate(`/patients/new?appointment_id=${appt.id}`)} disabled={!!actionLoading}
                  className={`${btnBase} text-white border-transparent`} style={{ backgroundColor: 'hsl(201 100% 36%)' }}>
                  <UserPlus size={14} /> Register patient
                </button>
              )}
              {/* Doctor shortcut: jump straight to the New Record form for this patient instead
                  of opening Consultations and re-finding them in the queue. */}
              {user?.role === 'doctor' && appt.patient_id && (
                <button
                  onClick={() => navigate('/consultations', { state: { patientId: appt.patient_id } })}
                  disabled={!!actionLoading}
                  className={`${btnBase} bg-teal-600 hover:bg-teal-700 text-white border-teal-600`}
                >
                  <Stethoscope size={14} /> Start Consultation
                </button>
              )}
              {/* No Confirm step — booking auto-reserves the slot. Staff/admin can mark the
                  visit Completed directly; doctors complete it via the consultation screen. */}
              {canManage && user?.role !== 'doctor' && (
                <button onClick={() => runAction('serve', 'served')} disabled={!!actionLoading}
                  className={`${btnBase} bg-teal-600 hover:bg-teal-700 text-white border-teal-600`}>
                  <CheckCircle size={14} /> {actionLoading === 'serve' ? 'Updating…' : 'Mark as Completed'}
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

        <h2 className="text-2xl font-bold text-slate-800 leading-tight">
          {new Date(appt.scheduled_at).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500 flex-wrap">
          <span>{new Date(appt.scheduled_at).toLocaleTimeString('en-PH', { timeStyle: 'short' })}</span>
          <span className="text-slate-300">·</span>
          <span>DEAMHI Hospital</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{TYPE_LABEL[appt.type] ?? appt.type}</span>
        </div>
      </div>

      {/* ── 3-segment info strip — aligns above the cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 rounded-xl overflow-hidden shadow-sm mb-4 text-white" style={{ backgroundColor: 'hsl(212 90% 50%)' }}>
        <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderRight: '1px solid rgba(255,255,255,0.18)' }}>
          <Clock size={18} className="opacity-80 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Time until visit</p>
            <p className="text-sm font-bold truncate">{dayCountLabel(appt.scheduled_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderRight: '1px solid rgba(255,255,255,0.18)' }}>
          <User size={18} className="opacity-80 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Physician</p>
            <p className="text-sm font-bold truncate">{appt.doctor?.user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5">
          <ClipboardCheck size={18} className="opacity-80 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Status</p>
            <p className={`text-sm font-bold truncate ${statusColor}`}>{statusText}</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                <div className="flex flex-col items-center justify-center py-6 text-center">
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
