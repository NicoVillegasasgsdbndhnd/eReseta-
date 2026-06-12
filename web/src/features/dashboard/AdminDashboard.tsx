import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import type { PrescriptionStatus } from '@/mocks/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatusBadge from '@/components/common/StatusBadge'
import { useDashboardSummary, useAppointmentStats, usePrescriptionActivity } from './queries'
import { Greeting, StatStrip, Panel, ViewAllLink, TEAL } from './DashboardKit'

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#0ea5e9', confirmed: '#0d9488', served: '#10b981', rescheduled: '#f59e0b', cancelled: '#ef4444',
}
const CHART_TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid hsl(40 22% 88%)', borderRadius: '10px', fontSize: '12px' }

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isStaff = user?.role === 'staff'
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: stats } = useAppointmentStats()
  const { data: rxActivity } = usePrescriptionActivity()

  const pieData = Object.entries(stats?.by_status ?? {}).map(([name, value]) => ({ name, value }))
  const barData = Object.entries(stats?.by_doctor ?? {}).map(([, d]) => ({
    doctor: (d as { doctor: string | null; count: number }).doctor?.split(' ').pop() ?? '—',
    appointments: (d as { doctor: string | null; count: number }).count,
  }))
  const apptTotal = Object.values(stats?.by_status ?? {}).reduce((a, b) => a + b, 0)

  const kpis = isStaff
    ? [
        { label: 'Appointments today', value: summary?.total_appointments_today ?? 0, to: '/appointments' },
        { label: 'All appointments', value: apptTotal },
      ]
    : [
        { label: 'Appointments today', value: summary?.total_appointments_today ?? 0, to: '/appointments' },
        { label: 'Registered patients', value: summary?.total_patients ?? 0, to: '/patients' },
        { label: 'Pending Rx verification', value: summary?.pending_verifications ?? 0, to: '/prescriptions' },
        { label: 'All appointments', value: apptTotal },
      ]

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
  }

  return (
    <div className="space-y-8">
      <Greeting name={user?.name} subtitle={isStaff ? "today's overview." : 'hospital overview.'} />

      <StatStrip stats={kpis} />

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3">
          <Panel title="Appointments by doctor">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={barData} barSize={28}>
                <XAxis dataKey="doctor" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'hsl(168 79% 37% / 0.06)' }} />
                <Bar dataKey="appointments" fill={TEAL} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <div className="md:col-span-2">
          <Panel title="Appointment status">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={65} innerRadius={35} dataKey="value">
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-1">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.name] ?? '#94a3b8' }} />
                    <span className="text-xs capitalize text-slate-500">{entry.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{entry.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isStaff && (
          <Panel title="Recent prescriptions" action={<ViewAllLink onClick={() => navigate('/prescriptions')} />}>
            {(rxActivity?.recent ?? []).length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No recent prescriptions.</p>
            ) : (
              <div className="space-y-1.5">
                {(rxActivity?.recent ?? []).slice(0, 5).map((rx, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-semibold text-slate-700">{rx.reference_no}</p>
                      <p className="text-xs text-slate-500 truncate">{rx.patient} · {rx.doctor}</p>
                    </div>
                    <StatusBadge status={rx.status as PrescriptionStatus} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        <Panel title="Quick stats" action={<ViewAllLink label="Full report" onClick={() => navigate('/reports')} />}>
          <div className="space-y-2.5">
            {Object.entries(summary ?? {}).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                <span className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm font-bold text-slate-700">{String(val)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
