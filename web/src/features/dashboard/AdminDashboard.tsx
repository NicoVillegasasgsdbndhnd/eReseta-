import { useNavigate } from 'react-router-dom'
import { Calendar, Users, Pill, FileText, TrendingUp, Clock, ArrowUpRight, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import type { PrescriptionStatus } from '@/mocks/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import StatusBadge from '@/components/common/StatusBadge'
import { useDashboardSummary, useAppointmentStats, usePrescriptionActivity } from './queries'

const STATUS_COLORS: Record<string, string> = {
  scheduled:   '#3b82f6',
  confirmed:   '#6366f1',
  served:      '#10b981',
  rescheduled: '#f59e0b',
  cancelled:   '#ef4444',
}

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  sub?: string
  gradient: string
  onClick?: () => void
}

function StatCard({ icon, label, value, sub, gradient, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      style={{ border: '1px solid hsl(214 20% 90%)' }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${gradient}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-emerald-600 font-medium mt-0.5">{sub}</p>}
      </div>
      {onClick && <ArrowUpRight size={14} className="text-slate-300 shrink-0" />}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isStaff = user?.role === 'staff'
  const { data: summary, isLoading: loadingSummary } = useDashboardSummary()
  const { data: stats } = useAppointmentStats()
  const { data: rxActivity } = usePrescriptionActivity()

  const pieData = Object.entries(stats?.by_status ?? {}).map(([name, value]) => ({ name, value }))
  const barData = Object.entries(stats?.by_doctor ?? {}).map(([, d]) => ({
    doctor: (d as { doctor: string | null; count: number }).doctor?.split(' ').pop() ?? '—',
    appointments: (d as { doctor: string | null; count: number }).count,
  }))

  if (loadingSummary) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar size={20} className="text-blue-600" />}
          label="Appointments Today"
          value={summary?.total_appointments_today ?? 0}
          gradient="bg-blue-50"
          onClick={() => navigate('/appointments')}
        />
        {!isStaff && (
          <StatCard
            icon={<Users size={20} className="text-emerald-600" />}
            label="Registered Patients"
            value={summary?.total_patients ?? 0}
            sub={`+${summary?.new_patients_this_week ?? 0} this week`}
            gradient="bg-emerald-50"
            onClick={() => navigate('/patients')}
          />
        )}
        {!isStaff && (
          <StatCard
            icon={<Pill size={20} className="text-amber-600" />}
            label="Pending Rx Verification"
            value={summary?.pending_verifications ?? 0}
            gradient="bg-amber-50"
            onClick={() => navigate('/prescriptions')}
          />
        )}
        <StatCard
          icon={<FileText size={20} className="text-indigo-600" />}
          label="Appointment Status"
          value={Object.values(stats?.by_status ?? {}).reduce((a, b) => a + b, 0)}
          gradient="bg-indigo-50"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3 bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-blue-600" />
            <p className="text-sm font-semibold text-slate-700">Appointments by Doctor</p>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={barData} barSize={28}>
              <XAxis dataKey="doctor" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
              <Bar dataKey="appointments" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={15} className="text-indigo-600" />
            <p className="text-sm font-semibold text-slate-700">Status Breakdown</p>
          </div>
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
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isStaff && (
          <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">Recent Prescriptions</p>
              </div>
              <button onClick={() => navigate('/prescriptions')} className="text-xs text-blue-600 hover:underline font-medium">
                View all
              </button>
            </div>
            {(rxActivity?.recent ?? []).length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-400">No recent prescriptions.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(rxActivity?.recent ?? []).slice(0, 5).map((rx, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-semibold text-slate-700">{rx.reference_no}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {rx.patient} · {rx.doctor}
                      </p>
                    </div>
                    <StatusBadge status={rx.status as PrescriptionStatus} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Quick Stats</p>
            </div>
            <button onClick={() => navigate('/reports')} className="text-xs text-blue-600 hover:underline font-medium">
              Full report
            </button>
          </div>
          <div className="space-y-3">
            {Object.entries(summary ?? {}).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                <span className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-sm font-bold text-slate-700">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
