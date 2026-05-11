import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, User, Stethoscope, FileText, MapPin } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import StatusTimeline from '@/components/common/StatusTimeline'
import { mockAppointments } from '@/mocks/data'

const TYPE_LABEL: Record<string, string> = {
  consultation: 'Consultation',
  follow_up: 'Follow-up',
  emergency: 'Emergency',
}

function InfoCard({ title, icon, color, children }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
      <div className={`flex items-center gap-2 mb-3 pb-3`} style={{ borderBottom: '1px solid hsl(214 20% 93%)' }}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      </div>
      {children}
    </div>
  )
}

export default function AppointmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const appt = mockAppointments.find((a) => a.id === Number(id))

  if (!appt) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        <p className="text-lg font-semibold text-slate-700 mb-2">Appointment not found</p>
        <button onClick={() => navigate('/appointments')} className="text-sm text-blue-600 hover:underline">
          ← Back to Appointments
        </button>
      </div>
    )
  }

  const timelineSteps = [
    { label: 'Appointment Scheduled', date: appt.created_at, actor: appt.patient?.user?.name, completed: true },
    {
      label: 'Confirmed by Doctor',
      date: (appt.status === 'confirmed' || appt.status === 'served') ? appt.updated_at : undefined,
      completed: appt.status === 'confirmed' || appt.status === 'served',
      current: appt.status === 'confirmed',
    },
    {
      label: 'Patient Served',
      date: appt.status === 'served' ? appt.updated_at : undefined,
      completed: appt.status === 'served',
    },
    ...(appt.status === 'cancelled' ? [{ label: 'Appointment Cancelled', date: appt.updated_at, completed: true }] : []),
    ...(appt.status === 'rescheduled' ? [{ label: 'Rescheduled', date: appt.updated_at, completed: true }] : []),
  ]

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/appointments')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors"
          style={{ border: '1px solid hsl(214 20% 90%)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800">Appointment #{appt.id}</h2>
          <StatusBadge status={appt.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <InfoCard title="Patient" icon={<User size={14} className="text-blue-600" />} color="bg-blue-50">
          <p className="font-bold text-slate-800">{appt.patient?.user?.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{appt.patient?.user?.email}</p>
          <p className="text-xs text-slate-500 mt-0.5">{appt.patient?.contact}</p>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <MapPin size={10} /> {appt.patient?.address}
          </p>
        </InfoCard>

        <InfoCard title="Physician" icon={<Stethoscope size={14} className="text-indigo-600" />} color="bg-indigo-50">
          <p className="font-bold text-slate-800">{appt.doctor?.user?.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{appt.doctor?.specialization}</p>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">PRC {appt.doctor?.license_no}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            License expiry: {appt.doctor?.prc_expiry ? new Date(appt.doctor.prc_expiry).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—'}
          </p>
        </InfoCard>

        <InfoCard title="Schedule" icon={<Calendar size={14} className="text-emerald-600" />} color="bg-emerald-50">
          <p className="font-bold text-slate-800">
            {new Date(appt.scheduled_at).toLocaleDateString('en-PH', { dateStyle: 'full' })}
          </p>
          <p className="text-sm text-slate-600 mt-0.5">
            {new Date(appt.scheduled_at).toLocaleTimeString('en-PH', { timeStyle: 'short' })}
          </p>
          <span className="text-xs font-semibold mt-2 inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            {TYPE_LABEL[appt.type] ?? appt.type}
          </span>
        </InfoCard>

        {appt.notes && (
          <InfoCard title="Notes" icon={<FileText size={14} className="text-amber-600" />} color="bg-amber-50">
            <p className="text-sm text-slate-600 leading-relaxed">{appt.notes}</p>
          </InfoCard>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        <p className="text-sm font-semibold text-slate-700 mb-5">Appointment Timeline</p>
        <StatusTimeline steps={timelineSteps} />
      </div>
    </div>
  )
}
