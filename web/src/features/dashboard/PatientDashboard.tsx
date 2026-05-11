import { useNavigate } from 'react-router-dom'
import { Calendar, Pill, Receipt, Plus, ArrowUpRight } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import { mockAppointments, mockPrescriptions, mockBillingRecords } from '@/mocks/data'

export default function PatientDashboard() {
  const navigate = useNavigate()

  const myAppts   = mockAppointments.filter((a) => a.patient_id === 1)
  const myRx      = mockPrescriptions.filter((rx) => rx.patient_record?.patient_id === 1)
  const myBilling = mockBillingRecords.filter((b) => b.patient_id === 1)
  const upcoming  = myAppts.filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
  const pendingPay = myBilling.filter((b) => b.status === 'pending')

  const stats = [
    { icon: <Calendar size={19} className="text-blue-600" />, label: 'Upcoming Appointments', value: upcoming.length, gradient: 'bg-blue-50', path: '/appointments' },
    { icon: <Pill size={19} className="text-emerald-600" />, label: 'Active Prescriptions', value: myRx.filter((rx) => rx.status !== 'expired').length, gradient: 'bg-emerald-50', path: '/prescriptions' },
    { icon: <Receipt size={19} className="text-amber-600" />, label: 'Pending Payments', value: pendingPay.length, gradient: 'bg-amber-50', path: '/appointments' },
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
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-700">My Appointments</p>
            <button
              onClick={() => navigate('/appointments/new')}
              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={12} /> Book
            </button>
          </div>
          {myAppts.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No appointments yet.</p>
          ) : (
            <div className="space-y-2">
              {myAppts.slice(0, 4).map((a) => (
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
                      {new Date(a.scheduled_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
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
            <button onClick={() => navigate('/prescriptions')} className="text-xs text-blue-600 hover:underline font-medium">View all</button>
          </div>
          {myRx.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No prescriptions yet.</p>
          ) : (
            <div className="space-y-2">
              {myRx.slice(0, 4).map((rx) => (
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

      {pendingPay.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-5" style={{ border: '1px solid hsl(45 90% 85%)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Receipt size={15} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Outstanding Payments</p>
          </div>
          <div className="space-y-2">
            {pendingPay.map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5" style={{ border: '1px solid hsl(45 90% 82%)' }}>
                <div>
                  <p className="text-sm font-medium text-slate-700">Billing #{b.id}</p>
                  <p className="text-xs text-slate-400">Appointment #{b.appointment_id}</p>
                </div>
                <p className="font-bold text-amber-700">₱{b.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
