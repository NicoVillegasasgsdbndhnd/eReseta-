import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Pill, ClipboardList, Scissors, FlaskConical, Lock, ShieldCheck } from 'lucide-react'
import { usePatientChart } from './queries'

type Tab = 'meds' | 'encounters' | 'procedures' | 'labs' | 'restricted'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'meds',       label: 'Active Medications',    icon: <Pill size={15} /> },
  { id: 'encounters', label: 'Encounter History',     icon: <ClipboardList size={15} /> },
  { id: 'procedures', label: 'Procedures & Surgeries', icon: <Scissors size={15} /> },
  { id: 'labs',       label: 'Lab & Imaging',         icon: <FlaskConical size={15} /> },
  { id: 'restricted', label: 'Restricted Files',      icon: <Lock size={15} /> },
]

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center text-slate-300">
      {icon}
      <p className="text-sm font-medium text-slate-400 mt-2">{text}</p>
    </div>
  )
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d + (d.length <= 10 ? 'T00:00:00' : '')).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—'

export default function PatientChartPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = usePatientChart(patientId)
  const [tab, setTab] = useState<Tab>('meds')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <p className="text-sm font-semibold text-slate-500">Chart not available.</p>
        <button onClick={() => navigate('/records')} className="text-sm text-blue-600 hover:underline mt-2">← Back to records</button>
      </div>
    )
  }

  const { patient, active_medications, encounters, procedures, lab_imaging } = data

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm px-5 py-4" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <button
          onClick={() => navigate('/records')}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-1.5 transition-colors mb-3"
          style={{ border: '1px solid hsl(210 18% 88%)' }}
        >
          <ArrowLeft size={14} /> Back to records
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0" style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 30%)' }}>
            {(patient.name ?? '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{patient.name}</h1>
            <p className="text-xs text-slate-500">
              {patient.sex === 'male' ? 'Male' : patient.sex === 'female' ? 'Female' : patient.sex} · DOB {fmtDate(patient.dob)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map((t) => {
          const active = tab === t.id
          const count =
            t.id === 'meds' ? active_medications.length
            : t.id === 'encounters' ? encounters.length
            : t.id === 'procedures' ? procedures.length
            : t.id === 'labs' ? lab_imaging.length
            : 0
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
              style={active
                ? { backgroundColor: 'hsl(201 100% 36%)', color: 'white' }
                : { backgroundColor: 'white', color: 'hsl(215 16% 40%)', border: '1px solid hsl(210 18% 88%)' }}
            >
              {t.icon}
              {t.label}
              {t.id !== 'restricted' && (
                <span className={`text-xs font-bold px-1.5 rounded-full ${active ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        {tab === 'meds' && (
          active_medications.length === 0
            ? <Empty icon={<Pill size={28} />} text="No active medications" />
            : <div className="divide-y" style={{ borderColor: 'hsl(210 18% 93%)' }}>
                {active_medications.map((m) => (
                  <div key={m.id} className="py-3 flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{m.drug_name} <span className="font-normal text-slate-500">{m.dosage}</span></p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {m.quantity}{m.quantity_unit ? ` ${m.quantity_unit}` : ''} · {m.frequency} · {m.duration}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 font-mono">{m.reference_no}</span>
                  </div>
                ))}
              </div>
        )}

        {tab === 'encounters' && (
          encounters.length === 0
            ? <Empty icon={<ClipboardList size={28} />} text="No consultations recorded" />
            : <div className="space-y-3">
                {encounters.map((e) => (
                  <div key={e.id} className="rounded-lg p-4" style={{ border: '1px solid hsl(210 18% 90%)', backgroundColor: 'hsl(210 20% 98%)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800">{fmtDate(e.visit_date)}</p>
                      <span className="text-xs text-slate-500">{e.doctor?.user?.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1"><span className="font-semibold">Chief complaint:</span> {e.chief_complaint}</p>
                    <p className="text-xs text-slate-500 mt-0.5"><span className="font-semibold">Diagnosis:</span> {e.diagnosis}</p>
                    {e.notes && <p className="text-xs text-slate-500 mt-0.5"><span className="font-semibold">Notes:</span> {e.notes}</p>}
                  </div>
                ))}
              </div>
        )}

        {tab === 'procedures' && (
          procedures.length === 0
            ? <Empty icon={<Scissors size={28} />} text="No procedures or surgeries on file" />
            : <div className="divide-y" style={{ borderColor: 'hsl(210 18% 93%)' }}>
                {procedures.map((p) => (
                  <div key={p.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.category === 'surgery' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {p.category === 'surgery' ? 'Surgery' : 'Procedure'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{fmtDate(p.performed_at)}{p.doctor ? ` · ${p.doctor}` : ''}</p>
                    {p.notes && <p className="text-xs text-slate-500 mt-0.5">{p.notes}</p>}
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
                        {o.items.map((it) => (
                          <li key={it.id} className="text-xs text-slate-600">• {it.test_name}{it.clinical_reason ? ` — ${it.clinical_reason}` : ''}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
        )}

        {tab === 'restricted' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldCheck size={30} className="text-slate-300" />
            <p className="text-sm font-semibold text-slate-500 mt-3">No restricted files</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Restricted records (e.g. mental health, genetic, substance-abuse) appear here only for a
              doctor whose specialization is authorized to view them. None apply to this patient.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
