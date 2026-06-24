import { useRef, useState, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formatBytes } from '@/lib/utils'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import StatusBadge from '@/components/common/StatusBadge'
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Download,
  FileText,
  FlaskConical,
  HeartPulse,
  Loader2,
  Lock,
  MapPin,
  Pill,
  Phone,
  ShieldAlert,
  Trash2,
  Unlock,
  Upload,
  User,
} from 'lucide-react'
import DeamhiPrescriptionCard from '@/features/prescriptions/DeamhiPrescriptionCard'
import {
  usePatientChart,
  useBreakGlass,
  useUploadDocument,
  useDeleteDocument,
  DOCUMENT_CATEGORIES,
  type RestrictedFile,
  type ChartDocument,
} from './queries'
import type { PatientRecord } from '@/mocks/types'

type Tab = 'demographics' | 'meds' | 'encounters' | 'labs' | 'restricted'

const BASE_TABS: { id: Tab; label: string; icon: ReactNode; description: string }[] = [
  { id: 'demographics', label: 'Demographics', icon: <User size={16} />, description: 'Identity, contact, safety, and insurance details' },
  { id: 'meds', label: 'Medications', icon: <Pill size={16} />, description: 'Active prescriptions and printable Hospital Rx' },
  { id: 'encounters', label: 'Encounters', icon: <ClipboardList size={16} />, description: 'Consultation history and clinical notes' },
  { id: 'labs', label: 'Lab & Imaging', icon: <FlaskConical size={16} />, description: 'Diagnostic orders and imaging requests' },
]

function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl bg-slate-50 px-6 py-12 text-center" style={{ border: '1px dashed hsl(210 18% 84%)' }}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-300 shadow-sm">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{text}</p>
    </div>
  )
}

function DetailRow({ label, value, mono, danger }: { label: string; value: ReactNode; mono?: boolean; danger?: boolean }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[190px_minmax(0,1fr)]">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`min-w-0 text-sm font-semibold ${danger ? 'text-red-600' : 'text-slate-900'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
          {icon}
        </span>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  )
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d + (d.length <= 10 ? 'T00:00:00' : '')).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '-'

const fmtShortDate = (d?: string | null) =>
  d ? new Date(d + (d.length <= 10 ? 'T00:00:00' : '')).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'

export default function PatientChartPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = usePatientChart(patientId)
  const [tab, setTab] = useState<Tab>('demographics')
  const [openRx, setOpenRx] = useState<number | null>(null)

  const breakGlass = useBreakGlass()
  const [revealed, setRevealed] = useState<Record<number, PatientRecord>>({})
  const [bgTarget, setBgTarget] = useState<RestrictedFile | null>(null)
  const [bgReason, setBgReason] = useState('')

  const submitBreakGlass = async () => {
    if (!bgTarget || bgReason.trim().length < 5) return
    const rec = await breakGlass.mutateAsync({ recordId: bgTarget.id, reason: bgReason.trim() })
    setRevealed((prev) => ({ ...prev, [bgTarget.id]: rec }))
    setBgTarget(null)
    setBgReason('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <p className="text-sm font-semibold text-slate-500">Chart not available.</p>
        <button onClick={() => navigate('/records')} className="mt-2 text-sm text-blue-600 hover:underline">Back to records</button>
      </div>
    )
  }

  const { patient, active_prescriptions, encounters, lab_imaging, restricted_files, documents } = data
  const mask = (v: string | null) => v ?? '-'
  const tabs = restricted_files.length
    ? [...BASE_TABS, { id: 'restricted' as Tab, label: `Restricted (${restricted_files.length})`, icon: <ShieldAlert size={16} />, description: 'Sensitive records and audited break-glass access' }]
    : BASE_TABS
  const activeTab = tabs.find((t) => t.id === tab) ?? tabs[0]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div
        className="overflow-hidden rounded-xl shadow-sm"
        style={{ border: '1px solid hsl(201 55% 82%)', background: 'linear-gradient(135deg, hsl(201 74% 96%) 0%, hsl(168 48% 95%) 100%)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex min-w-0 items-start gap-4">
            <button
              onClick={() => navigate('/records')}
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition-colors hover:bg-sky-50 hover:text-sky-700"
              style={{ border: '1px solid hsl(201 45% 84%)' }}
              aria-label="Back to records"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white" style={{ backgroundColor: 'hsl(201 100% 36%)' }}>
                <HeartPulse size={14} />
                Patient chart
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{patient.name}</h1>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">Active</span>
                <span className="rounded-full bg-white px-2.5 py-1 font-mono text-xs font-bold text-slate-600 ring-1 ring-slate-200">{patient.patient_code}</span>
              </div>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Shared clinical chart for authorized users. Reads, sensitive-file access, and break-glass actions are audited.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/70 bg-white/35 px-5 py-3 text-sm">
          <span className="inline-flex items-center gap-2 font-medium text-slate-700">
            <User size={15} className="text-sky-700" />
            {patient.age != null ? `${patient.age} years old` : '-'} | {patient.sex === 'male' ? 'Male' : patient.sex === 'female' ? 'Female' : patient.sex || '-'}
          </span>
          <span className="hidden h-4 w-px bg-slate-300/70 sm:block" />
          <span className="inline-flex items-center gap-2 font-medium text-slate-700">
            <Activity size={15} className="text-emerald-700" />
            <strong className="text-slate-900">{patient.visits_count}</strong> visits
          </span>
          <span className="hidden h-4 w-px bg-slate-300/70 sm:block" />
          <span className="inline-flex items-center gap-2 font-medium text-slate-700">
            <Pill size={15} className="text-amber-700" />
            <strong className="text-slate-900">{patient.rx_count}</strong> Rx
          </span>
          <span className="hidden h-4 w-px bg-slate-300/70 sm:block" />
          <span className="inline-flex min-w-0 items-center gap-2 font-medium text-slate-700">
            <MapPin size={15} className="shrink-0 text-slate-500" />
            <span className="truncate">{mask(patient.address)}</span>
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white" style={{ backgroundColor: 'hsl(168 60% 42%)' }}>
                {(patient.name ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-900">{patient.name}</p>
                <p className="truncate text-xs text-slate-500">{patient.email ?? 'No email on file'}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex items-center gap-2 text-slate-600"><Phone size={14} className="text-slate-400" /> {mask(patient.contact)}</p>
              <p className="flex items-center gap-2 text-slate-600"><CreditCard size={14} className="text-slate-400" /> {mask(patient.philhealth_no)}</p>
              <p className="flex items-center gap-2 text-slate-600"><CalendarDays size={14} className="text-slate-400" /> Registered {fmtShortDate(patient.registered_at)}</p>
            </div>
            <div className="mt-4 rounded-lg px-3 py-2" style={{ backgroundColor: patient.known_allergies ? 'hsl(0 90% 98%)' : 'hsl(150 40% 96%)', border: `1px solid ${patient.known_allergies ? 'hsl(0 80% 88%)' : 'hsl(150 38% 82%)'}` }}>
              <p className={`text-xs font-bold uppercase tracking-wide ${patient.known_allergies ? 'text-red-600' : 'text-emerald-700'}`}>
                Safety alert
              </p>
              <p className={`mt-1 text-sm font-semibold ${patient.known_allergies ? 'text-red-700' : 'text-emerald-800'}`}>
                {patient.known_allergies || 'No Known Allergies'}
              </p>
            </div>
          </div>

          <nav className="rounded-xl bg-white p-2 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
            {tabs.map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors"
                  style={active ? { backgroundColor: 'hsl(201 80% 94%)', color: 'hsl(201 100% 30%)' } : { color: 'hsl(215 16% 38%)' }}
                >
                  <span className="mt-0.5 shrink-0">{t.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{t.label}</span>
                    <span className="block text-xs text-slate-500">{t.description}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current view</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{activeTab.label}</h2>
                <p className="mt-1 text-sm text-slate-500">{activeTab.description}</p>
              </div>
            </div>
          </div>

          {tab === 'demographics' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Section title="Personal Information" icon={<User size={16} />}>
                <DetailRow label="Full Name" value={patient.name} />
                <DetailRow label="Email Address" value={mask(patient.email)} />
                <DetailRow label="Phone Number" value={mask(patient.contact)} />
                <DetailRow label="Date of Birth" value={fmtDate(patient.dob)} />
                <DetailRow label="Sex" value={patient.sex === 'male' ? 'Male' : patient.sex === 'female' ? 'Female' : patient.sex || '-'} />
                <DetailRow label="Preferred Language" value={patient.preferred_language || '-'} />
                <DetailRow label="Home Address" value={mask(patient.address)} />
              </Section>

              <Section title="Government & Insurance" icon={<CreditCard size={16} />}>
                <DetailRow label="PhilHealth No." value={mask(patient.philhealth_no)} mono />
                <DetailRow label="HMO Provider" value={patient.hmo_provider || '-'} />
                <DetailRow label="HMO Policy No." value={patient.hmo_policy_no || '-'} mono />
                <DetailRow label="HMO Group No." value={patient.hmo_group_no || '-'} mono />
                <DetailRow label="Copay" value={patient.copay || '-'} />
                <DetailRow label="Government ID Type" value={patient.gov_id_type || '-'} />
                <DetailRow label="Government ID No." value={patient.gov_id_no || '-'} mono />
              </Section>

              <Section title="Emergency Contact" icon={<Phone size={16} />}>
                <DetailRow label="Contact Person" value={patient.emergency_contact_name || '-'} />
                <DetailRow label="Relationship" value={patient.emergency_contact_relation || '-'} />
                <DetailRow label="Contact Number" value={patient.emergency_contact_phone || '-'} />
              </Section>

              <Section title="Attached Documents" icon={<FileText size={16} />}>
                <DocumentsSection patientId={patientId} documents={documents} />
              </Section>
            </div>
          )}

          {tab === 'meds' && (
            active_prescriptions.length === 0 ? (
              <Empty icon={<Pill size={28} />} title="No active medications" text="Active prescriptions will appear here once issued or verified." />
            ) : (
              <div className="space-y-3">
                {active_prescriptions.map((rx, index) => {
                  const open = openRx === index
                  return (
                    <div key={rx.id} className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
                      <button
                        onClick={() => setOpenRx(open ? null : index)}
                        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-sky-50"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-bold text-slate-900">{rx.reference_no}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Issued {fmtShortDate(rx.issued_at)} | {rx.items.length} medicine{rx.items.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <StatusBadge status={rx.status} />
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
            )
          )}

          {tab === 'encounters' && (
            encounters.length === 0 ? (
              <Empty icon={<ClipboardList size={28} />} title="No consultations recorded" text="Completed consultation records will show in this chart." />
            ) : (
              <div className="space-y-3">
                {encounters.map((encounter) => (
                  <div key={encounter.id} className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{fmtDate(encounter.visit_date)}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{encounter.doctor?.user?.name ?? '-'}</p>
                      </div>
                      {encounter.restriction_label && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{encounter.restriction_label}</span>
                      )}
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Chief complaint</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{encounter.chief_complaint}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Diagnosis</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{encounter.diagnosis}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Notes</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{encounter.notes || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'labs' && (
            lab_imaging.length === 0 ? (
              <Empty icon={<FlaskConical size={28} />} title="No lab or imaging orders" text="Diagnostic orders and imaging requests will appear here." />
            ) : (
              <div className="space-y-3">
                {lab_imaging.map((order) => (
                  <div key={order.id} className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-bold text-slate-900">{order.reference_no}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{fmtDate(order.ordered_at)} | {order.doctor?.user?.name ?? '-'}</p>
                      </div>
                      <StatusBadge status={order.status as 'ordered' | 'completed' | 'cancelled'} />
                    </div>
                    {order.items && order.items.length > 0 && (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                            <p className="text-sm font-bold text-slate-900">{item.test_name}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.clinical_reason || 'No clinical reason noted'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'restricted' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3" style={{ border: '1px solid hsl(345 80% 88%)' }}>
                <ShieldAlert size={16} className="mt-0.5 shrink-0 text-rose-500" />
                <p className="text-xs text-rose-700">
                  Sensitive records are protected. Emergency break-glass access is logged and audited.
                </p>
              </div>
              {restricted_files.map((file) => {
                const content = file.record ?? revealed[file.id] ?? null
                return (
                  <div key={file.id} className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        {content ? <Unlock size={15} className="shrink-0 text-emerald-600" /> : <Lock size={15} className="shrink-0 text-slate-400" />}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{file.restriction_label}</p>
                          <p className="text-xs text-slate-500">
                            {fmtShortDate(file.visit_date)} | {file.doctor_name ?? '-'}
                            {file.restricted_specialization ? ` | restricted to ${file.restricted_specialization}` : ''}
                          </p>
                        </div>
                      </div>
                      {!content && (
                        <button
                          onClick={() => { setBgTarget(file); setBgReason('') }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-200 transition-colors hover:bg-rose-100"
                        >
                          <ShieldAlert size={13} />
                          Break-glass
                        </button>
                      )}
                    </div>

                    {content && (
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Chief complaint</p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">{content.chief_complaint}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Diagnosis</p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">{content.diagnosis}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Notes</p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">{content.notes || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {bgTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setBgTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-500" />
              <h3 className="text-base font-bold text-slate-800">Break-Glass Access</h3>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              You are about to access a {bgTarget.restriction_label} record. This emergency access is logged and audited. State your clinical justification:
            </p>
            <textarea
              value={bgReason}
              onChange={(e) => setBgReason(e.target.value)}
              rows={3}
              placeholder="e.g. Emergency admission, need medication history to treat safely."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setBgTarget(null)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50">Cancel</button>
              <button
                onClick={submitBreakGlass}
                disabled={bgReason.trim().length < 5 || breakGlass.isPending}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: 'hsl(345 80% 50%)' }}
              >
                {breakGlass.isPending ? 'Accessing...' : 'Confirm & Reveal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentsSection({ patientId, documents }: { patientId?: string; documents: ChartDocument[] }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState('id')
  const [deleteDoc, setDeleteDoc] = useState<ChartDocument | null>(null)
  const upload = useUploadDocument(patientId)
  const remove = useDeleteDocument(patientId)

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload.mutate({ file, category })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      {documents.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-400">
          <FileText size={14} /> No documents uploaded yet
        </div>
      ) : (
        <ul className="space-y-2">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ border: '1px solid hsl(210 18% 90%)', backgroundColor: 'hsl(210 20% 98%)' }}>
              <FileText size={16} className="shrink-0 text-blue-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{document.original_name}</p>
                <p className="text-xs text-slate-400">{document.category_label} | {formatBytes(document.size)}</p>
              </div>
              <a href={document.url} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600" title="View / download">
                <Download size={14} />
              </a>
              <button onClick={() => setDeleteDoc(document)} disabled={remove.isPending} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40" title="Delete">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {DOCUMENT_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={onPick} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: 'hsl(201 100% 36%)' }}
        >
          {upload.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {upload.isPending ? 'Uploading...' : 'Upload'}
        </button>
        <span className="text-xs text-slate-400">JPG/PNG/PDF | max 5 MB</span>
      </div>
      {upload.isError && <p className="text-xs text-red-500">Upload failed. Check the file type/size and try again.</p>}

      <ConfirmDialog
        open={deleteDoc !== null}
        onOpenChange={(open) => { if (!open) setDeleteDoc(null) }}
        variant="destructive"
        title="Delete document?"
        description={`"${deleteDoc?.original_name ?? ''}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => {
          if (deleteDoc) remove.mutate(deleteDoc.id, { onSuccess: () => setDeleteDoc(null) })
        }}
      />
    </div>
  )
}
