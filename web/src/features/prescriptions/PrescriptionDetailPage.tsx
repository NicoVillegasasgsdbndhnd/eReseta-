import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Link2, ShieldCheck, Pill } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import StatusTimeline from '@/components/common/StatusTimeline'
import { mockPrescriptions } from '@/mocks/data'

const EVENT_LABEL: Record<string, string> = {
  ISSUED: 'Prescription Issued',
  VERIFIED: 'Verified by Pharmacist',
  DISPENSED: 'Dispensed to Patient',
}

const EVENT_COLOR: Record<string, string> = {
  ISSUED: 'bg-blue-500',
  VERIFIED: 'bg-indigo-500',
  DISPENSED: 'bg-emerald-500',
}

export default function PrescriptionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const rx = mockPrescriptions.find((p) => p.id === Number(id))

  if (!rx) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center max-w-md" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        <p className="font-semibold text-slate-700 mb-2">Prescription not found</p>
        <button onClick={() => navigate('/prescriptions')} className="text-sm text-blue-600 hover:underline">← Back</button>
      </div>
    )
  }

  const timelineSteps = [
    {
      label: EVENT_LABEL.ISSUED,
      date: rx.events?.find((e) => e.event_type === 'ISSUED')?.occurred_at,
      actor: rx.doctor?.user?.name,
      completed: true,
    },
    {
      label: EVENT_LABEL.VERIFIED,
      date: rx.events?.find((e) => e.event_type === 'VERIFIED')?.occurred_at,
      actor: rx.events?.find((e) => e.event_type === 'VERIFIED')?.actor?.name,
      completed: rx.status === 'verified' || rx.status === 'dispensed',
      current: rx.status === 'verified',
    },
    {
      label: EVENT_LABEL.DISPENSED,
      date: rx.events?.find((e) => e.event_type === 'DISPENSED')?.occurred_at,
      actor: rx.events?.find((e) => e.event_type === 'DISPENSED')?.actor?.name,
      completed: rx.status === 'dispensed',
    },
  ]

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/prescriptions')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors"
          style={{ border: '1px solid hsl(214 20% 90%)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800 font-mono">{rx.reference_no}</h2>
          <StatusBadge status={rx.status} />
        </div>
      </div>

      {/* Patient + Doctor */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow-sm p-4" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Patient</p>
          <p className="font-bold text-slate-800">{rx.patient_record?.patient?.user?.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">PhilHealth: <span className="font-mono">{rx.patient_record?.patient?.philhealth_no ?? '—'}</span></p>
          <div className="mt-2 px-2.5 py-1.5 bg-slate-50 rounded-lg" style={{ border: '1px solid hsl(214 20% 93%)' }}>
            <p className="text-xs text-slate-500">Diagnosis</p>
            <p className="text-sm font-semibold text-slate-700">{rx.patient_record?.diagnosis}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Prescribing Physician</p>
          <p className="font-bold text-slate-800">{rx.doctor?.user?.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{rx.doctor?.specialization}</p>
          <p className="text-xs font-mono text-slate-400 mt-0.5">PRC {rx.doctor?.license_no}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Issued on {new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
          </p>
        </div>
      </div>

      {/* Medications */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <Pill size={14} className="text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Prescribed Medications</p>
          <span className="ml-auto text-xs text-slate-400">{rx.items.length} item{rx.items.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="space-y-3">
          {rx.items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-start gap-4 p-3 rounded-lg"
              style={{ backgroundColor: i % 2 === 0 ? 'hsl(214 20% 98%)' : 'white', border: '1px solid hsl(214 20% 93%)' }}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">{item.drug_name} <span className="font-normal text-slate-500">{item.dosage}</span></p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{item.frequency}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{item.duration}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Qty: {item.quantity}</span>
                </div>
                {item.instructions && (
                  <p className="text-xs text-slate-400 mt-1 italic">{item.instructions}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blockchain audit */}
      {rx.blockchain_tx_id && rx.events && rx.events.length > 0 && (
        <div className="rounded-xl shadow-sm p-5 mb-4" style={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <ShieldCheck size={14} className="text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-white">Blockchain Audit Trail</p>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 uppercase tracking-wide">
              Hyperledger Fabric
            </span>
          </div>
          <div className="space-y-2">
            {rx.events.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${EVENT_COLOR[event.event_type] ?? 'bg-slate-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-white">{EVENT_LABEL[event.event_type]}</p>
                    <p className="text-xs text-slate-400">
                      {event.actor?.name} · {new Date(event.occurred_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
                {event.blockchain_tx_id && (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                    <Link2 size={10} />
                    {event.blockchain_tx_id.slice(0, 14)}…
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        <p className="text-sm font-semibold text-slate-700 mb-5">Status Timeline</p>
        <StatusTimeline steps={timelineSteps} />
      </div>
    </div>
  )
}
