import { useNavigate } from 'react-router-dom'
import { CalendarPlus, Pill, CalendarDays, Loader2 } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import { useAuthStore } from '@/features/auth/authStore'
import { useDashboardSummary } from './queries'
import { useAppointments } from '@/features/appointments/queries'
import { usePrescriptions } from '@/features/prescriptions/queries'
import { Greeting, ActionRow, StatStrip, Panel, ViewAllLink, TEAL } from './DashboardKit'

export default function PatientDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: apptData } = useAppointments()
  const { data: rxData } = usePrescriptions()

  const appointments = apptData?.data ?? []
  const prescriptions = rxData?.data ?? []

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
  }

  return (
    <div className="space-y-8">
      <Greeting name={user?.name} subtitle="your health, at a glance." />

      <ActionRow
        actions={[
          { title: 'Book appointment', subtitle: 'Schedule a visit', icon: CalendarPlus, to: '/appointments/new', primary: true },
          { title: 'My appointments', subtitle: `${summary?.upcoming_appointments ?? 0} upcoming`, icon: CalendarDays, to: '/appointments' },
          { title: 'My prescriptions', subtitle: `${summary?.total_prescriptions ?? 0} total`, icon: Pill, to: '/prescriptions' },
        ]}
      />

      <StatStrip
        stats={[
          { label: 'Upcoming appointments', value: summary?.upcoming_appointments ?? 0, to: '/appointments' },
          { label: 'Total prescriptions', value: summary?.total_prescriptions ?? 0, to: '/prescriptions' },
          { label: 'Pending payments', value: summary?.pending_bills ?? 0, to: '/appointments' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="My appointments" action={<ViewAllLink label="Book" onClick={() => navigate('/appointments/new')} />}>
          {appointments.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No appointments yet.</p>
          ) : (
            <div className="space-y-1.5">
              {appointments.slice(0, 4).map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/appointments/${a.id}`)}
                  className="flex w-full items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: 'hsl(168 79% 37% / 0.12)', color: TEAL }}>
                    {a.doctor?.user?.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{a.doctor?.user?.name}</p>
                    <p className="text-xs text-slate-500">{new Date(a.scheduled_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="My prescriptions" action={<ViewAllLink onClick={() => navigate('/prescriptions')} />}>
          {prescriptions.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No prescriptions yet.</p>
          ) : (
            <div className="space-y-1.5">
              {prescriptions.slice(0, 4).map((rx) => (
                <button
                  key={rx.id}
                  onClick={() => navigate(`/prescriptions/${rx.id}`)}
                  className="flex w-full items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsl(168 79% 37% / 0.12)' }}>
                    <Pill size={14} style={{ color: TEAL }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold text-slate-700">{rx.reference_no}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {rx.items.slice(0, 2).map((i) => i.drug_name).join(', ')}{rx.items.length > 2 ? ` +${rx.items.length - 2}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={rx.status} />
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
