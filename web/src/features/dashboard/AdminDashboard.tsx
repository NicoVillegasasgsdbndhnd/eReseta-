import { useNavigate } from 'react-router-dom'
import { Calendar, Users, Pill, FileText, TrendingUp, Clock, ArrowUpRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import StatusBadge from '@/components/common/StatusBadge'
import { mockAppointments, mockPrescriptions, mockPatients, mockAuditLogs } from '@/mocks/data'

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

  const today = new Date().toISOString().split('T')[0]
  const todayAppts = mockAppointments.filter((a) => a.scheduled_at.startsWith(today))
  const pendingRx = mockPrescriptions.filter((rx) => rx.status === 'issued' || rx.status === 'verified')

  const statusCounts = mockAppointments.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  const barData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('en-PH', { weekday: 'short' })
    const dateStr = d.toISOString().split('T')[0]
    const count = mockAppointments.filter((a) => a.scheduled_at.startsWith(dateStr)).length
    return { day: label, appointments: count }
  })

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar size={20} className="text-blue-600" />}
          label="Appointments Today"
          value={todayAppts.length}
          gradient="bg-blue-50"
          onClick={() => navigate('/appointments')}
        />
        <StatCard
          icon={<Users size={20} className="text-emerald-600" />}
          label="Registered Patients"
          value={mockPatients.length}
          sub="+2 this week"
          gradient="bg-emerald-50"
          onClick={() => navigate('/patients')}
        />
        <StatCard
          icon={<Pill size={20} className="text-amber-600" />}
          label="Pending Rx Verification"
          value={pendingRx.length}
          gradient="bg-amber-50"
          onClick={() => navigate('/prescriptions')}
        />
        <StatCard
          icon={<FileText size={20} className="text-indigo-600" />}
          label="Total Prescriptions"
          value={mockPrescriptions.length}
          gradient="bg-indigo-50"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3 bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-blue-600" />
            <p className="text-sm font-semibold text-slate-700">Weekly Appointment Volume</p>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={barData} barSize={28}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
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
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Today's Schedule</p>
            </div>
            <button onClick={() => navigate('/appointments')} className="text-xs text-blue-600 hover:underline font-medium">View all</button>
          </div>
          {todayAppts.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-400">No appointments scheduled today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigate(`/appointments/${a.id}`)}>
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-xs font-bold text-blue-600">
                    {a.patient?.user?.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{a.patient?.user?.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(a.scheduled_at).toLocaleTimeString('en-PH', { timeStyle: 'short' })} · {a.doctor?.user?.name}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Recent System Activity</p>
            </div>
            <button onClick={() => navigate('/audit-logs')} className="text-xs text-blue-600 hover:underline font-medium">View logs</button>
          </div>
          <div className="space-y-3">
            {mockAuditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">{log.user?.name}</span>
                    {' '}{log.action.toLowerCase()} {log.target_type} #{log.target_id}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(log.created_at).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
