import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Pill, ClipboardList, FlaskConical, User, Phone, CreditCard, MapPin, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import DeamhiPrescriptionCard from '@/features/prescriptions/DeamhiPrescriptionCard'
import { usePatientChart } from './queries'

type Tab = 'demographics' | 'meds' | 'encounters' | 'labs'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'demographics', label: 'Demographics',           icon: <User size={15} /> },
  { id: 'meds',         label: 'Active Medications',      icon: <Pill size={15} /> },
  { id: 'encounters',   label: 'Encounter History',       icon: <ClipboardList size={15} /> },
  { id: 'labs',         label: 'Lab & Imaging',           icon: <FlaskConical size={15} /> },
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
  d ? new Date(d + (d.length <= 10 ? 'T00:00:00' : '')).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '—'

export default function PatientChartPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isStaff = user?.role === 'staff'
  const { data, isLoading } = usePatientChart(patientId)
  const [tab, setTab] = useState<Tab>('demographics')
  const [openRx, setOpenRx] = useState<number | null>(null) // which Rx is expanded (none by default)

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

  const { patient, active_prescriptions, encounters, lab_imaging } = data
  const R = <span className="text-slate-300 select-none font-mono tracking-widest">••••••</span>
  const mask = (v: string | null) => (isStaff ? R : <>{v ?? '—'}</>)

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Back */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/records')}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors"
          style={{ border: '1px solid hsl(210 18% 88%)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className="text-lg font-bold text-slate-800">Patient Record</h2>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-5 flex-wrap" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0" style={{ backgroundColor: 'hsl(168 60% 45%)', color: 'white' }}>
          {(patient.name ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">{patient.name}</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Active</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">{patient.patient_code}</span>
          </div>
          <div className="flex items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><User size={11} /> {patient.age != null ? `${patient.age} years old` : '—'} · {patient.sex === 'male' ? 'Male' : patient.sex === 'female' ? 'Female' : patient.sex}</span>
            <span className="flex items-center gap-1"><Phone size={11} /> {mask(patient.contact)}</span>
            <span className="flex items-center gap-1"><CreditCard size={11} /> {mask(patient.philhealth_no)}</span>
            <span className="flex items-center gap-1"><MapPin size={11} /> {mask(patient.address)}</span>
          </div>
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
              {t.icon}
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        {tab === 'demographics' && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Personal Information</p>
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(210 18% 93%)' }}>
              <span className="text-sm text-slate-500">Full Name</span><span className="text-sm font-semibold text-slate-800">{patient.name}</span>
            </div>
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(210 18% 93%)' }}>
              <span className="text-sm text-slate-500">Email Address</span><span className="text-sm font-semibold text-slate-800">{mask(patient.email)}</span>
            </div>
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(210 18% 93%)' }}>
              <span className="text-sm text-slate-500">Phone Number</span><span className="text-sm font-semibold text-slate-800">{mask(patient.contact)}</span>
            </div>
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(210 18% 93%)' }}>
              <span className="text-sm text-slate-500">Date of Birth</span><span className="text-sm font-semibold text-slate-800">{fmtDate(patient.dob)}</span>
            </div>
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(210 18% 93%)' }}>
              <span className="text-sm text-slate-500">Sex</span><span className="text-sm font-semibold text-slate-800">{patient.sex === 'male' ? 'Male' : patient.sex === 'female' ? 'Female' : patient.sex}</span>
            </div>
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(210 18% 93%)' }}>
              <span className="text-sm text-slate-500">Home Address</span><span className="text-sm font-semibold text-slate-800">{mask(patient.address)}</span>
            </div>
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(210 18% 93%)' }}>
              <span className="text-sm text-slate-500">PhilHealth No.</span><span className="text-sm font-semibold text-slate-800 font-mono">{mask(patient.philhealth_no)}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-slate-500">Registered</span><span className="text-sm font-semibold text-slate-800">{fmtDate(patient.registered_at)}</span>
            </div>
          </div>
        )}

        {tab === 'meds' && (
          active_prescriptions.length === 0
            ? <Empty icon={<Pill size={28} />} text="No active medications" />
            : <div className="rounded-lg overflow-hidden" style={{ border: '1px solid hsl(210 18% 90%)' }}>
                {active_prescriptions.map((rx, i) => {
                  const open = openRx === i
                  return (
                    <div key={rx.id} style={{ borderBottom: i < active_prescriptions.length - 1 ? '1px solid hsl(210 18% 93%)' : 'none' }}>
                      {/* Clickable Rx row — the Hospital Rx is hidden until this is clicked */}
                      <button
                        onClick={() => setOpenRx(open ? null : i)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                        style={{ backgroundColor: open ? 'hsl(201 100% 97%)' : 'white' }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Pill size={15} className="text-blue-600 shrink-0" />
                          <span className="text-sm font-semibold text-slate-700">
                            RX · {new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                          </span>
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
      </div>
    </div>
  )
}
