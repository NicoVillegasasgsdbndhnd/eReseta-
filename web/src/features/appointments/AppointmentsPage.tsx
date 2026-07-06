import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Eye,
  X,
  Search,
  MoreHorizontal,
  Loader2,
  CalendarOff,
  CalendarDays,
  Clock3,
  Stethoscope,
  MapPin,
  ArrowRight,
  ClipboardList,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import StatusBadge from '@/components/common/StatusBadge'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAuthStore } from '@/features/auth/authStore'
import { useAppointments, useUpdateAppointmentStatus } from './queries'
import AppointmentCalendar from './AppointmentCalendar'
import StaffFollowUpDialog from './StaffFollowUpDialog'
import type { Appointment } from '@/mocks/types'

const TYPE_LABEL: Record<string, string> = {
  consultation: 'Consultation',
  follow_up:    'Follow-up',
}

const TYPE_COLOR: Record<string, string> = {
  consultation: 'bg-sky-50 text-sky-700',
  follow_up:    'bg-violet-50 text-violet-700',
}

const STATUS_PRIORITY: Record<string, number> = {
  scheduled: 0,
  confirmed: 1,
  rescheduled: 2,
  cancelled: 3,
  served: 4,
}

const PILLS = [
  { label: 'All',       value: '' },
  { label: 'Reserved',  value: 'scheduled' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'served' },
  { label: 'Cancelled', value: 'cancelled' },
]

function Avatar({ name }: { name: string }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
      style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 30%)' }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function formatAppointmentDate(value: string) {
  return new Date(value).toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatAppointmentTime(value: string) {
  return new Date(value).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getVisitWindow(value: string, nowMs: number) {
  const minutes = Math.round((new Date(value).getTime() - nowMs) / 60000)

  if (minutes < -60) return 'Visit time passed'
  if (minutes < 0) return 'Starting now'
  if (minutes < 60) return `${minutes} min left`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} left`

  const days = Math.round(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} left`
}

function patientDisplayName(appt: Appointment): string {
  return appt.display_name ?? appt.patient?.user?.name ?? appt.guest_name ?? (appt.patient_id ? `Patient #${appt.patient_id}` : 'Guest patient')
}

function isGuestAppointment(appt: Appointment): boolean {
  return appt.is_guest ?? appt.patient_id === null
}

function appointmentTimingBadge(appt: Appointment, nowMs: number) {
  if (!['scheduled', 'confirmed', 'rescheduled'].includes(appt.status)) return null

  const minutesPast = Math.floor((nowMs - new Date(appt.scheduled_at).getTime()) / 60000)
  if (minutesPast < 0) return null
  if (minutesPast >= 60) return { label: 'No show', className: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' }
  return { label: 'Delayed', className: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' }
}

export default function AppointmentsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [nowMs] = useState(() => Date.now())

  const { data, isLoading, isError } = useAppointments(
    statusFilter ? { status: statusFilter } : undefined,
  )
  const cancelMutation = useUpdateAppointmentStatus()

  const appointments = useMemo(() => {
    const raw = data?.data ?? []
    let list = [...raw].sort((a, b) => {
      const pd = (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99)
      if (pd !== 0) return pd
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    })

    if (statusFilter !== 'served') {
      list = list.filter((a) => a.status !== 'served')
    }
    if (statusFilter !== 'cancelled') {
      list = list.filter((a) => a.status !== 'cancelled')
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          (a.patient?.user?.name ?? '').toLowerCase().includes(q) ||
          (a.doctor?.user?.name ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [data, search, statusFilter])

  const handleCancel = async () => {
    if (!cancelTarget) return
    await cancelMutation.mutateAsync({ id: cancelTarget.id, status: 'cancelled' })
    setCancelTarget(null)
  }

  const [followUpOpen, setFollowUpOpen] = useState(false)

  const isDoctor  = user?.role === 'doctor'
  const isStaff   = user?.role === 'staff'
  const isPatient = user?.role === 'patient'

  const useCalendar = isDoctor || isStaff
  const canBook   = isPatient || user?.role === 'admin'

  const canManageAvailability = isDoctor || user?.role === 'staff' || user?.role === 'admin'
  const patientVisibleAppointments = useMemo(
    () => appointments.filter((appt) => statusFilter || (appt.status !== 'cancelled' && appt.status !== 'served')),
    [appointments, statusFilter],
  )
  const nextPatientAppointment = useMemo(
    () =>
      patientVisibleAppointments.find(
        (appt) => appt.status === 'scheduled' || appt.status === 'confirmed' || appt.status === 'rescheduled',
      ),
    [patientVisibleAppointments],
  )
  const patientStats = useMemo(() => {
    const raw = data?.data ?? []
    return {
      upcoming: raw.filter((appt) => ['scheduled', 'confirmed', 'rescheduled'].includes(appt.status)).length,
      completed: raw.filter((appt) => appt.status === 'served').length,
      cancelled: raw.filter((appt) => appt.status === 'cancelled').length,
    }
  }, [data])
  const doctorStats = useMemo(() => {
    const raw = data?.data ?? []
    const today = new Date().toDateString()
    const active = raw.filter((appt) => appt.status !== 'cancelled' && appt.status !== 'served')
    const todayActive = active
      .filter((appt) => new Date(appt.scheduled_at).toDateString() === today)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    const upcoming = active.filter((appt) => new Date(appt.scheduled_at).getTime() >= nowMs)
    return {
      today: todayActive.length,
      upcoming: upcoming.length,
      completed: raw.filter((appt) => appt.status === 'served').length,
      guests: active.filter((appt) => isGuestAppointment(appt)).length,
      next: todayActive[0],
    }
  }, [data, nowMs])

  return (
    <div onClick={() => setOpenMenu(null)}>
      {/* ── Page header ── */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(215 30% 14%)' }}>
            Appointments
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(215 16% 45%)' }}>
            {data?.meta?.total ?? 0} record{(data?.meta?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canManageAvailability && !isStaff && (
            <button
              onClick={() => navigate('/appointments/availability')}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors hover:bg-slate-50"
              style={{ backgroundColor: 'white', color: 'hsl(201 100% 36%)', border: '1px solid hsl(210 18% 88%)' }}
            >
              <CalendarOff size={15} />
              Availability
            </button>
          )}
          {isStaff && (
            <button
              onClick={() => setFollowUpOpen(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              <Plus size={15} />
              New follow-up
            </button>
          )}
          {canBook && (
            <button
              onClick={() => navigate('/appointments/new')}
              className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              <Plus size={15} />
              Book Appointment
            </button>
          )}
        </div>
      </div>

      <StaffFollowUpDialog open={followUpOpen} onOpenChange={setFollowUpOpen} />

      {/* ── Search + pill filters (list view only; doctor & staff use the calendar) ── */}
      {!useCalendar && (
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isPatient ? 'Search by doctor…' : 'Search patient or doctor…'}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {PILLS.map((p) => (
            <button
              key={p.value}
              onClick={() => setStatusFilter(p.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors"
              style={
                statusFilter === p.value
                  ? { backgroundColor: 'hsl(201 100% 36%)', color: 'white', borderColor: 'hsl(201 100% 36%)' }
                  : { backgroundColor: 'white', color: 'hsl(215 16% 40%)', borderColor: 'hsl(210 18% 88%)' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : isError ? (
        <div className="text-center py-20 text-sm text-red-500">Failed to load appointments.</div>
      ) : isPatient ? (
        <div className="space-y-4 sm:space-y-5">
          <div
            className="overflow-hidden rounded-xl bg-white shadow-sm"
            style={{ border: '1px solid hsl(210 18% 88%)' }}
          >
            <div
              className="grid gap-5 p-4 sm:p-6 md:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]"
              style={{ background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(205 92% 30%) 58%, hsl(152 48% 35%) 100%)' }}
            >
              <div className="min-w-0 text-white">
                <div
                  className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
                >
                  <CalendarDays size={14} />
                  Patient appointment desk
                </div>
                <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
                  {nextPatientAppointment ? 'Your next visit is ready.' : 'Plan your next DEAMHI visit.'}
                </h2>
                <p className="mt-2 max-w-xl text-sm" style={{ color: 'rgba(255,255,255,0.76)' }}>
                  Track upcoming consultations, review visit details, and manage your appointment from one place.
                </p>
                <div className="mt-5 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                  {[
                    { label: 'Upcoming', value: patientStats.upcoming },
                    { label: 'Completed', value: patientStats.completed },
                    { label: 'Cancelled', value: patientStats.cancelled },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg px-3 py-2 sm:px-4"
                      style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}
                    >
                      <p className="text-2xl font-bold leading-none">{item.value}</p>
                      <p className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-xl bg-white p-4 shadow-lg"
                style={{ border: '1px solid rgba(255,255,255,0.24)' }}
              >
                {nextPatientAppointment ? (
                  <>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'hsl(215 16% 48%)' }}>
                          Next appointment
                        </p>
                        <p className="mt-1 text-xl font-bold leading-tight" style={{ color: 'hsl(215 30% 14%)' }}>
                          {nextPatientAppointment.doctor?.user?.name ?? `Doctor #${nextPatientAppointment.doctor_id}`}
                        </p>
                        <p className="text-sm" style={{ color: 'hsl(215 16% 48%)' }}>
                          {nextPatientAppointment.doctor?.specialization ?? 'Physician'}
                        </p>
                      </div>
                      <StatusBadge status={nextPatientAppointment.status} cancelledBy={nextPatientAppointment.cancelled_by} />
                    </div>
                    <div className="space-y-3">
                      {[
                        { icon: CalendarDays, label: formatAppointmentDate(nextPatientAppointment.scheduled_at) },
                        { icon: Clock3, label: `${formatAppointmentTime(nextPatientAppointment.scheduled_at)} · ${getVisitWindow(nextPatientAppointment.scheduled_at, nowMs)}` },
                        { icon: MapPin, label: 'DEAMHI Hospital' },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-3 text-sm" style={{ color: 'hsl(215 16% 42%)' }}>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                            <Icon size={16} />
                          </span>
                          <span className="font-medium">{label}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => navigate(`/appointments/${nextPatientAppointment.id}`)}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: 'hsl(201 100% 36%)' }}
                    >
                      View visit details
                      <ArrowRight size={16} />
                    </button>
                  </>
                ) : (
                  <div className="flex min-h-56 flex-col items-center justify-center text-center">
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                      <ClipboardList size={22} />
                    </span>
                    <p className="text-lg font-bold" style={{ color: 'hsl(215 30% 14%)' }}>No active visit yet</p>
                    <p className="mt-1 max-w-xs text-sm" style={{ color: 'hsl(215 16% 48%)' }}>
                      Book a consultation when you are ready to schedule your next hospital visit.
                    </p>
                    <button
                      onClick={() => navigate('/appointments/new')}
                      className="mt-5 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: 'hsl(201 100% 36%)' }}
                    >
                      <Plus size={16} />
                      Book appointment
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {patientVisibleAppointments.length === 0 ? (
            <div
              className="rounded-xl bg-white px-6 py-14 text-center shadow-sm"
              style={{ border: '1px solid hsl(210 18% 88%)' }}
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <CalendarDays size={22} />
              </div>
              <p className="text-base font-bold" style={{ color: 'hsl(215 30% 14%)' }}>No appointments found</p>
              <p className="mt-1 text-sm" style={{ color: 'hsl(215 16% 50%)' }}>
                Try another status filter or book a new visit.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {patientVisibleAppointments.map((appt) => {
                const doctorName = appt.doctor?.user?.name ?? `Doctor #${appt.doctor_id}`
                const isActive = appt.status !== 'cancelled' && appt.status !== 'served'

                return (
                  <div
                    key={appt.id}
                    onClick={() => navigate(`/appointments/${appt.id}`)}
                    className="group rounded-xl bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    style={{ border: '1px solid hsl(210 18% 88%)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={doctorName} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold" style={{ color: 'hsl(215 30% 14%)' }}>{doctorName}</p>
                          <p className="truncate text-xs" style={{ color: 'hsl(215 16% 50%)' }}>
                            {appt.doctor?.specialization ?? 'Physician'}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={appt.status} cancelledBy={appt.cancelled_by} />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <CalendarDays size={16} className="mb-2 text-sky-700" />
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 48%)' }}>Date</p>
                        <p className="mt-1 text-sm font-bold" style={{ color: 'hsl(215 30% 14%)' }}>{formatAppointmentDate(appt.scheduled_at)}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <Clock3 size={16} className="mb-2 text-emerald-700" />
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 48%)' }}>Time</p>
                        <p className="mt-1 text-sm font-bold" style={{ color: 'hsl(215 30% 14%)' }}>{formatAppointmentTime(appt.scheduled_at)}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <Stethoscope size={16} className="mb-2 text-violet-700" />
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 48%)' }}>Type</p>
                        <p className="mt-1 text-sm font-bold" style={{ color: 'hsl(215 30% 14%)' }}>{TYPE_LABEL[appt.type] ?? appt.type}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'hsl(215 16% 45%)' }}>
                        <MapPin size={14} />
                        DEAMHI Hospital
                        {isActive && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                            {getVisitWindow(appt.scheduled_at, nowMs)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {isActive && (
                          <button
                            onClick={() => setCancelTarget(appt)}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/appointments/${appt.id}`)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: 'hsl(201 100% 36%)' }}
                        >
                          View
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : isStaff ? (
        <div className="space-y-4">
          <div
            className="overflow-hidden rounded-xl shadow-sm"
            style={{ border: '1px solid hsl(201 55% 82%)', background: 'linear-gradient(135deg, hsl(201 74% 96%) 0%, hsl(168 48% 95%) 100%)' }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white" style={{ backgroundColor: 'hsl(201 100% 36%)' }}>
                  <CalendarDays size={14} />
                  Staff appointment desk
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Assigned Clinic Schedule</h2>
                <p className="mt-1 max-w-3xl text-sm text-slate-600">
                  Review your assigned doctor&apos;s calendar, open appointment details, and manage clinic availability.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate('/appointments/availability')}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-sky-700 shadow-sm transition-colors hover:bg-sky-50"
                  style={{ border: '1px solid hsl(201 45% 82%)' }}
                >
                  <CalendarOff size={15} />
                  Availability
                </button>
                <button
                  onClick={() => navigate('/appointment-requests')}
                  className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'hsl(201 100% 36%)' }}
                >
                  <ClipboardList size={15} />
                  Requests
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/70 bg-white/35 px-5 py-3 text-sm">
              <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                <Clock3 size={15} className="text-sky-700" />
                <strong className="text-slate-900">{doctorStats.today}</strong> today
              </span>
              <span className="hidden h-4 w-px bg-slate-300/70 sm:block" />
              <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                <CalendarDays size={15} className="text-emerald-700" />
                <strong className="text-slate-900">{doctorStats.upcoming}</strong> upcoming
              </span>
              <span className="hidden h-4 w-px bg-slate-300/70 sm:block" />
              <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                <ClipboardList size={15} className="text-amber-700" />
                <strong className="text-slate-900">{doctorStats.guests}</strong> guest appointments
              </span>
              <span className="hidden h-4 w-px bg-slate-300/70 sm:block" />
              <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                <Stethoscope size={15} className="text-violet-700" />
                <strong className="text-slate-900">{doctorStats.completed}</strong> completed
              </span>
            </div>
          </div>

          {doctorStats.next && (
            <button
              onClick={() => navigate(`/appointments/${doctorStats.next!.id}`)}
              className="grid w-full gap-3 rounded-xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-sky-50 md:grid-cols-[minmax(0,1fr)_auto]"
              style={{ border: '1px solid hsl(210 18% 88%)' }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={patientDisplayName(doctorStats.next)} />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Next appointment</p>
                  <p className="truncate text-sm font-bold text-slate-900">{patientDisplayName(doctorStats.next)}</p>
                  <p className="truncate text-xs text-slate-500">
                    {formatAppointmentTime(doctorStats.next.scheduled_at)} | {doctorStats.next.doctor?.user?.name ?? 'Assigned doctor'}
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-2 md:justify-end">
                {isGuestAppointment(doctorStats.next) && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    Guest
                  </span>
                )}
                {(() => {
                  const timingBadge = appointmentTimingBadge(doctorStats.next!, nowMs)
                  return timingBadge ? (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${timingBadge.className}`}>
                      {timingBadge.label}
                    </span>
                  ) : (
                    <StatusBadge status={doctorStats.next!.status} cancelledBy={doctorStats.next!.cancelled_by} />
                  )
                })()}
                <ArrowRight size={16} className="text-slate-400" />
              </span>
            </button>
          )}

          <AppointmentCalendar
            appointments={appointments}
            onSelectAppointment={(id) => navigate(`/appointments/${id}`)}
          />
        </div>
      ) : isDoctor ? (
        <div className="space-y-4">
          <div
            className="overflow-hidden rounded-xl shadow-sm"
            style={{ border: '1px solid hsl(201 55% 82%)', background: 'linear-gradient(135deg, hsl(201 74% 96%) 0%, hsl(180 42% 96%) 100%)' }}
          >
            <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.45fr)]">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white" style={{ backgroundColor: 'hsl(201 100% 36%)' }}>
                    <CalendarDays size={14} />
                    Appointment calendar
                  </span>
                  <span className="rounded-full bg-white/75 px-3 py-1 text-xs font-semibold" style={{ color: 'hsl(215 16% 42%)', border: '1px solid hsl(201 45% 86%)' }}>
                    {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-2xl font-bold leading-tight" style={{ color: 'hsl(215 30% 14%)' }}>
                  Appointment schedule
                </h2>
                <p className="mt-1 max-w-2xl text-sm" style={{ color: 'hsl(215 16% 48%)' }}>
                  Review your active clinic schedule, open patient appointments, and manage availability.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { label: 'Today', value: doctorStats.today },
                    { label: 'Upcoming', value: doctorStats.upcoming },
                    { label: 'Guests', value: doctorStats.guests },
                    { label: 'Completed', value: doctorStats.completed },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-lg bg-white/85 px-3 py-2 text-xs font-semibold shadow-sm"
                      style={{ border: '1px solid hsl(201 45% 86%)', color: 'hsl(215 16% 42%)' }}
                    >
                      <span className="text-sm font-bold tabular-nums" style={{ color: 'hsl(201 100% 34%)' }}>{item.value}</span>
                      {item.label}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate('/appointments/availability')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold shadow-sm transition-colors hover:bg-sky-50"
                    style={{ border: '1px solid hsl(201 45% 82%)', color: 'hsl(201 100% 34%)' }}
                  >
                    <CalendarOff size={14} />
                    Manage availability
                  </button>
                  <button
                    onClick={() => navigate('/consultations')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold shadow-sm transition-colors hover:bg-emerald-50"
                    style={{ border: '1px solid hsl(168 38% 80%)', color: 'hsl(168 65% 28%)' }}
                  >
                    <Stethoscope size={14} />
                    Consultations
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-md" style={{ border: '1px solid hsl(201 45% 84%)' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'hsl(215 16% 48%)' }}>
                  Next appointment
                </p>
                {doctorStats.next ? (
                  (() => {
                    const timingBadge = appointmentTimingBadge(doctorStats.next, nowMs)
                    return (
                  <>
                    <div className="mt-4 flex items-start gap-3">
                      <Avatar name={patientDisplayName(doctorStats.next)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
                          {patientDisplayName(doctorStats.next)}
                        </p>
                        <p className="text-sm" style={{ color: 'hsl(215 16% 48%)' }}>
                          {formatAppointmentTime(doctorStats.next.scheduled_at)} · {getVisitWindow(doctorStats.next.scheduled_at, nowMs)}
                        </p>
                        {isGuestAppointment(doctorStats.next) && (
                          <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Guest patient
                          </span>
                        )}
                      </div>
                      {timingBadge ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${timingBadge.className}`}>
                          {timingBadge.label}
                        </span>
                      ) : (
                        <StatusBadge status={doctorStats.next.status} cancelledBy={doctorStats.next.cancelled_by} />
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/appointments/${doctorStats.next!.id}`)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: 'hsl(201 100% 36%)' }}
                    >
                      Open appointment
                      <ArrowRight size={16} />
                    </button>
                  </>
                    )
                  })()
                ) : (
                  <div className="mt-3 rounded-xl p-5 text-center" style={{ border: '1px dashed hsl(201 45% 78%)', backgroundColor: 'hsl(201 70% 97%)' }}>
                    <CalendarDays size={26} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm font-bold" style={{ color: 'hsl(215 30% 14%)' }}>
                      No queue for today
                    </p>
                    <p className="mt-1 text-xs" style={{ color: 'hsl(215 16% 50%)' }}>
                      Your next active appointment will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <AppointmentCalendar
            appointments={appointments}
            onSelectAppointment={(id) => navigate(`/appointments/${id}`)}
          />
        </div>
      ) : useCalendar ? (
        <AppointmentCalendar
          appointments={appointments}
          onSelectAppointment={(id) => navigate(`/appointments/${id}`)}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          {/* Header */}
          <div
            className="grid text-xs font-semibold uppercase tracking-wide px-5 py-3"
            style={{
              color: 'hsl(215 16% 50%)',
              borderBottom: '1px solid hsl(210 18% 92%)',
              gridTemplateColumns: !isDoctor && !isPatient
                ? '2fr 1.5fr 1fr 1.2fr 1fr auto'
                : isDoctor
                ? '2fr 1fr 1.2fr 1fr'
                : '2fr 1fr 1.2fr 1fr auto',
            }}
          >
            {!isPatient && <span>Patient</span>}
            {isPatient && <span>Doctor</span>}
            {!isDoctor && !isPatient && <span>Doctor</span>}
            <span>Type</span>
            <span>Schedule</span>
            <span>Status</span>
            {!isDoctor && <span />}
          </div>

          {/* Rows */}
          {appointments.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: 'hsl(215 16% 55%)' }}>
              No appointments found.
            </div>
          ) : (
            appointments.map((appt) => {
              const patientName = patientDisplayName(appt)
              const isGuest = isGuestAppointment(appt)
              const doctorName  = appt.doctor?.user?.name ?? `Doctor #${appt.doctor_id}`
              const primaryName = isPatient ? doctorName : patientName
              const primarySub  = isPatient ? appt.doctor?.specialization : isGuest ? (appt.guest_contact ?? 'Guest patient') : appt.patient?.user?.email

              return (
                <div
                  key={appt.id}
                  onDoubleClick={() => navigate(`/appointments/${appt.id}`)}
                  className="grid items-center px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-default"
                  style={{
                    borderBottom: '1px solid hsl(210 18% 93%)',
                    gridTemplateColumns: !isDoctor && !isPatient
                      ? '2fr 1.5fr 1fr 1.2fr 1fr auto'
                      : '2fr 1fr 1.2fr 1fr auto',
                  }}
                >
                  {/* Patient OR Doctor (primary) */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={primaryName} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'hsl(215 30% 14%)' }}>
                        {primaryName}
                      </p>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-xs truncate" style={{ color: 'hsl(215 16% 50%)' }}>
                          {primarySub}
                        </p>
                        {!isPatient && isGuest && (
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Guest
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Doctor column (admin/staff only) */}
                  {!isDoctor && !isPatient && (
                    <div className="min-w-0">
                      <p className="text-sm truncate" style={{ color: 'hsl(215 30% 14%)' }}>{doctorName}</p>
                      <p className="text-xs truncate" style={{ color: 'hsl(215 16% 50%)' }}>{appt.doctor?.specialization}</p>
                    </div>
                  )}

                  {/* Type */}
                  <div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_COLOR[appt.type] ?? 'bg-slate-100 text-slate-600'}`}>
                      {TYPE_LABEL[appt.type] ?? appt.type}
                    </span>
                  </div>

                  {/* Schedule */}
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'hsl(215 30% 14%)' }}>
                      {new Date(appt.scheduled_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(215 16% 50%)' }}>
                      {new Date(appt.scheduled_at).toLocaleTimeString('en-PH', { timeStyle: 'short' })}
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <StatusBadge status={appt.status} cancelledBy={appt.cancelled_by} />
                  </div>

                  {/* Actions */}
                  {!isDoctor && (
                    <div className="relative flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenu(openMenu === appt.id ? null : appt.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        style={{ color: 'hsl(215 16% 60%)' }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenu === appt.id && (
                        <div
                          className="absolute right-0 top-8 z-10 bg-white rounded-xl shadow-lg py-1 min-w-32"
                          style={{ border: '1px solid hsl(210 18% 88%)' }}
                        >
                          <button
                            onClick={() => { navigate(`/appointments/${appt.id}`); setOpenMenu(null) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                            style={{ color: 'hsl(215 30% 14%)' }}
                          >
                            <Eye size={14} /> View
                          </button>
                          {appt.status !== 'cancelled' && appt.status !== 'served' && (
                            <button
                              onClick={() => { setCancelTarget(appt); setOpenMenu(null) }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-red-50 text-red-600 transition-colors"
                            >
                              <X size={14} /> Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Cancel Appointment"
        description={`Cancel the appointment for ${cancelTarget ? patientDisplayName(cancelTarget) : 'this patient'}? This cannot be undone.`}
        confirmLabel="Cancel Appointment"
        variant="destructive"
        loading={cancelMutation.isPending}
        onConfirm={handleCancel}
      />
    </div>
  )
}
