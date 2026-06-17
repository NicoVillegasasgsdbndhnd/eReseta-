import { useNavigate } from 'react-router-dom'
import { Calendar, Pill, Receipt, Plus, Loader2 } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import { useDashboardSummary } from './queries'
import { useAppointments } from '@/features/appointments/queries'
import { usePrescriptions } from '@/features/prescriptions/queries'
import { useAuthStore } from '@/features/auth/authStore'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function PatientDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: apptData }           = useAppointments()
  const { data: rxData }             = usePrescriptions()

  const appointments  = apptData?.data ?? []
  const prescriptions = rxData?.data   ?? []

  const upcomingAppts = appointments.filter(
    (a) => a.status === 'scheduled' || a.status === 'confirmed',
  )
  const activeRx = prescriptions.filter(
    (rx) => rx.status === 'issued' || rx.status === 'verified',
  )

  const firstName = user?.name.split(' ')[0] ?? 'Patient'
  const dateStr   = new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Blue gradient banner ── */}
      <div
        className="rounded-2xl px-8 py-7"
        style={{ background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(210 90% 24%) 100%)' }}
      >
        <h1 className="text-2xl font-bold text-white">
          {greeting()}, {firstName}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.68)' }}>
          {dateStr} · DEAMHI Hospital
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { label: `${upcomingAppts.length} upcoming appointment${upcomingAppts.length !== 1 ? 's' : ''}` },
            { label: `${activeRx.length} active prescription${activeRx.length !== 1 ? 's' : ''}` },
            { label: `${appointments.length} total visit${appointments.length !== 1 ? 's' : ''}` },
          ].map(({ label }) => (
            <span
              key={label}
              className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            icon: <Calendar size={19} className="text-blue-600" />,
            label: 'Upcoming Appointments',
            value: summary?.upcoming_appointments ?? upcomingAppts.length,
            bg: 'bg-blue-50',
            path: '/appointments',
          },
          {
            icon: <Pill size={19} className="text-emerald-600" />,
            label: 'Total Prescriptions',
            value: summary?.total_prescriptions ?? prescriptions.length,
            bg: 'bg-emerald-50',
            path: '/prescriptions',
          },
          {
            icon: <Receipt size={19} className="text-amber-600" />,
            label: 'Pending Payments',
            value: summary?.pending_bills ?? '—',
            bg: 'bg-amber-50',
            path: '/appointments',
          },
        ].map((s) => (
          <div
            key={s.label}
            onClick={() => navigate(s.path)}
            className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
            style={{ border: '1px solid hsl(210 18% 88%)' }}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'hsl(215 30% 14%)' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(215 16% 50%)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* My upcoming appointments */}
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>My upcoming appointments</p>
            <button
              onClick={() => navigate('/appointments/new')}
              className="flex items-center gap-1 text-xs font-semibold text-white px-2.5 py-1 rounded-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              <Plus size={12} /> Book
            </button>
          </div>
          {appointments.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'hsl(215 16% 55%)' }}>
              No appointments yet.
            </p>
          ) : (
            <div className="space-y-1">
              {appointments.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/appointments/${a.id}`)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 30%)' }}
                  >
                    {(a.doctor?.user?.name ?? 'D').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'hsl(215 30% 14%)' }}>
                      {a.doctor?.user?.name}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(215 16% 50%)' }}>
                      {new Date(a.scheduled_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My recent prescriptions */}
        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>My recent prescriptions</p>
            <button
              onClick={() => navigate('/prescriptions')}
              className="text-xs font-medium hover:underline"
              style={{ color: 'hsl(201 100% 36%)' }}
            >
              View all
            </button>
          </div>
          {prescriptions.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'hsl(215 16% 55%)' }}>
              No prescriptions yet.
            </p>
          ) : (
            <div className="space-y-1">
              {prescriptions.slice(0, 4).map((rx) => (
                <div
                  key={rx.id}
                  onClick={() => navigate(`/prescriptions/${rx.id}`)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'hsl(152 50% 92%)', color: 'hsl(152 50% 35%)' }}
                  >
                    <Pill size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>
                      {rx.reference_no}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'hsl(215 16% 50%)' }}>
                      {rx.items.slice(0, 2).map((i) => i.drug_name).join(', ')}
                      {rx.items.length > 2 ? ` +${rx.items.length - 2}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={rx.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
