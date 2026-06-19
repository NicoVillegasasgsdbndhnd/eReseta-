import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Link2, ShieldCheck, Pill, Loader2, FileText, ClipboardList, Printer } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import StatusTimeline from '@/components/common/StatusTimeline'
import { usePrescription } from './queries'
import type { Prescription } from '@/mocks/types'

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

function calcAge(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ── DEAMHI Prescription Visual ─────────────────────────────────────────────
function DeamhiPrescriptionCard({ rx }: { rx: Prescription }) {
  const patient  = rx.patient_record?.patient
  const doctor   = rx.doctor
  const issuedAt = new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })
  const age      = patient?.dob ? calcAge(patient.dob) : '—'
  const sex      = patient?.sex ? (patient.sex === 'male' ? 'M' : 'F') : '—'
  const address  = patient?.address ?? '—'
  const name     = patient?.user?.name ?? '—'

  return (
    <div
      className="bg-white rounded-xl overflow-hidden mx-auto"
      style={{
        border:    '1px solid hsl(210 18% 85%)',
        maxWidth:  '480px',
        boxShadow: '0 2px 12px 0 rgba(0,0,0,0.07)',
      }}
    >
      {/* ── Hospital header ── */}
      <div className="text-center px-6 pt-5 pb-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div className="flex items-center justify-center gap-3 mb-1.5">
          {/* DEAMHI logo approximation */}
          <svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <circle cx="23" cy="23" r="21" fill="white" stroke="#15803d" strokeWidth="2"/>
            <rect x="20" y="9"  width="6" height="28" rx="1" fill="#15803d"/>
            <rect x="9"  y="20" width="28" height="6" rx="1" fill="#15803d"/>
            <circle cx="23" cy="23" r="5" fill="white"/>
            <line x1="23" y1="16" x2="23" y2="30" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M20 19 C20 17 26 17 26 20.5 C26 24 20 24 20 27.5 C20 31 26 31 26 28.5"
                  stroke="#dc2626" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
            <circle cx="26" cy="28.5" r="1.2" fill="#dc2626"/>
            <path d="M21 18 C19 15.5 16.5 15.5 16.5 17.5" stroke="#dc2626" strokeWidth="1" fill="none" strokeLinecap="round"/>
            <path d="M25 18 C27 15.5 29.5 15.5 29.5 17.5" stroke="#dc2626" strokeWidth="1" fill="none" strokeLinecap="round"/>
          </svg>

          <div className="text-left">
            <p className="font-black text-xl leading-none" style={{ color: '#15803d', letterSpacing: '0.04em' }}>
              DEAMHI
            </p>
            <p className="text-[9px] font-semibold leading-tight mt-0.5" style={{ color: '#374151' }}>
              DR. EUTIQUIO LL. ATANACIO, JR.
            </p>
            <p className="text-[9px] font-semibold leading-tight" style={{ color: '#374151' }}>
              MEMORIAL HOSPITAL, INC.
            </p>
          </div>
        </div>
        <p className="text-[10px] font-medium" style={{ color: '#4b5563' }}>
          F. TIMBOL ST. SAN JOSE CONCEPCION TARLAC
        </p>
        <p className="text-[10px]" style={{ color: '#4b5563' }}>
          TEL. NO. : (045) 6090 368
        </p>
      </div>

      {/* ── Patient info fields ── */}
      <div className="px-6 pt-3 pb-2" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div className="flex items-end gap-3 mb-2">
          <div className="flex items-end gap-1 flex-1">
            <span className="text-[11px] font-bold shrink-0" style={{ color: '#111827' }}>NAME:</span>
            <span
              className="flex-1 text-sm font-medium pb-0.5"
              style={{ borderBottom: '1px solid #374151', color: '#111827', minWidth: '120px' }}
            >
              {name}
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-[11px] font-bold shrink-0" style={{ color: '#111827' }}>DATE:</span>
            <span
              className="text-[11px] pb-0.5"
              style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '80px' }}
            >
              {issuedAt}
            </span>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex items-end gap-1 flex-1">
            <span className="text-[11px] font-bold shrink-0" style={{ color: '#111827' }}>ADDRESS:</span>
            <span
              className="flex-1 text-[11px] pb-0.5"
              style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '90px' }}
            >
              {address}
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-[11px] font-bold shrink-0" style={{ color: '#111827' }}>AGE:</span>
            <span
              className="text-[11px] pb-0.5 text-center"
              style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '24px' }}
            >
              {age}
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-[11px] font-bold shrink-0" style={{ color: '#111827' }}>SEX:</span>
            <span
              className="text-[11px] pb-0.5 text-center"
              style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '20px' }}
            >
              {sex}
            </span>
          </div>
        </div>
      </div>

      {/* ── Rx + Medications ── */}
      <div className="flex gap-3 px-6 pt-4 pb-5" style={{ minHeight: '160px' }}>
        <div
          className="shrink-0 select-none"
          style={{ fontSize: '64px', lineHeight: 1, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, color: '#111827' }}
        >
          ℞
        </div>
        <div className="flex-1 pt-2 space-y-4">
          {rx.items.map((item, idx) => (
            <div key={item.id}>
              <p className="text-sm font-bold" style={{ color: '#111827' }}>
                {idx + 1}. {item.drug_name}{' '}
                <span className="font-normal text-xs" style={{ color: '#374151' }}>{item.dosage}</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#4b5563' }}>
                Disp. {item.quantity}{item.quantity_unit ? ` ${item.quantity_unit}` : ''} &nbsp;·&nbsp; {item.frequency} &nbsp;·&nbsp; {item.duration}
              </p>
              {item.instructions && (
                <p className="text-xs mt-0.5 italic" style={{ color: '#6b7280' }}>
                  Sig: {item.instructions}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Doctor signature block ── */}
      <div className="flex justify-end px-6 pb-5 pt-2" style={{ borderTop: '1px solid #f3f4f6' }}>
        <div>
          {/* Doctor's e-signature (typed), shown above the signature line when present */}
          {doctor?.signature && (
            <p
              className="text-center text-base pb-0.5"
              style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive', color: '#111827' }}
            >
              {doctor.signature}
            </p>
          )}
          <div className="mb-1" style={{ borderBottom: '1.5px solid #111827', width: '176px' }} />
          <p className="text-[10px] text-center font-semibold mb-2" style={{ color: '#111827' }}>
            {doctor?.user?.name ?? '—'}
          </p>
          <div className="space-y-0.5">
            <div className="flex items-end gap-1">
              <span className="text-[10px] font-bold shrink-0" style={{ color: '#111827' }}>LIC. NO.</span>
              <span
                className="text-[10px] pb-0.5 flex-1"
                style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '110px' }}
              >
                {doctor?.license_no ?? ''}
              </span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-[10px] font-bold shrink-0" style={{ color: '#111827' }}>PTR NO.</span>
              <span
                className="text-[10px] pb-0.5 flex-1"
                style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '110px' }}
              >
                {doctor?.ptr_no || ' '}
              </span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-[10px] font-bold shrink-0" style={{ color: '#111827' }}>S2</span>
              <span
                className="text-[10px] pb-0.5 flex-1"
                style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '125px' }}
              >
                {doctor?.s2_license || ' '}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Original detail sections ───────────────────────────────────────────────
function DetailView({ rx }: { rx: Prescription }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow-sm p-4" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Patient</p>
          <p className="font-bold text-slate-800">{rx.patient_record?.patient?.user?.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">PhilHealth: <span className="font-mono">{rx.patient_record?.patient?.philhealth_no ?? '—'}</span></p>
          <div className="mt-2 px-2.5 py-1.5 bg-slate-50 rounded-lg" style={{ border: '1px solid hsl(214 20% 93%)' }}>
            <p className="text-xs text-slate-500">Diagnosis</p>
            <p className="text-sm font-semibold text-slate-700">{rx.patient_record?.diagnosis}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Prescribing Physician</p>
          <p className="font-bold text-slate-800">{rx.doctor?.user?.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{rx.doctor?.specialization}</p>
          <p className="text-xs font-mono text-slate-400 mt-0.5">PRC {rx.doctor?.license_no}</p>
          <p className="text-xs text-slate-400 mt-0.5">
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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back + reference */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors"
          style={{ border: '1px solid hsl(210 18% 88%)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800 font-mono">{rx.reference_no}</h2>
          <StatusBadge status={rx.status} />
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
