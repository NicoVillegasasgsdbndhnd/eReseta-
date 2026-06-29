import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Link2, ShieldCheck, Pill, Loader2, FileText, ClipboardList, Printer, User, Stethoscope } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import StatusTimeline from '@/components/common/StatusTimeline'
import { useAuthStore } from '@/features/auth/authStore'
import { usePrescription } from './queries'
import type { Prescription } from '@/mocks/types'
import DeamhiPrescriptionCard from './DeamhiPrescriptionCard'

const EVENT_LABEL: Record<string, string> = {
  ISSUED:    'Prescription Issued',
  VERIFIED:  'Verified by Pharmacist',
  DISPENSED: 'Dispensed to Patient',
}

const EVENT_COLOR: Record<string, string> = {
  ISSUED:    'bg-blue-500',
  VERIFIED:  'bg-indigo-500',
  DISPENSED: 'bg-emerald-500',
}

// ── Original detail sections ───────────────────────────────────────────────
function DetailView({ rx }: { rx: Prescription }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-4 items-stretch">
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div className="flex items-center gap-2 mb-3 pb-2.5" style={{ borderBottom: '1px solid hsl(214 20% 93%)' }}>
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center"><User size={14} className="text-teal-600" /></div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient</p>
          </div>
          <p className="font-bold text-slate-800">{rx.patient_record?.patient?.user?.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">PhilHealth: <span className="font-mono">{rx.patient_record?.patient?.philhealth_no ?? '—'}</span></p>
          <div className="mt-auto pt-2 px-2.5 py-1.5 bg-slate-50 rounded-lg" style={{ border: '1px solid hsl(214 20% 93%)' }}>
            <p className="text-xs text-slate-500">Diagnosis</p>
            <p className="text-sm font-semibold text-slate-700">{rx.patient_record?.diagnosis}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div className="flex items-center gap-2 mb-3 pb-2.5" style={{ borderBottom: '1px solid hsl(214 20% 93%)' }}>
            <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center"><Stethoscope size={14} className="text-sky-600" /></div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prescribing Physician</p>
          </div>
          <p className="font-bold text-slate-800">{rx.doctor?.user?.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{rx.doctor?.specialization}</p>
          <p className="text-xs font-mono text-slate-400 mt-0.5">PRC {rx.doctor?.license_no}</p>
          <p className="text-xs text-slate-400 mt-auto pt-2">
            Issued on {new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-4" style={{ border: '1px solid hsl(210 18% 88%)' }}>
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
                <p className="font-bold text-slate-800 text-sm">
                  {item.drug_name} <span className="font-normal text-slate-500">{item.dosage}</span>
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{item.frequency}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{item.duration}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Qty: {item.quantity}{item.quantity_unit ? ` ${item.quantity_unit}` : ''}</span>
                  {item.dispensed_quantity != null && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        item.dispensed_quantity < item.quantity
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      Dispensed: {item.dispensed_quantity} of {item.quantity}
                      {item.dispensed_quantity < item.quantity ? ' (partial)' : ''}
                    </span>
                  )}
                </div>
                {item.instructions && (
                  <p className="text-xs text-slate-500 mt-1 italic">{item.instructions}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

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
                    <p className="text-sm font-medium text-white">{EVENT_LABEL[event.event_type] ?? event.event_type}</p>
                    <p className="text-xs text-slate-400">
                      {event.actor?.name} · {new Date(event.occurred_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {event.blockchain_tx_id && (
                      <p className="text-xs font-mono text-emerald-400 mt-0.5 flex items-center gap-1">
                        <Link2 size={9} /> {event.blockchain_tx_id}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {rx.blockchain_tx_id && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 text-xs font-mono text-slate-400" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <Link2 size={10} />
              Tx: {rx.blockchain_tx_id}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <p className="text-sm font-semibold text-slate-700 mb-5">Status Timeline</p>
        <StatusTimeline steps={[
          {
            label:     EVENT_LABEL.ISSUED,
            date:      rx.events?.find((e) => e.event_type === 'ISSUED')?.occurred_at,
            actor:     rx.doctor?.user?.name,
            completed: true,
          },
          {
            label:     EVENT_LABEL.VERIFIED,
            date:      rx.events?.find((e) => e.event_type === 'VERIFIED')?.occurred_at,
            actor:     rx.events?.find((e) => e.event_type === 'VERIFIED')?.actor?.name,
            completed: rx.status === 'verified' || rx.status === 'dispensed',
            current:   rx.status === 'verified',
          },
          {
            label:     EVENT_LABEL.DISPENSED,
            date:      rx.events?.find((e) => e.event_type === 'DISPENSED')?.occurred_at,
            actor:     rx.events?.find((e) => e.event_type === 'DISPENSED')?.actor?.name,
            completed: rx.status === 'dispensed',
          },
        ]} />
      </div>
    </>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PrescriptionDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const backTo   = (location.state as { from?: string } | null)?.from ?? '/prescriptions'
  const { user } = useAuthStore()

  // After prescribing, the Hospital Rx is the primary view (mentor review).
  const [activeTab, setActiveTab] = useState<'rx-form' | 'details'>('rx-form')

  const { data: rx, isLoading } = usePrescription(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  if (!rx) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center max-w-md" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <p className="font-semibold text-slate-700 mb-2">Prescription not found</p>
        <button onClick={() => navigate(backTo)} className="text-sm text-blue-600 hover:underline">← Back</button>
      </div>
    )
  }

  const isPatient = user?.role === 'patient'

  return (
    <div className="max-w-3xl mx-auto">
      {isPatient && (
        <div className="mb-5 overflow-hidden rounded-xl bg-white shadow-sm no-print" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <div
            className="grid gap-5 p-6 md:grid-cols-[minmax(0,1.5fr)_minmax(240px,0.85fr)]"
            style={{ background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(205 92% 30%) 58%, hsl(152 48% 35%) 100%)' }}
          >
            <div className="min-w-0 text-white">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
                <Pill size={14} />
                Hospital Rx
              </div>
              <h1 className="font-mono text-3xl font-bold leading-tight">{rx.reference_no}</h1>
              <p className="mt-2 max-w-xl text-sm" style={{ color: 'rgba(255,255,255,0.76)' }}>
                Your official DEAMHI prescription record, including medication details and verification status.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { label: 'Issued', value: new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' }) },
                  { label: 'Items', value: `${rx.items.length} medicine${rx.items.length !== 1 ? 's' : ''}` },
                  { label: 'Status', value: rx.status },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg px-4 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}>
                    <p className="text-base font-bold leading-none capitalize">{item.value}</p>
                    <p className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-lg">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Prescribing physician</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <Stethoscope size={22} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-slate-900">{rx.doctor?.user?.name}</p>
                  <p className="truncate text-sm text-slate-500">{rx.doctor?.specialization ?? 'Physician'}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <CalendarDays size={16} className="text-emerald-700" />
                <span className="font-medium">{rx.patient_record?.diagnosis ?? 'Consultation prescription'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Back + reference */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors"
          style={{ border: '1px solid hsl(210 18% 88%)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-bold text-slate-800 font-mono">{rx.reference_no}</h2>
          <StatusBadge status={rx.status} />
          <span className="text-xs text-slate-400">
            Issued {new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })} · {rx.items.length} item{rx.items.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── View tab navigator (+ Print on the Rx tab) ── */}
      <div className="flex items-center justify-between gap-3 mb-5 no-print">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100" style={{ width: 'fit-content' }}>
          <button
            onClick={() => setActiveTab('rx-form')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={
              activeTab === 'rx-form'
                ? { backgroundColor: 'white', color: 'hsl(201 100% 36%)', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.10)' }
                : { backgroundColor: 'transparent', color: 'hsl(215 16% 50%)' }
            }
          >
            <FileText size={14} />
            Hospital Rx
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={
              activeTab === 'details'
                ? { backgroundColor: 'white', color: 'hsl(215 30% 14%)', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.10)' }
                : { backgroundColor: 'transparent', color: 'hsl(215 16% 50%)' }
            }
          >
            <ClipboardList size={14} />
            Details
          </button>
        </div>

        {activeTab === 'rx-form' && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'hsl(201 100% 36%)' }}
          >
            <Printer size={14} /> Print
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {activeTab === 'details'  && <div className="no-print"><DetailView rx={rx} /></div>}
      {activeTab === 'rx-form' && <div className="rx-print-area"><DeamhiPrescriptionCard rx={rx} /></div>}
    </div>
  )
}
