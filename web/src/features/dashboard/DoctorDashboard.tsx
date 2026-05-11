import { useNavigate } from 'react-router-dom'
import { Calendar, ClipboardList, Pill, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import StatusBadge from '@/components/common/StatusBadge'
import { mockAppointments, mockPatientRecords, mockPrescriptions } from '@/mocks/data'

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
}

export default function DoctorDashboard() {
  const navigate = useNavigate()

  const myAppts = mockAppointments.filter((a) => a.doctor_id === 1)
  const myRecords = mockPatientRecords.filter((r) => r.doctor_id === 1)
  const myRx = mockPrescriptions.filter((rx) => rx.doctor_id === 1)

  const today = new Date().toISOString().split('T')[0]
  const todayAppts = myAppts.filter((a) => a.scheduled_at.startsWith(today))
  const upcoming = myAppts.filter((a) => a.status === 'scheduled' || a.status === 'confirmed')

  const barData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('en-PH', { weekday: 'short' })
    const dateStr = d.toISOString().split('T')[0]
    const count = myAppts.filter((a) => a.scheduled_at.startsWith(dateStr)).length
    return { day: label, patients: count }
  })

  const stats = [
    { icon: <Calendar size={19} className="text-blue-600" />, label: "Today's Appointments", value: todayAppts.length, gradient: 'bg-blue-50', path: '/appointments' },
    { icon: <ClipboardList size={19} className="text-emerald-600" />, label: 'Total Consultations', value: myRecords.length, gradient: 'bg-emerald-50', path: '/consultations' },
    { icon: <Pill size={19} className="text-indigo-600" />, label: 'Prescriptions Issued', value: myRx.length, gradient: 'bg-indigo-50', path: '/prescriptions' },
  ]

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
            <button onClick={() => navigate('/appointments')} className="text-xs text-blue-600 hover:underline font-medium">View all</button>
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
                      {new Date(a.scheduled_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-700">Recent Consultations</p>
          <button onClick={() => navigate('/consultations')} className="text-xs text-blue-600 hover:underline font-medium">View all</button>
        </div>
        <div className="divide-y divide-slate-100">
          {myRecords.slice(0, 3).map((r) => (
            <div key={r.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{r.patient?.user?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(r.visit_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                  </p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{r.diagnosis}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{r.chief_complaint}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
