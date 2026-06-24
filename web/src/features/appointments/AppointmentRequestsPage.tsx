import { useState } from 'react'
import { Loader2, Inbox, Check, X, Phone, Mail, Calendar, AlertTriangle, Clock3 } from 'lucide-react'
import {
  useAppointmentRequests, useApproveAppointmentRequest, useDeclineAppointmentRequest,
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
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function AppointmentRequestsPage() {
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]['value']>('pending')
  const { data, isLoading } = useAppointmentRequests(tab)
  const approve = useApproveAppointmentRequest()
  const decline = useDeclineAppointmentRequest()
  const [actionError, setActionError] = useState<string | null>(null)

  const requests = data?.data ?? []
  const reviewReadyCount = requests.filter(isReviewReady).length

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
      <div>
        <h1 className="text-xl font-bold text-slate-800">Appointment Requests</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Guest booking requests from the public site. Approve to add them to the doctor's schedule.
        </p>
      </div>

      <div className="flex gap-1.5">
        {STATUS_TABS.map((s) => (
          <button
            key={s.value}
            onClick={() => setTab(s.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={tab === s.value
              ? { backgroundColor: BLUE, color: 'white' }
              : { backgroundColor: 'white', color: 'hsl(215 16% 45%)', border: '1px solid hsl(210 18% 88%)' }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {tab !== 'pending' && (
        <div className="rounded-xl px-3 py-2.5 text-xs text-slate-600 bg-sky-50 flex items-start gap-1.5" style={{ border: '1px solid hsl(201 55% 88%)' }}>
          <Clock3 size={14} className="shrink-0 mt-0.5" style={{ color: BLUE }} />
          <span>
            Approved and declined guest requests stay out of the pending work queue. After {REVIEW_AFTER_HOURS} hours, they are marked here as ready for review cleanup.
            {reviewReadyCount > 0 && <span className="font-semibold text-slate-800"> {reviewReadyCount} ready.</span>}
          </span>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl px-3 py-2.5 text-xs font-medium text-red-600 bg-red-50 flex items-start gap-1.5" style={{ border: '1px solid hsl(0 80% 90%)' }}>
          <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {actionError}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <Inbox size={26} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-500 mt-3 capitalize">No {tab} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r, i) => {
            const c = avatarColor(i)
            return (
              <div key={r.id} className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0" style={{ backgroundColor: c.bg, color: c.fg }}>
                    {initial(r.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800">{r.full_name}</p>
                      <span className="text-xs font-mono text-slate-400">{r.reference_no}</span>
                      {isReviewReady(r) && (
                        <span className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-slate-100 text-slate-600">
                          24h review
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1"><Phone size={12} /> {r.mobile}</span>
                      <span className="inline-flex items-center gap-1"><Mail size={12} /> {r.email}</span>
                      <span className="inline-flex items-center gap-1"><Calendar size={12} /> {fmtDateTime(r.preferred_date)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Doctor: <span className="font-medium text-slate-700">{r.doctor?.user?.name ?? `#${r.doctor_id}`}</span>
                      {r.doctor?.specialization && <span className="text-slate-400"> · {r.doctor.specialization}</span>}
                    </p>
                    {r.reason && <p className="text-sm text-slate-600 mt-2 italic">"{r.reason}"</p>}
                    {r.decline_reason && <p className="text-xs text-red-500 mt-2">Declined: {r.decline_reason}</p>}
                  </div>

                  {r.status === 'pending' && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => onApprove(r)}
                        disabled={approve.isPending}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: BLUE }}
                      >
                        <Check size={15} /> Approve
                      </button>
                      <button
                        onClick={() => onDecline(r)}
                        disabled={decline.isPending}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                        style={{ border: '1px solid hsl(210 18% 88%)', color: 'hsl(215 16% 45%)' }}
                      >
                        <X size={15} /> Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
