import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, X, Search, MoreHorizontal, Loader2, CalendarOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import StatusBadge from '@/components/common/StatusBadge'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAuthStore } from '@/features/auth/authStore'
import { useAppointments, useUpdateAppointmentStatus } from './queries'
import AppointmentCalendar from './AppointmentCalendar'
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

export default function AppointmentsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [openMenu, setOpenMenu] = useState<number | null>(null)

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
    // Served + cancelled appointments leave the active tab — still reachable via their filter pill.
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

  const isDoctor  = user?.role === 'doctor'
  const isStaff   = user?.role === 'staff'
  const isPatient = user?.role === 'patient'
  // Staff manage their assigned doctor's calendar the same way the doctor does.
  const useCalendar = isDoctor || isStaff
  const canBook   = isPatient || user?.role === 'admin'
  // Doctors/staff/admin manage leave dates on the availability page (gated again on that page).
  const canManageAvailability = isDoctor || user?.role === 'staff' || user?.role === 'admin'

  return (
    <div onClick={() => setOpenMenu(null)}>
      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(215 30% 14%)' }}>
            Appointments
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(215 16% 45%)' }}>
            {data?.meta?.total ?? 0} record{(data?.meta?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canManageAvailability && (
            <button
              onClick={() => navigate('/appointments/availability')}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors hover:bg-slate-50"
              style={{ backgroundColor: 'white', color: 'hsl(201 100% 36%)', border: '1px solid hsl(210 18% 88%)' }}
            >
              <CalendarOff size={15} />
              Availability
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
              const patientName = appt.patient?.user?.name ?? `Patient #${appt.patient_id}`
              const doctorName  = appt.doctor?.user?.name ?? `Doctor #${appt.doctor_id}`
              const primaryName = isPatient ? doctorName : patientName
              const primarySub  = isPatient ? appt.doctor?.specialization : appt.patient?.user?.email

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
                      <p className="text-xs truncate" style={{ color: 'hsl(215 16% 50%)' }}>
                        {primarySub}
                      </p>
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
        description={`Cancel the appointment for ${cancelTarget?.patient?.user?.name ?? 'this patient'}? This cannot be undone.`}
        confirmLabel="Cancel Appointment"
        variant="destructive"
        loading={cancelMutation.isPending}
        onConfirm={handleCancel}
      />
    </div>
  )
}
