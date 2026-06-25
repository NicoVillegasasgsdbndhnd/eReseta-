import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Loader2,
  Pill,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDashboardSummary, usePrescriptionActivity } from './queries'

const BLUE = 'hsl(201 100% 36%)'
const INK = 'hsl(215 30% 14%)'
const BORDER = 'hsl(210 18% 88%)'

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
}

type RxItem = {
  reference_no: string
  patient: string | null
  doctor: string | null
  status: string
  issued_at: string
}

function statusTone(status: string) {
  if (status === 'issued') return 'bg-amber-50 text-amber-700 ring-amber-100'
  if (status === 'verified') return 'bg-cyan-50 text-cyan-700 ring-cyan-100'
  if (status === 'dispensed') return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

function statusLabel(status: string) {
  if (status === 'issued') return 'Verify'
  if (status === 'verified') return 'Dispense'
  if (status === 'dispensed') return 'Done'
  return status
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function QueueRow({ rx, onOpen }: { rx: RxItem; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="grid w-full grid-cols-[1fr_auto] gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-mono text-sm font-bold text-slate-900">{rx.reference_no}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${statusTone(rx.status)}`}>
            {statusLabel(rx.status)}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">
          {rx.patient || 'Unnamed patient'}{rx.doctor ? ` - ${rx.doctor}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        {formatShortDate(rx.issued_at)}
        <ArrowRight size={14} />
      </div>
    </button>
  )
}

export default function PharmacistDashboard() {
  const navigate = useNavigate()
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: rxActivity } = usePrescriptionActivity()

  const recent = rxActivity?.recent ?? []
  const byStatus = rxActivity?.by_status ?? {}
  const issued = summary?.awaiting_verification ?? byStatus.issued ?? 0
  const verified = summary?.ready_to_dispense ?? byStatus.verified ?? 0
  const dispensedToday = summary?.dispensed_today ?? 0
  const queueTotal = Number(issued) + Number(verified)

  const queue = recent.filter((rx) => rx.status === 'issued' || rx.status === 'verified')
  const dispensed = recent.filter((rx) => rx.status === 'dispensed')

  const barData = [
    { status: 'Issued', count: byStatus.issued ?? 0, fill: '#f59e0b' },
    { status: 'Verified', count: byStatus.verified ?? 0, fill: '#0891b2' },
    { status: 'Dispensed', count: byStatus.dispensed ?? 0, fill: '#059669' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section
        className="overflow-hidden rounded-2xl bg-white shadow-sm"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <Sparkles size={13} />
                Pharmacy shift
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="mt-5 max-w-2xl">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: INK }}>
                Prescription verification desk
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Review issued prescriptions, confirm blockchain-ready records, and move verified orders to dispensing without losing the queue context.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/verify-queue')}
                className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-sm transition-colors hover:brightness-95"
                style={{ backgroundColor: BLUE }}
              >
                <ShieldCheck size={17} />
                Open verify queue
              </button>
              <button
                onClick={() => navigate('/medicines')}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                style={{ border: `1px solid ${BORDER}` }}
              >
                <Pill size={17} />
                Medicine availability
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/70 lg:border-l lg:border-t-0">
            {[
              { label: 'To verify', value: issued, icon: Clock3, color: 'text-amber-600' },
              { label: 'To dispense', value: verified, icon: ClipboardCheck, color: 'text-cyan-600' },
              { label: 'Done today', value: dispensedToday, icon: CheckCircle2, color: 'text-emerald-600' },
            ].map((item) => (
              <div key={item.label} className="border-r border-slate-100 p-4 last:border-r-0 sm:p-5">
                <item.icon size={18} className={item.color} />
                <p className="mt-4 text-2xl font-black tabular-nums text-slate-900">{item.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="rounded-2xl bg-white shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-sm font-bold text-slate-900">Active pharmacy queue</p>
              <p className="text-xs text-slate-500">{queueTotal} prescription{queueTotal === 1 ? '' : 's'} need pharmacist action</p>
            </div>
            <button
              onClick={() => navigate('/verify-queue')}
              className="rounded-lg px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50"
            >
              Manage queue
            </button>
          </div>

          {queue.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
              <CheckCircle2 size={34} className="text-emerald-400" />
              <p className="mt-3 text-sm font-bold text-slate-800">Queue is clear</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                New prescriptions issued by physicians will appear here for verification and dispensing.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 p-2">
              {queue.slice(0, 7).map((rx) => (
                <QueueRow key={rx.reference_no} rx={rx} onOpen={() => navigate('/verify-queue')} />
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Prescription movement</p>
                <p className="text-xs text-slate-500">Current status distribution</p>
              </div>
              <ScrollText size={18} className="text-slate-300" />
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={barData} barSize={34}>
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl bg-white shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Recent dispenses</p>
                <p className="text-xs text-slate-500">Latest completed pharmacy releases</p>
              </div>
              <button
                onClick={() => navigate('/dispense-history')}
                className="rounded-lg px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50"
              >
                View history
              </button>
            </div>
            {dispensed.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No dispenses recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 p-2">
                {dispensed.slice(0, 5).map((rx) => (
                  <QueueRow key={rx.reference_no} rx={rx} onOpen={() => navigate('/dispense-history')} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
