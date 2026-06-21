import { cn } from '@/lib/utils'
import type { AppointmentStatus, PrescriptionStatus, BillingStatus } from '@/mocks/types'

type AnyStatus = AppointmentStatus | PrescriptionStatus | BillingStatus | 'active' | 'inactive'

const CONFIG: Record<string, { label: string; className: string }> = {
  // Appointment — booking auto-reserves the slot, so a new appointment reads "Reserved".
  scheduled:   { label: 'Reserved',    className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  confirmed:   { label: 'Confirmed',   className: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200' },
  served:      { label: 'Completed',   className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  rescheduled: { label: 'Rescheduled', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  cancelled:   { label: 'Cancelled',   className: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
  // Prescription
  issued:      { label: 'Issued',      className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  verified:    { label: 'Verified',    className: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200' },
  dispensed:   { label: 'Dispensed',   className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  expired:     { label: 'Expired',     className: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
  // Billing
  pending:     { label: 'Pending',     className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  paid:        { label: 'Paid',        className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  waived:      { label: 'Waived',      className: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
  // User
  active:      { label: 'Active',      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  inactive:    { label: 'Inactive',    className: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
}

export default function StatusBadge({
  status,
  cancelledBy,
}: {
  status: AnyStatus
  /** For cancelled appointments — who cancelled it, so the badge reads "Cancelled by patient/clinic". */
  cancelledBy?: 'patient' | 'clinic' | null
}) {
  const cfg = CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' }
  const label = status === 'cancelled' && cancelledBy
    ? (cancelledBy === 'patient' ? 'Cancelled by patient' : 'Cancelled by clinic')
    : cfg.label
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', cfg.className)}>
      {label}
    </span>
  )
}
