import { useNavigate } from 'react-router-dom'
import {
  Users, Pill, Calendar, AlertTriangle, UserPlus,
  Database, Loader2, Activity,
} from 'lucide-react'
import { useDashboardSummary, usePrescriptionActivity, useAuditLogs } from './queries'
import type { ActivityLog } from '@/mocks/types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function activityBadge(log: ActivityLog): { label: string; bg: string; color: string } {
  const a = log.action.toLowerCase()
  if (a.includes('delete') || a.includes('cancel') || a.includes('flag'))
    return { label: 'Alert',  bg: 'bg-red-50',    color: 'text-red-600' }
  if (a.includes('create') || a.includes('register') || a.includes('new'))
    return { label: 'Info',   bg: 'bg-blue-50',   color: 'text-blue-600' }
  if (a.includes('update') || a.includes('approve') || a.includes('verify'))
    return { label: 'Action', bg: 'bg-amber-50',  color: 'text-amber-700' }
  return   { label: 'Log',   bg: 'bg-slate-100', color: 'text-slate-500' }
}

function KpiCard({
  value, label, sub, subColor = 'hsl(215 16% 55%)',
}: {
  value: number | string; label: string; sub?: string; subColor?: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
      <p className="text-4xl font-bold" style={{ color: 'hsl(215 30% 14%)' }}>{value}</p>
      <p className="text-xs mt-2" style={{ color: 'hsl(215 16% 50%)' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5 font-semibold" style={{ color: subColor }}>{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()

  const { data: summary, isLoading } = useDashboardSummary()
  const { data: rxActivity }         = usePrescriptionActivity()
  const { data: auditData }          = useAuditLogs({ page: 1 })

  const recentLogs   = auditData?.data?.slice(0, 5) ?? []
  const pendingVerif = summary?.pending_verifications ?? 0

  const activityFeed = [
    ...(pendingVerif > 0
      ? [{
          id: -1,
          icon: <AlertTriangle size={15} className="text-amber-500" />,
          text: `${pendingVerif} pending Rx verification${pendingVerif !== 1 ? 's' : ''} — needs review`,
          badge: { label: 'Action', bg: 'bg-amber-50', color: 'text-amber-700' },
          time: 'Now',
        }]
      : []),
    ...recentLogs.slice(0, 4).map((log) => {
      const b = activityBadge(log)
      return {
        id: log.id,
        icon: <Activity size={15} className="text-slate-400" />,
        text: `${log.action.replace(/_/g, ' ')} — ${log.target_type} #${log.target_id}`,
        badge: b,
        time: timeAgo(log.created_at),
      }
    }),
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
      {/* ── Activity feed ── */}
      {activityFeed.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          {activityFeed.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
              style={{ borderBottom: i < activityFeed.length - 1 ? '1px solid hsl(210 18% 93%)' : 'none' }}
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'hsl(210 14% 95%)' }}
              >
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'hsl(215 30% 14%)' }}>{item.text}</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(215 16% 55%)' }}>{item.time}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.badge.bg} ${item.badge.color}`}>
                {item.badge.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          value={summary?.total_patients ?? 0}
          label="Total patients"
          sub={`↑ ${summary?.new_patients_this_week ?? 0} this week`}
          subColor="hsl(152 50% 38%)"
        />
        <KpiCard
          value={summary?.total_appointments_today ?? 0}
          label="Appointments today"
          sub="Scheduled"
          subColor="hsl(201 100% 36%)"
        />
        <KpiCard
          value={pendingVerif}
          label="Pending Rx verifications"
          sub={pendingVerif > 0 ? 'Action needed' : 'All clear'}
          subColor={pendingVerif > 0 ? 'hsl(38 92% 50%)' : 'hsl(152 50% 38%)'}
        />
        <KpiCard
          value={summary?.new_patients_this_week ?? 0}
          label="New patients this week"
          sub="Registered"
          subColor="hsl(201 100% 36%)"
        />
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent activity */}
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>Recent activity</p>
            <button
              onClick={() => navigate('/audit-logs')}
              className="text-xs font-medium hover:underline"
              style={{ color: 'hsl(201 100% 36%)' }}
            >
              View all
            </button>
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'hsl(215 16% 55%)' }}>No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => {
                const b = activityBadge(log)
                return (
                  <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 30%)' }}
                    >
                      {(log.user?.name ?? '?').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'hsl(215 30% 14%)' }}>
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs" style={{ color: 'hsl(215 16% 55%)' }}>
                        {log.user?.name ?? `User #${log.user_id}`} · {timeAgo(log.created_at)}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.bg} ${b.color}`}>
                      {b.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* System status */}
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'hsl(215 30% 14%)' }}>System status</p>
          <div className="space-y-0">
            {[
              {
                icon: <Database size={15} className="text-slate-400" />,
                label: 'Database',
                status: 'Online',
                color: 'hsl(152 50% 38%)',
              },
              {
                icon: <UserPlus size={15} className="text-slate-400" />,
                label: 'Hyperledger Fabric',
                status: 'Synced',
                color: 'hsl(152 50% 38%)',
              },
              {
                icon: <Users size={15} className="text-slate-400" />,
                label: 'Active users',
                status: String(summary?.total_patients ?? '—'),
                color: 'hsl(201 100% 36%)',
              },
              {
                icon: <Pill size={15} className="text-slate-400" />,
                label: 'Rx dispensed today',
                status: String(rxActivity?.by_status?.dispensed ?? 0),
                color: 'hsl(215 30% 14%)',
              },
              {
                icon: <Calendar size={15} className="text-slate-400" />,
                label: 'Last backup',
                status: '02:00 AM',
                color: 'hsl(215 16% 55%)',
              },
            ].map(({ icon, label, status, color }) => (
              <div
                key={label}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: '1px solid hsl(210 18% 93%)' }}
              >
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="text-sm" style={{ color: 'hsl(215 16% 45%)' }}>{label}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
