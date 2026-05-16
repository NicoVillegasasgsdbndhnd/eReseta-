import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, X, Filter, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DataTable, { type Column } from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import PageHeader from '@/components/common/PageHeader'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAuthStore } from '@/features/auth/authStore'
import { useAppointments, useUpdateAppointmentStatus } from './queries'
import type { Appointment } from '@/mocks/types'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'scheduled', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'served', label: 'Served' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'cancelled', label: 'Cancelled' },
]

const TYPE_LABEL: Record<string, string> = {
  consultation: 'Consultation',
  follow_up:    'Follow-up',
  emergency:    'Emergency',
}

const TYPE_COLOR: Record<string, string> = {
  consultation: 'bg-blue-50 text-blue-700',
  follow_up:    'bg-purple-50 text-purple-700',
  emergency:    'bg-red-50 text-red-700',
}

export default function AppointmentsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)

  const { data, isLoading, isError } = useAppointments(
    statusFilter ? { status: statusFilter } : undefined,
  )
  const cancelMutation = useUpdateAppointmentStatus()

  const STATUS_PRIORITY: Record<string, number> = {
    scheduled: 0,
    confirmed: 1,
    rescheduled: 2,
    cancelled: 3,
    served: 4,
  }

  const appointments = useMemo(() => {
    const raw = data?.data ?? []
    return [...raw].sort((a, b) => {
      const pd = (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99)
      if (pd !== 0) return pd
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    })
  }, [data])

  const columns: Column<Appointment>[] = [
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
            {row.patient?.user?.name?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-sm">
              {row.patient?.user?.name ?? `Patient #${row.patient_id}`}
            </p>
            <p className="text-xs text-slate-400">{row.patient?.user?.email}</p>
          </div>
        </div>
      ),
    },
    ...(user?.role !== 'doctor' ? [{
      key: 'doctor',
      header: 'Doctor',
      render: (row: Appointment) => (
        <div>
          <p className="text-sm text-slate-700">
            {row.doctor?.user?.name ?? `Doctor #${row.doctor_id}`}
          </p>
          <p className="text-xs text-slate-400">{row.doctor?.specialization}</p>
        </div>
      ),
    }] as Column<Appointment>[] : []),
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLOR[row.type] ?? 'bg-slate-100 text-slate-600'}`}
        >
          {TYPE_LABEL[row.type] ?? row.type}
        </span>
      ),
    },
    {
      key: 'scheduled_at',
      header: 'Schedule',
      render: (row) => (
        <div>
          <p className="text-sm text-slate-700">
            {new Date(row.scheduled_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
          </p>
          <p className="text-xs text-slate-400">
            {new Date(row.scheduled_at).toLocaleTimeString('en-PH', { timeStyle: 'short' })}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    ...(user?.role !== 'doctor' ? [{
      key: 'actions',
      header: '',
      className: 'w-28',
      render: (row: Appointment) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/appointments/${row.id}`)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            <Eye size={13} /> View
          </button>
          {row.status !== 'cancelled' && row.status !== 'served' && (
            <button
              onClick={() => setCancelTarget(row)}
              className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      ),
    }] as Column<Appointment>[] : []),
  ]

  const handleCancel = async () => {
    if (!cancelTarget) return
    await cancelMutation.mutateAsync({ id: cancelTarget.id, status: 'cancelled' })
    setCancelTarget(null)
  }

  const canBook = user?.role === 'patient' || user?.role === 'admin'

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Manage all patient appointments and schedules"
        action={
          canBook ? (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              onClick={() => navigate('/appointments/new')}
            >
              <Plus size={15} className="mr-1.5" /> Book Appointment
            </Button>
          ) : undefined
        }
      />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex items-center gap-2 bg-white rounded-lg px-3 h-9 shadow-sm"
            style={{ border: '1px solid hsl(214 20% 90%)' }}
          >
            <Filter size={13} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm text-slate-600 bg-transparent focus:outline-none cursor-pointer"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-slate-400">
            {data?.meta.total ?? 0} record{(data?.meta.total ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : isError ? (
          <div className="text-center py-20 text-sm text-red-500">Failed to load appointments.</div>
        ) : (
          <DataTable<Appointment>
            data={appointments}
            columns={columns}
            searchPlaceholder="Search patient or doctor…"
            searchFn={(row, q) =>
              (row.patient?.user?.name ?? '').toLowerCase().includes(q) ||
              (row.doctor?.user?.name ?? '').toLowerCase().includes(q)
            }
            onRowDoubleClick={user?.role === 'doctor' ? (row) => navigate(`/appointments/${row.id}`) : undefined}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Cancel Appointment"
        description={`Are you sure you want to cancel the appointment for ${cancelTarget?.patient?.user?.name ?? 'this patient'}? This cannot be undone.`}
        confirmLabel="Cancel Appointment"
        variant="destructive"
        loading={cancelMutation.isPending}
        onConfirm={handleCancel}
      />
    </>
  )
}
