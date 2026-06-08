import { useNavigate } from 'react-router-dom'
import { Plus, CalendarDays, ClipboardList, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/authStore'
import StatusBadge from '@/components/common/StatusBadge'
import { useDashboardSummary } from './queries'
import { useAppointments } from '@/features/appointments/queries'

const TEAL = 'hsl(168 79% 37%)'
const CHART_TOOLTIP_STYLE = { backgroundColor: '#fff', border: '1px solid hsl(40 22% 88%)', borderRadius: '10px', fontSize: '12px' }

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: apptData } = useAppointments()

  const appointments = apptData?.data ?? []
  const upcoming = appointments.filter((a) => a.status === 'scheduled' || a.status === 'confirmed')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })

  const barData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    return {
      day: d.toLocaleDateString('en-PH', { weekday: 'short' }),
      patients: appointments.filter((a) => a.scheduled_at.startsWith(dateStr)).length,
    }
  })

  const stats = [
    { label: "Today's appointments", value: summary?.todays_appointments ?? 0, path: '/appointments' },
    { label: 'Pending appointments', value: summary?.pending_appointments ?? 0, path: '/appointments' },
    { label: 'Prescriptions issued', value: summary?.prescriptions_issued ?? 0, path: '/prescriptions' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl text-[var(--color-foreground)]">{greeting}, {user?.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{today} · here's your day at a glance.</p>
      </div>

      {/* Quick actions — task first */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => navigate('/prescriptions/new')}
          className="group flex items-center gap-3 rounded-2xl p-4 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: TEAL }}
        >
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><Plus size={20} /></div>
          <div>
            <p className="font-semibold text-sm">New prescription</p>
            <p className="text-xs text-white/80">Issue a generic Rx</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/appointments')}
          className="group flex items-center gap-3 rounded-2xl p-4 text-left bg-white shadow-sm transition-transform hover:-translate-y-0.5"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsl(168 79% 37% / 0.1)' }}>
            <CalendarDays size={20} style={{ color: TEAL }} />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-800">Appointments</p>
            <p className="text-xs text-slate-400">{summary?.todays_appointments ?? 0} scheduled today</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/consultations')}
          className="group flex items-center gap-3 rounded-2xl p-4 text-left bg-white shadow-sm transition-transform hover:-translate-y-0.5"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsl(168 79% 37% / 0.1)' }}>
            <ClipboardList size={20} style={{ color: TEAL }} />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-800">Consultations</p>
            <p className="text-xs text-slate-400">Patient records</p>
          </div>
        </button>
      </div>

      {/* Stats — light strip */}
      <div className="grid grid-cols-3 rounded-2xl bg-white shadow-sm overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        {stats.map((s, i) => (
          <button
            key={s.label}
            onClick={() => navigate(s.path)}
            className={cn('flex flex-col gap-1 p-5 text-left hover:bg-slate-50 transition-colors', i > 0 && 'border-l')}
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="text-xs text-slate-400">{s.label}</span>
            <span className="text-2xl font-bold text-slate-800">{s.value}</span>
          </button>
        ))}
      </div>

      {/* Chart + upcoming */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5" style={{ border: '1px solid var(--color-border)' }}>
          <p className="text-sm font-semibold text-slate-700 mb-4">My patient volume · last 7 days</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={26}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'hsl(168 79% 37% / 0.06)' }} />
              <Bar dataKey="patients" fill={TEAL} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5" style={{ border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-700">Upcoming appointments</p>
            <button onClick={() => navigate('/appointments')} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>
              View all
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No upcoming appointments.</p>
          ) : (
            <div className="space-y-1.5">
              {upcoming.slice(0, 5).map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/appointments/${a.id}`)}
                  className="flex w-full items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: 'hsl(168 79% 37% / 0.12)', color: TEAL }}>
                    {a.patient?.user?.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{a.patient?.user?.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(a.scheduled_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
