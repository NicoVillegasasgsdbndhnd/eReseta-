import { useMemo, useState } from 'react'
import { ChevronDown, ClipboardList, Download, FileText, FlaskConical, Loader2, Pill, ShieldCheck } from 'lucide-react'
import StatusBadge from '@/components/common/StatusBadge'
import DeamhiPrescriptionCard from '@/features/prescriptions/DeamhiPrescriptionCard'
import { formatBytes } from '@/lib/utils'
import { useMyChart } from './queries'
import OutPatientFormModal from '@/features/consultations/OutPatientFormModal'
import type { PatientRecord } from '@/mocks/types'

type Tab = 'visits' | 'meds' | 'labs' | 'documents'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'visits', label: 'Visit History', icon: <ClipboardList size={15} /> },
  { id: 'meds', label: 'Active Medications', icon: <Pill size={15} /> },
  { id: 'labs', label: 'Lab & Imaging', icon: <FlaskConical size={15} /> },
  { id: 'documents', label: 'Documents', icon: <FileText size={15} /> },
]

const fmtDate = (d?: string | null) =>
  d ? new Date(d + (d.length <= 10 ? 'T00:00:00' : '')).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '-'

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center text-slate-300">
      {icon}
      <p className="mt-2 text-sm font-semibold text-slate-400">{text}</p>
    </div>
  )
}

export default function MyRecordsPage() {
  const { data, isLoading } = useMyChart()
  const [tab, setTab] = useState<Tab>('visits')
  const [openRx, setOpenRx] = useState<number | null>(null)
  const [viewVisit, setViewVisit] = useState<PatientRecord | null>(null)

  const encounterById = useMemo(() => {
    const map = new Map<number, PatientRecord>()
    for (const encounter of data?.encounters ?? []) map.set(encounter.id, encounter)
    return map
  }, [data])

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
  }

  if (!data) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <p className="text-sm font-semibold text-slate-500">Your records are not available right now.</p>
      </div>
    )
  }

  const { patient, active_prescriptions, encounters, lab_imaging, documents } = data
  const latestVisit = encounters[0]

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <div
          className="grid gap-5 p-4 sm:p-6 md:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]"
          style={{ background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(205 92% 30%) 58%, hsl(152 48% 35%) 100%)' }}
        >
          <div className="min-w-0 text-white">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
              <ShieldCheck size={14} />
              My Records
            </div>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">My Health Records</h1>
            <p className="mt-2 max-w-xl text-sm" style={{ color: 'rgba(255,255,255,0.76)' }}>
              A read-only portal for your visit history, active medications, lab orders, and documents.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { label: 'Visits', value: patient.visits_count },
                { label: 'Rx', value: patient.rx_count },
                { label: 'Lab orders', value: lab_imaging.length },
                { label: 'Documents', value: documents.length },
              ].map((item) => (
                <div key={item.label} className="rounded-lg px-4 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}>
                  <p className="text-lg font-bold leading-none">{item.value}</p>
                  <p className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Latest visit</p>
            {latestVisit ? (
              <button
                onClick={() => setViewVisit(latestVisit)}
                className="mt-4 w-full rounded-lg bg-slate-50 p-4 text-left transition-colors hover:bg-sky-50"
                style={{ border: '1px solid hsl(210 18% 90%)' }}
              >
                <p className="text-sm font-bold text-slate-900">{fmtDate(latestVisit.visit_date)}</p>
                <p className="mt-1 truncate text-sm text-slate-600">{latestVisit.diagnosis}</p>
                <p className="mt-2 text-xs font-semibold text-sky-700">Open visit details</p>
              </button>
            ) : (
              <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-400" style={{ border: '1px dashed hsl(210 18% 86%)' }}>
                No visits recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-2 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <div className="mobile-scroll-x flex gap-2 sm:grid sm:grid-cols-4 sm:overflow-visible sm:p-0">
          {TABS.map((item) => {
            const active = tab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className="flex min-w-max items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:min-w-0"
                style={active ? { backgroundColor: 'hsl(201 100% 36%)', color: 'white' } : { backgroundColor: 'transparent', color: 'hsl(215 16% 40%)' }}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl bg-white p-3 shadow-sm sm:p-5" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        {tab === 'visits' && (
          encounters.length === 0 ? (
            <Empty icon={<ClipboardList size={28} />} text="No visits recorded" />
          ) : (
            <div className="space-y-2">
              {encounters.map((encounter) => (
                <VisitCard key={encounter.id} encounter={encounter} onOpen={setViewVisit} />
              ))}
            </div>
          )
        )}

        {tab === 'meds' && (
          active_prescriptions.length === 0 ? (
            <Empty icon={<Pill size={28} />} text="No active medications" />
          ) : (
            <div className="overflow-hidden rounded-lg" style={{ border: '1px solid hsl(210 18% 90%)' }}>
              {active_prescriptions.map((rx, index) => {
                const open = openRx === index
                return (
                  <div key={rx.id} style={{ borderBottom: index < active_prescriptions.length - 1 ? '1px solid hsl(210 18% 93%)' : 'none' }}>
                    <button
                      onClick={() => setOpenRx(open ? null : index)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                      style={{ backgroundColor: open ? 'hsl(201 100% 97%)' : 'white' }}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Pill size={15} className="shrink-0 text-blue-600" />
                        <span className="text-sm font-semibold text-slate-700">RX - {new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</span>
                        <span className="truncate font-mono text-xs text-slate-400">{rx.reference_no}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={rx.status} />
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {open && (
                      <div className="px-4 py-4" style={{ backgroundColor: 'hsl(210 20% 98%)', borderTop: '1px solid hsl(210 18% 93%)' }}>
                        <DeamhiPrescriptionCard rx={rx} />
                        <RelatedVisit encounter={encounterById.get(rx.patient_record_id)} onOpen={setViewVisit} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {tab === 'labs' && (
          lab_imaging.length === 0 ? (
            <Empty icon={<FlaskConical size={28} />} text="No lab or imaging results" />
          ) : (
            <div className="space-y-3">
              {lab_imaging.map((order) => (
                <div key={order.id} className="rounded-lg p-4" style={{ border: '1px solid hsl(210 18% 90%)', backgroundColor: 'hsl(210 20% 98%)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm font-semibold text-slate-800">{order.reference_no}</p>
                    <StatusBadge status={order.status as 'ordered' | 'completed' | 'cancelled'} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{fmtDate(order.ordered_at)} - {order.doctor?.user?.name ?? '-'}</p>
                  {order.items && order.items.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {order.items.map((item) => <li key={item.id} className="text-xs text-slate-600">- {item.test_name}{item.clinical_reason ? ` - ${item.clinical_reason}` : ''}</li>)}
                    </ul>
                  )}
                  <RelatedVisit encounter={encounterById.get(order.patient_record_id)} onOpen={setViewVisit} />
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'documents' && (
          documents.length === 0 ? (
            <Empty icon={<FileText size={28} />} text="No documents on file" />
          ) : (
            <ul className="space-y-1.5">
              {documents.map((document) => (
                <li key={document.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ border: '1px solid hsl(210 18% 90%)', backgroundColor: 'hsl(210 20% 98%)' }}>
                  <FileText size={16} className="shrink-0 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{document.original_name}</p>
                    <p className="text-xs text-slate-400">{document.category_label} - {formatBytes(document.size)}</p>
                  </div>
                  <a href={document.url} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600" title="View / download">
                    <Download size={14} />
                  </a>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck size={13} />
        This is a read-only view. Sensitive specialist records are not shown here.
      </p>

      <OutPatientFormModal
        record={viewVisit}
        patient={{ name: patient.name, age: patient.age, sex: patient.sex, address: patient.address, contact: patient.contact, hmo_provider: patient.hmo_provider }}
        onClose={() => setViewVisit(null)}
      />
    </div>
  )
}

function VisitCard({ encounter, onOpen }: { encounter: PatientRecord; onOpen: (e: PatientRecord) => void }) {
  const meds = encounter.prescriptions ?? []
  const labs = encounter.diagnostic_orders ?? []

  return (
    <button
      onClick={() => onOpen(encounter)}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-slate-50"
      style={{ border: '1px solid hsl(210 18% 90%)' }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-800">{fmtDate(encounter.visit_date)}</p>
          <span className="text-slate-300">·</span>
          <span className="truncate text-xs text-slate-500">{encounter.doctor?.user?.name}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500"><span className="font-semibold">Diagnosis:</span> {encounter.diagnosis}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"><Pill size={11} /> {meds.length}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700"><FlaskConical size={11} /> {labs.length}</span>
        <ChevronDown size={16} className="-rotate-90 text-slate-400" />
      </div>
    </button>
  )
}

function RelatedVisit({ encounter, onOpen }: { encounter?: PatientRecord; onOpen: (e: PatientRecord) => void }) {
  if (!encounter) return null

  return (
    <button
      onClick={() => onOpen(encounter)}
      className="mt-3 w-full rounded-lg p-3 text-left transition-colors hover:bg-white"
      style={{ border: '1px solid hsl(210 18% 90%)', backgroundColor: 'hsl(201 50% 98%)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">From this visit</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">{fmtDate(encounter.visit_date)} - {encounter.diagnosis}</p>
      <p className="mt-1 text-xs font-medium text-blue-600">View full visit</p>
    </button>
  )
}

