import { useNavigate } from 'react-router-dom'
import {
  Users, Pill, CalendarDays, AlertTriangle, Activity, ScrollText, Boxes,
  BarChart3, Database, ShieldCheck, Loader2, ArrowRight, Sparkles,
  UserCog, CheckCircle2,
} from 'lucide-react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDashboardSummary, usePrescriptionActivity, useAppointmentStats, useAuditLogs } from './queries'
import type { ActivityLog } from '@/mocks/types'

const BLUE = 'hsl(201 100% 36%)'
const INK = 'hsl(215 30% 14%)'
const BORDER = 'hsl(210 18% 88%)'

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
}

// Rx lifecycle colors — aligned with the shared StatusBadge palette.
const RX_PIPELINE = [
  { key: 'issued', label: 'Issued', fill: '#f59e0b' },
  { key: 'verified', label: 'Verified', fill: '#0891b2' },
  { key: 'dispensed', label: 'Dispensed', fill: '#059669' },
  { key: 'expired', label: 'Expired', fill: '#94a3b8' },
] as const

// Appointment statuses with display labels matching StatusBadge.
const APPT_META: Record<string, { label: string; color: string }> = {
  scheduled:   { label: 'Reserved',    color: '#f59e0b' },
  confirmed:   { label: 'Confirmed',   color: '#0891b2' },
  served:      { label: 'Completed',   color: '#059669' },
  rescheduled: { label: 'Rescheduled', color: '#d97706' },
  cancelled:   { label: 'Cancelled',   color: '#dc2626' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function activityBadge(log: ActivityLog): { label: string; cls: string } {
  const a = log.action.toLowerCase()
  if (a.includes('delete') || a.includes('cancel') || a.includes('flag') || a.includes('break'))
    return { label: 'Alert',  cls: 'bg-red-50 text-red-600 ring-red-100' }
  if (a.includes('create') || a.includes('register') || a.includes('new') || a.includes('issue'))
    return { label: 'Created', cls: 'bg-blue-50 text-blue-700 ring-blue-100' }
  if (a.includes('update') || a.includes('approve') || a.includes('verify') || a.includes('dispense'))
    return { label: 'Action', cls: 'bg-amber-50 text-amber-700 ring-amber-100' }
  return   { label: 'Log',   cls: 'bg-slate-100 text-slate-500 ring-slate-200' }
}

function todayLabel() {
  return new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function AdminDashboard() {
  const navigate = useNavigate()

  const { data: summary, isLoading } = useDashboardSummary()
  const { data: rxActivity } = usePrescriptionActivity()
  const { data: apptStats }  = useAppointmentStats()
  const { data: auditData }  = useAuditLogs({ page: 1 })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  const pendingVerif = summary?.pending_verifications ?? 0
  const totalPatients = summary?.total_patients ?? 0
  const apptsToday = summary?.total_appointments_today ?? 0
  const newThisWeek = summary?.new_patients_this_week ?? 0

  const byStatus = rxActivity?.by_status ?? {}
  const rxTotal = RX_PIPELINE.reduce((sum, s) => sum + Number(byStatus[s.key] ?? 0), 0)
  const dispensedToday = Number(byStatus.dispensed ?? 0)
  const rxBars = RX_PIPELINE.map((s) => ({ label: s.label, count: Number(byStatus[s.key] ?? 0), fill: s.fill }))

  const apptByStatus = apptStats?.by_status ?? {}
  const apptTotal = Object.values(apptByStatus).reduce((sum, n) => sum + Number(n), 0)
  const apptRows = Object.entries(apptByStatus)
    .map(([status, count]) => ({
      status,
      count: Number(count),
      meta: APPT_META[status] ?? { label: status, color: '#64748b' },
    }))
    .sort((a, b) => b.count - a.count)

  const recentLogs = auditData?.data?.slice(0, 6) ?? []

  const stats = [
    { label: 'Total patients', value: totalPatients, icon: Users, hint: newThisWeek > 0 ? `+${newThisWeek} this week` : 'No new this week', tint: 'text-blue-600' },
    { label: 'Appointments today', value: apptsToday, icon: CalendarDays, hint: 'Scheduled', tint: 'text-cyan-600' },
    { label: 'Pending Rx', value: pendingVerif, icon: ShieldCheck, hint: pendingVerif > 0 ? 'Needs review' : 'All clear', tint: pendingVerif > 0 ? 'text-amber-600' : 'text-emerald-600' },
    { label: 'New this week', value: newThisWeek, icon: Sparkles, hint: 'Registered', tint: 'text-emerald-600' },
  ]

  const actions = [
    { title: 'Manage users', icon: UserCog, to: '/users', primary: true },
    { title: 'Reports', icon: BarChart3, to: '/reports' },
    { title: 'Audit logs', icon: ScrollText, to: '/audit-logs' },
    { title: 'Blockchain', icon: Boxes, to: '/blockchain' },
  ]

  return (
    <div className="space-y-5">
      {/* ── Hero band ── */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                <ShieldCheck size={13} />
                Administrator console
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {todayLabel()}
              </span>
            </div>
            <div className="mt-5 max-w-2xl">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: INK }}>
                System overview
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Monitor patient registrations, appointment flow, prescription lifecycle, and ledger activity across DEAMHI from one operational console.
              </p>
            </div>

            {pendingVerif > 0 && (
              <button
                onClick={() => navigate('/prescriptions')}
                className="mt-5 flex w-full items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-left ring-1 ring-amber-100 transition-colors hover:bg-amber-100/70"
              >
                <AlertTriangle size={18} className="shrink-0 text-amber-500" />
                <span className="flex-1 text-sm font-semibold text-amber-800">
                  {pendingVerif} prescription{pendingVerif === 1 ? '' : 's'} awaiting verification
                </span>
                <ArrowRight size={16} className="text-amber-500" />
              </button>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {actions.map((a) => (
                <button
                  key={a.title}
                  onClick={() => navigate(a.to)}
                  className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold shadow-sm transition-colors ${
                    a.primary ? 'text-white hover:brightness-95' : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  style={a.primary ? { backgroundColor: BLUE } : { border: `1px solid ${BORDER}` }}
                >
                  <a.icon size={17} />
                  {a.title}
                </button>
              ))}
            </div>
          </div>

          {/* KPI panel */}
          <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50/70 lg:border-l lg:border-t-0">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="border-slate-100 p-4 sm:p-5"
                style={{ borderRightWidth: i % 2 === 0 ? 1 : 0, borderTopWidth: i >= 2 ? 1 : 0 }}
              >
                <s.icon size={18} className={s.tint} />
                <p className="mt-3 text-3xl font-black tabular-nums text-slate-900">{s.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{s.label}</p>
                <p className={`mt-0.5 text-xs font-semibold ${s.tint}`}>{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Operations grid ── */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Prescription pipeline */}
          <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Prescription pipeline</p>
                <p className="text-xs text-slate-500">{rxTotal} total · {dispensedToday} dispensed</p>
              </div>
              <button
                onClick={() => navigate('/prescriptions')}
                className="rounded-lg px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50"
              >
                View all
              </button>
            </div>
            {rxTotal === 0 ? (
              <div className="flex min-h-[190px] flex-col items-center justify-center text-center">
                <Pill size={30} className="text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">No prescriptions yet</p>
                <p className="mt-1 text-xs text-slate-500">Issued prescriptions will appear in the lifecycle here.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={rxBars} barSize={40}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {rxBars.map((b) => <Cell key={b.label} fill={b.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Appointments by status */}
          <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Appointments by status</p>
                <p className="text-xs text-slate-500">{apptTotal} total across all doctors</p>
              </div>
              <button
                onClick={() => navigate('/reports')}
                className="rounded-lg px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50"
              >
                Reports
              </button>
            </div>
            {apptTotal === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No appointments recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {apptRows.map((row) => {
                  const pct = apptTotal > 0 ? Math.round((row.count / apptTotal) * 100) : 0
                  return (
                    <div key={row.status}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">{row.meta.label}</span>
                        <span className="font-bold tabular-nums text-slate-500">{row.count} · {pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: row.meta.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Recent activity */}
          <div className="rounded-2xl bg-white shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Recent activity</p>
                <p className="text-xs text-slate-500">Latest audited system events</p>
              </div>
              <button
                onClick={() => navigate('/audit-logs')}
                className="rounded-lg px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50"
              >
                View all
              </button>
            </div>
            {recentLogs.length === 0 ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center px-6 text-center">
                <Activity size={28} className="text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">No activity yet</p>
                <p className="mt-1 text-xs text-slate-500">Audited actions will stream in here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentLogs.map((log) => {
                  const b = activityBadge(log)
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: 'hsl(201 60% 92%)', color: 'hsl(201 100% 30%)' }}
                      >
                        {(log.user?.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold capitalize text-slate-800">
                          {log.action.replace(/_/g, ' ')}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {log.user?.name ?? `User #${log.user_id}`} · {log.target_type} #{log.target_id} · {timeAgo(log.created_at)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${b.cls}`}>
                        {b.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* System status */}
          <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
            <p className="mb-4 text-sm font-bold text-slate-900">System status</p>
            <div className="space-y-1">
              {[
                { icon: Database,    label: 'Database',           value: 'Online',  tone: 'text-emerald-600', dot: 'bg-emerald-500' },
                { icon: Boxes,       label: 'Hyperledger Fabric', value: 'Synced',  tone: 'text-emerald-600', dot: 'bg-emerald-500' },
                { icon: CheckCircle2,label: 'Rx dispensed today', value: String(dispensedToday), tone: 'text-slate-800', dot: null },
                { icon: Users,       label: 'Registered patients',value: String(totalPatients),  tone: 'text-slate-800', dot: null },
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid hsl(210 18% 93%)' : 'none' }}
                >
                  <div className="flex items-center gap-2.5">
                    <row.icon size={15} className="text-slate-400" />
                    <span className="text-sm text-slate-600">{row.label}</span>
                  </div>
                  <span className={`flex items-center gap-1.5 text-sm font-bold ${row.tone}`}>
                    {row.dot && <span className={`h-1.5 w-1.5 rounded-full ${row.dot}`} />}
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
