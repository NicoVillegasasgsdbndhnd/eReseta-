import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Inbox,
  Loader2,
  Stethoscope,
  UserPlus,
  Users,
} from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import { useAppointmentRequests, useAppointments, type AppointmentRequest } from '@/features/appointments/queries'
import type { Appointment } from '@/mocks/types'

const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
  const h = Math.floor(i / 2) + 8
  const m = (i % 2) * 30
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

const SLOT_STYLE: Record<string, { strip: string; dot: string; bg: string; text: string }> = {
  confirmed:   { strip: 'hsl(201 100% 36%)', dot: 'bg-sky-500',     bg: 'hsl(201 80% 96%)', text: 'hsl(201 100% 30%)' },
  scheduled:   { strip: 'hsl(38 92% 50%)',   dot: 'bg-amber-500',   bg: 'hsl(42 100% 96%)', text: 'hsl(35 92% 36%)' },
  served:      { strip: 'hsl(152 55% 38%)',  dot: 'bg-emerald-500', bg: 'hsl(150 48% 96%)', text: 'hsl(152 55% 28%)' },
  rescheduled: { strip: 'hsl(258 60% 55%)',  dot: 'bg-violet-500',  bg: 'hsl(258 64% 97%)', text: 'hsl(258 60% 42%)' },
  cancelled:   { strip: 'hsl(0 70% 56%)',    dot: 'bg-red-400',     bg: 'hsl(0 80% 97%)',   text: 'hsl(0 70% 46%)' },
}

function getApptsForSlot(appts: Appointment[], slot: string): Appointment[] {
  const [slotH, slotM] = slot.split(':').map(Number)
  return appts.filter((a) => {
    const d = new Date(a.scheduled_at)
    const h = d.getHours()
    const m = d.getMinutes()
    if (h !== slotH) return false
    return slotM === 0 ? m < 30 : m >= 30
  })
}

function patientDisplayName(appt: Appointment): string {
  return appt.display_name ?? appt.patient?.user?.name ?? appt.guest_name ?? 'Guest patient'
}

function appointmentTime(value: string) {
  return new Date(value).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
}

function requestTime(request: AppointmentRequest) {
  return new Date(request.preferred_date).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function StaffDashboard() {
  const navigate = useNavigate()
  const { data: apptData, isLoading } = useAppointments()
  const { data: requestData, isLoading: requestsLoading } = useAppointmentRequests('pending')

  const todayAppts = useMemo(() => {
    const today = new Date().toDateString()
    return (apptData?.data ?? [])
      .filter((a) => new Date(a.scheduled_at).toDateString() === today)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  }, [apptData])

  const confirmedCount = todayAppts.filter((a) => a.status === 'confirmed').length
  const unconfirmedCount = todayAppts.filter((a) => a.status === 'scheduled').length
  const servedCount = todayAppts.filter((a) => a.status === 'served').length
  const doctorsOnDuty = new Set(todayAppts.map((a) => a.doctor_id)).size
  const pendingGuestRequests = requestData?.data ?? []
  const nextAppointment = todayAppts.find((a) => !['served', 'cancelled'].includes(a.status))

  const todayLabel = new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  if (isLoading || requestsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div
        className="overflow-hidden rounded-xl shadow-sm"
        style={{ border: '1px solid hsl(201 55% 82%)', background: 'linear-gradient(135deg, hsl(201 74% 96%) 0%, hsl(168 48% 95%) 100%)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white" style={{ backgroundColor: 'hsl(201 100% 36%)' }}>
              <CalendarDays size={14} />
              Staff command center
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Today&apos;s Clinic Flow</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Coordinate guest requests, appointment readiness, and patient registration for the assigned clinic schedule.
            </p>
          </div>
          <button
            onClick={() => navigate('/appointment-requests')}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'hsl(201 100% 36%)' }}
          >
            <Inbox size={15} />
            Review Requests
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/70 bg-white/35 px-5 py-3 text-sm">
          <span className="inline-flex items-center gap-2 font-medium text-slate-700">
            <Clock3 size={15} className="text-sky-700" />
            {todayLabel}
          </span>
          <span className="hidden h-4 w-px bg-slate-300/70 sm:block" />
          <span className="inline-flex items-center gap-2 font-medium text-slate-700">
            <Users size={15} className="text-emerald-700" />
            <strong className="text-slate-900">{todayAppts.length}</strong> appointments
          </span>
          <span className="hidden h-4 w-px bg-slate-300/70 sm:block" />
          <span className="inline-flex items-center gap-2 font-medium text-slate-700">
            <Inbox size={15} className="text-amber-700" />
            <strong className="text-slate-900">{pendingGuestRequests.length}</strong> guest requests
          </span>
          <span className="hidden h-4 w-px bg-slate-300/70 sm:block" />
          <span className="inline-flex items-center gap-2 font-medium text-slate-700">
            <Stethoscope size={15} className="text-violet-700" />
            <strong className="text-slate-900">{doctorsOnDuty || '-'}</strong> doctors on duty
          </span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Clinic progress</p>
                <p className="mt-1 text-sm text-slate-600">Quick status of the assigned schedule.</p>
              </div>
              <button
                onClick={() => navigate('/appointments')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 ring-1 ring-sky-100 transition-colors hover:bg-sky-100"
              >
                Full schedule
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                { label: 'Confirmed', value: confirmedCount, color: 'text-sky-700', icon: <CheckCircle2 size={16} /> },
                { label: 'Unconfirmed', value: unconfirmedCount, color: 'text-amber-700', icon: <Clock3 size={16} /> },
                { label: 'Completed', value: servedCount, color: 'text-emerald-700', icon: <CheckCircle2 size={16} /> },
                { label: 'Doctors', value: doctorsOnDuty || '-', color: 'text-violet-700', icon: <Stethoscope size={16} /> },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3">
                  <span className={item.color}>{item.icon}</span>
                  <div>
                    <p className="text-lg font-bold leading-none text-slate-900">{item.value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" style={{ backgroundColor: 'hsl(201 70% 97%)', borderBottom: '1px solid hsl(210 18% 92%)' }}>
              <div>
                <p className="text-sm font-bold text-slate-900">Appointment Timeboard</p>
                <p className="mt-0.5 text-xs text-slate-500">Half-hour clinic slots with patient and physician context.</p>
              </div>
              {nextAppointment && (
                <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-sm" style={{ border: '1px solid hsl(201 45% 84%)' }}>
                  <span className="font-semibold text-slate-500">Next:</span>{' '}
                  <span className="font-bold text-slate-900">{appointmentTime(nextAppointment.scheduled_at)}</span>{' '}
                  <span className="text-slate-500">{patientDisplayName(nextAppointment)}</span>
                </div>
              )}
            </div>

            <div className="max-h-[640px] overflow-y-auto p-4">
              <div className="space-y-1">
                {TIME_SLOTS.map((slot) => {
                  const slotAppts = getApptsForSlot(todayAppts, slot)
                  return (
                    <div key={slot} className="grid grid-cols-[60px_minmax(0,1fr)] gap-3 py-1">
                      <span className="pt-2 font-mono text-xs text-slate-400">{slot}</span>
                      <div className="space-y-2">
                        {slotAppts.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-300">
                            Open slot
                          </div>
                        ) : (
                          slotAppts.map((appt) => {
                            const style = SLOT_STYLE[appt.status] ?? SLOT_STYLE.scheduled
                            const doctorName = appt.doctor?.user?.name ?? 'Assigned doctor'
                            return (
                              <button
                                key={appt.id}
                                onClick={() => navigate(`/appointments/${appt.id}`)}
                                className="relative grid w-full gap-2 overflow-hidden rounded-lg px-3 py-2 text-left transition-transform hover:-translate-y-0.5 sm:grid-cols-[minmax(0,1fr)_auto]"
                                style={{ backgroundColor: style.bg, color: style.text, border: '1px solid hsl(210 18% 90%)' }}
                              >
                                <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: style.strip }} />
                                <span className="min-w-0 pl-2">
                                  <span className="block truncate text-sm font-bold">{patientDisplayName(appt)}</span>
                                  <span className="block truncate text-xs opacity-80">{doctorName}</span>
                                </span>
                                <span className="flex items-center gap-2 sm:justify-end">
                                  {appt.is_guest && <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Guest</span>}
                                  <StatusBadge status={appt.status} cancelledBy={appt.cancelled_by} />
                                </span>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </main>

        <aside className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">New guest appointments</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{pendingGuestRequests.length} waiting</h2>
                <p className="mt-1 text-sm text-slate-500">Public booking requests that need staff review.</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <Inbox size={18} />
              </span>
            </div>

            <button
              onClick={() => navigate('/appointment-requests')}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              <UserPlus size={15} />
              Open Request Queue
            </button>

            <div className="mt-4 space-y-2">
              {pendingGuestRequests.length === 0 ? (
                <div className="rounded-lg bg-slate-50 px-4 py-8 text-center">
                  <Inbox size={24} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-500">No pending guest requests</p>
                </div>
              ) : (
                pendingGuestRequests.slice(0, 5).map((request) => (
                  <button
                    key={request.id}
                    onClick={() => navigate('/appointment-requests')}
                    className="w-full rounded-lg bg-slate-50 px-3 py-3 text-left transition-colors hover:bg-sky-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{request.full_name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{request.doctor?.user?.name ?? 'Requested doctor'}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        Pending
                      </span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <CalendarDays size={12} />
                      {requestTime(request)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Staff actions</p>
            <div className="mt-3 grid gap-2">
              {[
                { label: 'Manage appointments', to: '/appointments', icon: <CalendarDays size={15} /> },
                { label: 'Review guest requests', to: '/appointment-requests', icon: <Inbox size={15} /> },
                { label: 'Patient records', to: '/records', icon: <Users size={15} /> },
              ].map((action) => (
                <button
                  key={action.to}
                  onClick={() => navigate(action.to)}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-sky-50 hover:text-sky-700"
                >
                  <span className="flex items-center gap-2">{action.icon}{action.label}</span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
