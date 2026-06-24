import { useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock3,
  Inbox,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  X,
} from 'lucide-react'
import {
  useAppointmentRequests,
  useApproveAppointmentRequest,
  useDeclineAppointmentRequest,
  type AppointmentRequest,
} from './queries'
import { avatarColor, initial } from '@/lib/avatar'

const BLUE = 'hsl(201 100% 36%)'
const STATUS_TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
] as const
const REVIEW_AFTER_HOURS = 24
const REVIEW_AFTER_MS = REVIEW_AFTER_HOURS * 60 * 60 * 1000

function isReviewReady(r: AppointmentRequest) {
  return r.status !== 'pending' && Date.now() - new Date(r.updated_at).getTime() >= REVIEW_AFTER_MS
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function requestStatusStyles(status: AppointmentRequest['status']) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'declined') return 'bg-red-50 text-red-600 ring-red-200'
  if (status === 'cancelled') return 'bg-slate-100 text-slate-500 ring-slate-200'
  return 'bg-amber-50 text-amber-700 ring-amber-200'
}

export default function AppointmentRequestsPage() {
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]['value']>('pending')
  const { data, isLoading } = useAppointmentRequests(tab)
  const approve = useApproveAppointmentRequest()
  const decline = useDeclineAppointmentRequest()
  const [actionError, setActionError] = useState<string | null>(null)

  const requests = data?.data ?? []
  const reviewReadyCount = requests.filter(isReviewReady).length
  const pendingCountLabel = tab === 'pending' ? `${requests.length} waiting` : `${requests.length} ${tab}`

  const onApprove = async (r: AppointmentRequest) => {
    setActionError(null)
    try {
      await approve.mutateAsync(r.id)
    } catch (e) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      setActionError(err.response?.data?.errors?.scheduled_at?.[0] ?? err.response?.data?.message ?? 'Could not approve the request.')
    }
  }

  const onDecline = async (r: AppointmentRequest) => {
    setActionError(null)
    const reason = window.prompt('Reason for declining (optional):') ?? undefined
    try {
      await decline.mutateAsync({ id: r.id, decline_reason: reason || undefined })
    } catch {
      setActionError('Could not decline the request.')
    }
  }

  return (
    <div className="space-y-5">
      <div
        className="overflow-hidden rounded-xl shadow-sm"
        style={{ border: '1px solid hsl(201 55% 82%)', background: 'linear-gradient(135deg, hsl(201 74% 96%) 0%, hsl(168 48% 95%) 100%)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white" style={{ backgroundColor: BLUE }}>
              <Inbox size={14} />
              Guest request queue
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Appointment Requests</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Review public booking requests, approve valid visits into the assigned doctor schedule, or decline with a reason.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/70 bg-white/35 px-5 py-3 text-sm">
          <span className="inline-flex items-center gap-2 font-medium text-slate-700">
            <UserPlus size={15} className="text-sky-700" />
            <strong className="text-slate-900">{pendingCountLabel}</strong>
          </span>
          <span className="hidden h-4 w-px bg-slate-300/70 sm:block" />
          <span className="inline-flex items-center gap-2 font-medium text-slate-700">
            <Clock3 size={15} className="text-amber-700" />
            cleanup review after {REVIEW_AFTER_HOURS}h
          </span>
          {tab !== 'pending' && (
            <>
              <span className="hidden h-4 w-px bg-slate-300/70 sm:block" />
              <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                <ShieldCheck size={15} className="text-emerald-700" />
                <strong className="text-slate-900">{reviewReadyCount}</strong> ready for cleanup review
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((status) => (
            <button
              key={status.value}
              onClick={() => setTab(status.value)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
              style={tab === status.value
                ? { backgroundColor: BLUE, color: 'white', borderColor: BLUE }
                : { backgroundColor: 'white', color: 'hsl(215 16% 45%)', borderColor: 'hsl(210 18% 88%)' }}
            >
              {status.label}
            </button>
          ))}
        </div>
        <p className="text-xs font-medium text-slate-500">
          {tab === 'pending' ? 'Pending requests need staff decision.' : 'Approved/declined requests stay here for review visibility.'}
        </p>
      </div>

      {tab !== 'pending' && (
        <div className="flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-xs text-slate-600" style={{ border: '1px solid hsl(201 55% 88%)' }}>
          <Clock3 size={14} className="mt-0.5 shrink-0" style={{ color: BLUE }} />
          <span>
            Approved and declined guest requests stay out of the pending work queue. After {REVIEW_AFTER_HOURS} hours, they are marked here as ready for review cleanup.
            {reviewReadyCount > 0 && <span className="font-semibold text-slate-800"> {reviewReadyCount} ready.</span>}
          </span>
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600" style={{ border: '1px solid hsl(0 80% 90%)' }}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {actionError}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <Inbox size={26} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-semibold capitalize text-slate-500">No {tab} requests</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div
            className="hidden grid-cols-[minmax(220px,1.3fr)_minmax(190px,1fr)_minmax(180px,1fr)_0.75fr_170px] items-center gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid"
            style={{ backgroundColor: 'hsl(201 70% 97%)', borderBottom: '1px solid hsl(210 18% 92%)' }}
          >
            <span>Guest patient</span>
            <span>Contact</span>
            <span>Requested visit</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-slate-100">
            {requests.map((request, index) => {
              const color = avatarColor(index)
              return (
                <div
                  key={request.id}
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(220px,1.3fr)_minmax(190px,1fr)_minmax(180px,1fr)_0.75fr_170px] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold" style={{ backgroundColor: color.bg, color: color.fg }}>
                      {initial(request.full_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-slate-900">{request.full_name}</p>
                        {isReviewReady(request) && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            24h review
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate font-mono text-xs text-slate-400">{request.reference_no}</p>
                      {request.reason && <p className="mt-1 line-clamp-2 text-xs italic text-slate-500">&quot;{request.reason}&quot;</p>}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500">
                    <p className="flex items-center gap-1.5"><Phone size={12} /> {request.mobile}</p>
                    <p className="flex items-center gap-1.5"><Mail size={12} /> {request.email}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <CalendarDays size={14} className="text-sky-700" />
                      {fmtDateTime(request.preferred_date)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <Stethoscope size={12} />
                      {request.doctor?.user?.name ?? `Doctor #${request.doctor_id}`}
                      {request.doctor?.specialization ? ` | ${request.doctor.specialization}` : ''}
                    </p>
                  </div>

                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${requestStatusStyles(request.status)}`}>
                      {request.status}
                    </span>
                    {request.decline_reason && <p className="mt-1 text-xs text-red-500">Declined: {request.decline_reason}</p>}
                  </div>

                  <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                    {request.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => onApprove(request)}
                          disabled={approve.isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: BLUE }}
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => onDecline(request)}
                          disabled={decline.isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          style={{ border: '1px solid hsl(210 18% 88%)' }}
                        >
                          <X size={14} /> Decline
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">Reviewed</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
