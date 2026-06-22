import { useState } from 'react'
import { Loader2, Pill, ClipboardList, FlaskConical, FileText, Download, ChevronDown, ShieldCheck } from 'lucide-react'
import DeamhiPrescriptionCard from '@/features/prescriptions/DeamhiPrescriptionCard'
import { useMyChart } from './queries'

type Tab = 'meds' | 'visits' | 'labs' | 'documents'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'meds',      label: 'Active Medications', icon: <Pill size={15} /> },
  { id: 'visits',    label: 'Visit History',      icon: <ClipboardList size={15} /> },
  { id: 'labs',      label: 'Lab & Imaging',      icon: <FlaskConical size={15} /> },
  { id: 'documents', label: 'My Documents',       icon: <FileText size={15} /> },
]

const fmtDate = (d?: string | null) =>
  d ? new Date(d + (d.length <= 10 ? 'T00:00:00' : '')).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '—'

const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1_048_576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1_048_576).toFixed(1)} MB`

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center text-slate-300">
      {icon}
      <p className="text-sm font-medium text-slate-400 mt-2">{text}</p>
    </div>
  )
}

export default function MyRecordsPage() {
  const { data, isLoading } = useMyChart()
  const [tab, setTab] = useState<Tab>('meds')
  const [openRx, setOpenRx] = useState<number | null>(null)

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
  }
  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <p className="text-sm font-semibold text-slate-500">Your records aren’t available right now.</p>
      </div>
    )
  }

  const { patient, active_prescriptions, encounters, lab_imaging, documents } = data

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(215 30% 14%)' }}>My Health Records</h1>
        <p className="text-sm mt-0.5" style={{ color: 'hsl(215 16% 45%)' }}>A read-only summary of your visits, medications, and results.</p>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-5 flex-wrap" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0" style={{ backgroundColor: 'hsl(201 100% 36%)', color: 'white' }}>
          {(patient.name ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-800">{patient.name}</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">{patient.patient_code}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {patient.age != null ? `${patient.age} years old` : '—'} · {patient.sex === 'male' ? 'Male' : patient.sex === 'female' ? 'Female' : patient.sex}
            {patient.known_allergies ? <span className="text-red-600 font-medium"> · Allergies: {patient.known_allergies}</span> : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {[{ n: patient.visits_count, l: 'Visits' }, { n: patient.rx_count, l: 'Rx' }].map((s) => (
            <div key={s.l} className="text-center rounded-xl px-4 py-2.5 min-w-[64px]" style={{ border: '1px solid hsl(210 18% 90%)' }}>
              <p className="text-2xl font-bold text-slate-800">{s.n}</p>
              <p className="text-xs text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
              style={active
                ? { backgroundColor: 'hsl(201 100% 36%)', color: 'white' }
                : { backgroundColor: 'white', color: 'hsl(215 16% 40%)', border: '1px solid hsl(210 18% 88%)' }}
            >
              {t.icon}{t.label}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        {tab === 'meds' && (
          active_prescriptions.length === 0
            ? <Empty icon={<Pill size={28} />} text="No active medications" />
            : <div className="rounded-lg overflow-hidden" style={{ border: '1px solid hsl(210 18% 90%)' }}>
                {active_prescriptions.map((rx, i) => {
                  const open = openRx === i
                  return (
                    <div key={rx.id} style={{ borderBottom: i < active_prescriptions.length - 1 ? '1px solid hsl(210 18% 93%)' : 'none' }}>
                      <button
                        onClick={() => setOpenRx(open ? null : i)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                        style={{ backgroundColor: open ? 'hsl(201 100% 97%)' : 'white' }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Pill size={15} className="text-blue-600 shrink-0" />
                          <span className="text-sm font-semibold text-slate-700">RX · {new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</span>
                          <span className="text-xs font-mono text-slate-400 truncate">{rx.reference_no}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{rx.status}</span>
                          <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {open && (
                        <div className="px-4 py-4" style={{ backgroundColor: 'hsl(210 20% 98%)', borderTop: '1px solid hsl(210 18% 93%)' }}>
                          <DeamhiPrescriptionCard rx={rx} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
        )}

        {tab === 'visits' && (
          encounters.length === 0
            ? <Empty icon={<ClipboardList size={28} />} text="No visits recorded" />
            : <div className="space-y-3">
                {encounters.map((e) => (
                  <div key={e.id} className="rounded-lg p-4" style={{ border: '1px solid hsl(210 18% 90%)', backgroundColor: 'hsl(210 20% 98%)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800">{fmtDate(e.visit_date)}</p>
                      <span className="text-xs text-slate-500">{e.doctor?.user?.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1"><span className="font-semibold">Reason:</span> {e.chief_complaint}</p>
                    <p className="text-xs text-slate-500 mt-0.5"><span className="font-semibold">Diagnosis:</span> {e.diagnosis}</p>
                    {e.notes && <p className="text-xs text-slate-500 mt-0.5"><span className="font-semibold">Notes:</span> {e.notes}</p>}
                  </div>
                ))}
              </div>
        )}

        {tab === 'labs' && (
          lab_imaging.length === 0
            ? <Empty icon={<FlaskConical size={28} />} text="No lab or imaging results" />
            : <div className="space-y-3">
                {lab_imaging.map((o) => (
                  <div key={o.id} className="rounded-lg p-4" style={{ border: '1px solid hsl(210 18% 90%)', backgroundColor: 'hsl(210 20% 98%)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 font-mono">{o.reference_no}</p>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{o.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{fmtDate(o.ordered_at)} · {o.doctor?.user?.name ?? '—'}</p>
                    {o.items && o.items.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {o.items.map((it) => <li key={it.id} className="text-xs text-slate-600">• {it.test_name}{it.clinical_reason ? ` — ${it.clinical_reason}` : ''}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
        )}

        {tab === 'documents' && (
          documents.length === 0
            ? <Empty icon={<FileText size={28} />} text="No documents on file" />
            : <ul className="space-y-1.5">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ border: '1px solid hsl(210 18% 90%)', backgroundColor: 'hsl(210 20% 98%)' }}>
                    <FileText size={16} className="text-blue-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 truncate">{d.original_name}</p>
                      <p className="text-xs text-slate-400">{d.category_label} · {fmtSize(d.size)}</p>
                    </div>
                    <a href={d.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View / download">
                      <Download size={14} />
                    </a>
                  </li>
                ))}
              </ul>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck size={13} /> This is a read-only view. Sensitive specialist records are not shown here — ask your doctor for access.
      </p>
    </div>
  )
}
