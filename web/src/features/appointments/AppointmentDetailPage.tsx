import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, User, Stethoscope, FileText, MapPin, CheckCircle, RotateCcw, X, Loader2 } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import StatusTimeline from '@/components/common/StatusTimeline'
import { useAuthStore } from '@/features/auth/authStore'
import { useAppointment, useUpdateAppointmentStatus } from './queries'

const TYPE_LABEL: Record<string, string> = {
  consultation: 'Consultation',
  follow_up:    'Follow-up',
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
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/appointments')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800">Appointment #{appt.id}</h2>
          <StatusBadge status={status} cancelledBy={appt.cancelled_by} />
        </div>
      </div>

      {canManage && !isTerminal && (
        <div
          className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap items-center gap-2"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-2">Actions</p>

          {(status === 'scheduled' || status === 'rescheduled') && (
            <button
              onClick={() => runAction('confirm', 'confirmed')}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60"
            >
              <CheckCircle size={14} />
              {actionLoading === 'confirm' ? 'Confirming…' : 'Confirm'}
            </button>
          )}

          {status === 'confirmed' && user?.role !== 'doctor' && (
            <button
              onClick={() => runAction('serve', 'served')}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-60"
            >
              <CheckCircle size={14} />
              {actionLoading === 'serve' ? 'Updating…' : 'Mark as Completed'}
            </button>
          )}

          <button
            onClick={() => setShowReschedule((v) => !v)}
            disabled={!!actionLoading}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors disabled:opacity-60"
          >
            <RotateCcw size={14} /> Reschedule
          </button>

          <button
            onClick={() => runAction('cancel', 'cancelled')}
            disabled={!!actionLoading}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors disabled:opacity-60"
          >
            <X size={14} />
            {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel'}
          </button>
        </div>
      )}

      {/* Patient self-service: rebook or cancel their own appointment (mentor review) */}
      {user?.role === 'patient' && !isTerminal && (
        <div
          className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap items-center gap-2"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-2">Manage</p>
          <button
            onClick={() => setShowReschedule((v) => !v)}
            disabled={!!actionLoading}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: 'hsl(201 100% 36%)' }}
          >
            <RotateCcw size={14} /> Rebook
          </button>
          <button
            onClick={() => setShowCancelChoice(true)}
            disabled={!!actionLoading}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors disabled:opacity-60"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      )}

      {/* Cancel → choose rebook vs fully cancel */}
      {showCancelChoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCancelChoice(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-800 mb-1">Cancel this appointment?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This frees up the slot. To keep the visit at a different time, use <strong>Rebook</strong> instead.
            </p>
            <div className="space-y-2">
              <button
                onClick={async () => { setShowCancelChoice(false); await runAction('cancel', 'cancelled') }}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors"
              >
                <X size={15} /> Cancel appointment
              </button>
              <button
                onClick={() => setShowCancelChoice(false)}
                className="w-full h-10 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Keep appointment
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

        <InfoCard title="Schedule" icon={<Calendar size={14} className="text-emerald-600" />} color="bg-emerald-50">
          <p className="font-bold text-slate-800">
            {new Date(appt.scheduled_at).toLocaleDateString('en-PH', { dateStyle: 'full' })}
          </p>
          <p className="text-sm text-slate-600 mt-0.5">
            {new Date(appt.scheduled_at).toLocaleTimeString('en-PH', { timeStyle: 'short' })}
          </p>
          <span className="text-xs font-semibold mt-2 inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            {TYPE_LABEL[appt.type] ?? appt.type}
          </span>
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
