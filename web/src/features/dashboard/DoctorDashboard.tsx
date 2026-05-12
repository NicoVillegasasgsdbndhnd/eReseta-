import { useNavigate } from 'react-router-dom'
import { Calendar, ClipboardList, Pill, ArrowUpRight, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import StatusBadge from '@/components/common/StatusBadge'
import { useDashboardSummary } from './queries'
import { useAppointments } from '@/features/appointments/queries'

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
}

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: apptData } = useAppointments()

  const appointments = apptData?.data ?? []
  const upcoming = appointments.filter(
    (a) => a.status === 'scheduled' || a.status === 'confirmed',
  )

  const barData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('en-PH', { weekday: 'short' })
    const dateStr = d.toISOString().split('T')[0]
    const count = appointments.filter((a) => a.scheduled_at.startsWith(dateStr)).length
    return { day: label, patients: count }
  })

  const stats = [
    {
      icon: <Calendar size={19} className="text-blue-600" />,
      label: "Today's Appointments",
      value: summary?.todays_appointments ?? 0,
      gradient: 'bg-blue-50',
      path: '/appointments',
    },
    {
      icon: <ClipboardList size={19} className="text-emerald-600" />,
      label: 'Pending Appointments',
      value: summary?.pending_appointments ?? 0,
      gradient: 'bg-emerald-50',
      path: '/appointments',
    },
    {
      icon: <Pill size={19} className="text-indigo-600" />,
      label: 'Prescriptions Issued',
      value: summary?.prescriptions_issued ?? 0,
      gradient: 'bg-indigo-50',
      path: '/prescriptions',
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
          <p className="text-sm font-semibold text-slate-700 mb-4">My Patient Volume (7 days)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={28}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
              <Bar dataKey="patients" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-700">Upcoming Appointments</p>
            <button
              onClick={() => navigate('/appointments')}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              View all
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No upcoming appointments.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/appointments/${a.id}`)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                    {a.patient?.user?.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{a.patient?.user?.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(a.scheduled_at).toLocaleString('en-PH', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
