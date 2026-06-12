import { useNavigate } from 'react-router-dom'
import { Plus, CalendarDays, ClipboardList, ArrowRight, Loader2 } from 'lucide-react'
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
    <div className="space-y-6">
      {/* ── Hero band — editorial clinical ───────────────────────────────── */}
      <section
        className="reveal relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-sm"
        style={{ background: 'linear-gradient(135deg, hsl(195 38% 12%) 0%, hsl(184 44% 16%) 52%, hsl(168 58% 22%) 100%)' }}
      >
        {/* soft teal glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-12 h-64 w-64 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(168 80% 45% / 0.5), transparent 70%)' }}
        />
        {/* faint ECG / pulse line */}
        <svg
          aria-hidden
          viewBox="0 0 400 60"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-0 left-0 h-14 w-full opacity-[0.13]"
        >
          <polyline
            points="0,42 70,42 92,42 106,14 122,56 138,42 210,42 232,42 246,20 262,54 278,42 400,42"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">{today}</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold leading-[1.1] mt-2 text-white">
              {greeting},<br className="hidden sm:block" /> {user?.name}
            </h1>
            <p className="text-sm text-white/75 mt-3 max-w-sm leading-relaxed">
              {upcoming.length > 0
                ? `You have ${upcoming.length} upcoming appointment${upcoming.length > 1 ? 's' : ''} and a clear path ahead.`
                : 'No upcoming appointments — a calm day ahead.'}
            </p>
            <button
              onClick={() => navigate('/prescriptions/new')}
              className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[var(--color-ink)] shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <Plus size={16} /> New prescription
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* focal stat */}
          <div
            className="shrink-0 self-start rounded-2xl bg-white/10 px-7 py-5 text-center backdrop-blur-sm"
            style={{ border: '1px solid rgba(255,255,255,0.16)' }}
          >
            <p className="font-display text-5xl font-bold tabular-nums leading-none">{summary?.todays_appointments ?? 0}</p>
            <p className="mt-2 text-[11px] uppercase tracking-wide text-white/70">appointments today</p>
          </div>
        </div>
      </section>

      {/* Quick actions — task first */}
      <div className="reveal grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ animationDelay: '70ms' }}>
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
            <p className="text-xs text-slate-500">{summary?.todays_appointments ?? 0} scheduled today</p>
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
            <p className="text-xs text-slate-500">Patient records</p>
          </div>
        </button>
      </div>

      {/* Stats — light strip */}
      <div className="reveal grid grid-cols-3 rounded-2xl bg-white shadow-sm overflow-hidden" style={{ border: '1px solid var(--color-border)', animationDelay: '140ms' }}>
        {stats.map((s, i) => (
          <button
            key={s.label}
            onClick={() => navigate(s.path)}
            className={cn('flex flex-col gap-1 p-5 text-left hover:bg-slate-50 transition-colors', i > 0 && 'border-l')}
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span className="text-xs text-slate-500">{s.label}</span>
            <span className="text-2xl font-bold text-slate-800 tabular-nums">{s.value}</span>
          </button>
        ))}
      </div>

      {/* Chart + upcoming */}
      <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animationDelay: '210ms' }}>
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
            <p className="text-sm text-slate-500 py-6 text-center">No upcoming appointments.</p>
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
                    <p className="text-xs text-slate-500">
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
