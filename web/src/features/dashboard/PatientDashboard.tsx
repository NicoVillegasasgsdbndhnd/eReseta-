import { useNavigate } from 'react-router-dom'
import { Calendar, Pill, Receipt, Plus, ArrowUpRight, Loader2 } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import { useDashboardSummary } from './queries'
import { useAppointments } from '@/features/appointments/queries'
import { usePrescriptions } from '@/features/prescriptions/queries'

export default function PatientDashboard() {
  const navigate = useNavigate()
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: apptData } = useAppointments()
  const { data: rxData } = usePrescriptions()

  const appointments = apptData?.data ?? []
  const prescriptions = rxData?.data ?? []

  const stats = [
    {
      icon: <Calendar size={19} className="text-blue-600" />,
      label: 'Upcoming Appointments',
      value: summary?.upcoming_appointments ?? 0,
      gradient: 'bg-blue-50',
      path: '/appointments',
    },
    {
      icon: <Pill size={19} className="text-emerald-600" />,
      label: 'Total Prescriptions',
      value: summary?.total_prescriptions ?? 0,
      gradient: 'bg-emerald-50',
      path: '/prescriptions',
    },
    {
      icon: <Receipt size={19} className="text-amber-600" />,
      label: 'Pending Payments',
      value: summary?.pending_bills ?? 0,
      gradient: 'bg-amber-50',
      path: '/appointments',
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
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-700">My Appointments</p>
            <button
              onClick={() => navigate('/appointments/new')}
              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={12} /> Book
            </button>
          </div>
          {appointments.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No appointments yet.</p>
          ) : (
            <div className="space-y-2">
              {appointments.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/appointments/${a.id}`)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                    {a.doctor?.user?.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{a.doctor?.user?.name}</p>
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

        <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-700">My Prescriptions</p>
            <button
              onClick={() => navigate('/prescriptions')}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              View all
            </button>
          </div>
          {prescriptions.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No prescriptions yet.</p>
          ) : (
            <div className="space-y-2">
              {prescriptions.slice(0, 4).map((rx) => (
                <div
                  key={rx.id}
                  onClick={() => navigate(`/prescriptions/${rx.id}`)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    <Pill size={14} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold text-slate-700">{rx.reference_no}</p>
                    <p className="text-xs text-slate-400 truncate">
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
