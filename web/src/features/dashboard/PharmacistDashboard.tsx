import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ScrollText, Clock, CheckCircle, ArrowUpRight, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useDashboardSummary, usePrescriptionActivity } from './queries'

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
}

export default function PharmacistDashboard() {
  const navigate = useNavigate()
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: rxActivity } = usePrescriptionActivity()

  const byStatus = rxActivity?.by_status ?? {}
  const barData = [
    { status: 'Issued',   count: byStatus['issued']   ?? 0, fill: '#3b82f6' },
    { status: 'Verified', count: byStatus['verified'] ?? 0, fill: '#6366f1' },
    { status: 'Dispensed',count: byStatus['dispensed'] ?? 0, fill: '#10b981' },
  ]

  const queue = (rxActivity?.recent ?? []).filter(
    (rx) => rx.status === 'issued' || rx.status === 'verified',
  )
  const dispensed = (rxActivity?.recent ?? []).filter((rx) => rx.status === 'dispensed')

  const stats = [
    {
      icon: <Clock size={19} className="text-amber-600" />,
      label: 'Awaiting Verification',
      value: summary?.awaiting_verification ?? 0,
      gradient: 'bg-amber-50',
      path: '/verify-queue',
    },
    {
      icon: <ShieldCheck size={19} className="text-indigo-600" />,
      label: 'Ready to Dispense',
      value: summary?.ready_to_dispense ?? 0,
      gradient: 'bg-indigo-50',
      path: '/verify-queue',
    },
    {
      icon: <CheckCircle size={19} className="text-emerald-600" />,
      label: 'Dispensed Today',
      value: summary?.dispensed_today ?? 0,
      gradient: 'bg-emerald-50',
      path: '/dispense-history',
    },
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
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            onClick={() => navigate(s.path)}
            className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
            style={{ border: '1px solid hsl(214 20% 90%)' }}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.gradient}`}>
              {s.icon}
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
            <ArrowUpRight size={14} className="text-slate-300" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <p className="text-sm font-semibold text-slate-700 mb-4">Prescription Status Overview</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={36}>
              <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(59,130,246,0.04)' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              <p className="text-sm font-semibold text-slate-700">Verification Queue</p>
            </div>
            <button
              onClick={() => navigate('/verify-queue')}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              View queue
            </button>
          </div>
          {queue.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle size={24} className="mx-auto mb-2 text-emerald-400" />
              <p className="text-sm text-slate-400">Queue is empty — all clear!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.slice(0, 5).map((rx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-slate-700">{rx.reference_no}</p>
                    <p className="text-xs text-slate-400 truncate">{rx.patient}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      rx.status === 'issued'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {rx.status === 'issued' ? 'Pending' : 'Ready'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ScrollText size={14} className="text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Recent Dispenses</p>
          </div>
          <button
            onClick={() => navigate('/dispense-history')}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            View all
          </button>
        </div>
        {dispensed.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No dispenses yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {dispensed.slice(0, 4).map((rx, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono font-semibold text-slate-700">{rx.reference_no}</p>
                  <p className="text-xs text-slate-400">{rx.patient}</p>
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'short' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
