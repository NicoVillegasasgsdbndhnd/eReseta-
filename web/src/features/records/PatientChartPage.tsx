import { useRef, useState } from 'react'
import { formatBytes } from '@/lib/utils'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Pill, ClipboardList, FlaskConical, User, Phone, CreditCard, MapPin, ChevronDown, FileText, ShieldAlert, Lock, Unlock, Upload, Download, Trash2 } from 'lucide-react'
import DeamhiPrescriptionCard from '@/features/prescriptions/DeamhiPrescriptionCard'
import {
  usePatientChart, useBreakGlass, useUploadDocument, useDeleteDocument,
  DOCUMENT_CATEGORIES, type RestrictedFile, type ChartDocument,
} from './queries'
import type { PatientRecord } from '@/mocks/types'

type Tab = 'demographics' | 'meds' | 'encounters' | 'labs' | 'restricted'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'demographics', label: 'Demographics',           icon: <User size={15} /> },
  { id: 'meds',         label: 'Active Medications',      icon: <Pill size={15} /> },
  { id: 'encounters',   label: 'Encounter History',       icon: <ClipboardList size={15} /> },
  { id: 'labs',         label: 'Lab & Imaging',           icon: <FlaskConical size={15} /> },
]

function Section({ title, alert, children }: { title: string; alert?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1.5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
        {alert && <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(345 90% 55%)' }} />}
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, mono, danger }: { label: string; value: React.ReactNode; mono?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <span className="text-sm text-slate-500 w-48 shrink-0">{label}</span>
      <span className={`text-sm font-medium ${danger ? 'text-red-600 font-semibold' : 'text-slate-800'} ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

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
  const { data, isLoading } = usePatientChart(patientId)
  const [tab, setTab] = useState<Tab>('demographics')
  const [openRx, setOpenRx] = useState<number | null>(null) // which Rx is expanded (none by default)

  // Break-glass: locally-held reveals (not cached), + the modal target & justification.
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
      <div className="bg-white rounded-xl shadow-sm p-12 text-center" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <p className="text-sm font-semibold text-slate-500">Chart not available.</p>
        <button onClick={() => navigate('/records')} className="text-sm text-blue-600 hover:underline mt-2">← Back to records</button>
      </div>
    )
  }

  const { patient, active_prescriptions, encounters, lab_imaging, restricted_files, documents } = data
  // Staff may now view full patient info (per request — overrides the earlier PII-mask rule).
  const mask = (v: string | null) => v ?? '—'

  // Restricted Files tab only appears when the patient actually has restricted records.
  const tabs = restricted_files.length
    ? [...TABS, { id: 'restricted' as Tab, label: `Restricted Files (${restricted_files.length})`, icon: <ShieldAlert size={15} /> }]
    : TABS

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
        {tabs.map((t) => {
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
            <Section title="Personal Information">
              <Field label="Full Name"          value={patient.name} />
              <Field label="Email Address"       value={mask(patient.email)} />
              <Field label="Phone Number"        value={mask(patient.contact)} />
              <Field label="Date of Birth"       value={fmtDate(patient.dob)} />
              <Field label="Sex"                 value={patient.sex === 'male' ? 'Male' : patient.sex === 'female' ? 'Female' : (patient.sex || '—')} />
              <Field label="Preferred Language"  value={patient.preferred_language || '—'} />
              <Field label="Home Address"        value={mask(patient.address)} />
            </Section>

            <Section title="Health Safety Alert" alert>
              <Field label="Known Allergies" value={patient.known_allergies || 'No Known Allergies'} danger={!!patient.known_allergies} />
            </Section>

            <Section title="Government & Insurance Verification">
              <Field label="PhilHealth No."       value={mask(patient.philhealth_no)} mono />
              <Field label="HMO Provider"         value={patient.hmo_provider || '—'} />
              <Field label="HMO Card / Policy No" value={patient.hmo_policy_no || '—'} mono />
              <Field label="HMO Group No"         value={patient.hmo_group_no || '—'} mono />
              <Field label="Copay"                value={patient.copay || '—'} />
              <Field label="Government ID Type"   value={patient.gov_id_type || '—'} />
              <Field label="Government ID No"     value={patient.gov_id_no || '—'} mono />
            </Section>

            <Section title="Emergency Contact Details">
              <Field label="Contact Person" value={patient.emergency_contact_name || '—'} />
              <Field label="Relationship"   value={patient.emergency_contact_relation || '—'} />
              <Field label="Contact Number" value={patient.emergency_contact_phone || '—'} />
            </Section>

            <Section title="Attached Clinical & Administrative Documents">
              <DocumentsSection patientId={patientId} documents={documents} />
            </Section>

            <p className="text-xs text-slate-400 mt-1">Registered {fmtDate(patient.registered_at)}</p>
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

        {tab === 'restricted' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg p-3" style={{ border: '1px solid hsl(345 80% 88%)', backgroundColor: 'hsl(345 90% 98%)' }}>
              <ShieldAlert size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700">
                Sensitive records (mental health, genetic, substance-abuse, VIP, patient-restricted).
                Locked entries are viewable only by an authorized specialist — or via an <strong>audited break-glass</strong> override.
              </p>
            </div>
            {restricted_files.map((f) => {
              const content = f.record ?? revealed[f.id] ?? null
              return (
                <div key={f.id} className="rounded-lg p-4" style={{ border: '1px solid hsl(210 18% 90%)', backgroundColor: content ? 'hsl(150 40% 98%)' : 'hsl(210 20% 98%)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {content ? <Unlock size={14} className="text-emerald-600 shrink-0" /> : <Lock size={14} className="text-slate-400 shrink-0" />}
                      <p className="text-sm font-bold text-slate-800 truncate">{f.restriction_label}</p>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">{fmtDate(f.visit_date)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {f.doctor_name ?? '—'}
                    {f.restricted_specialization ? ` · restricted to ${f.restricted_specialization}` : ''}
                  </p>

                  {content ? (
                    <div className="mt-2 pt-2 space-y-0.5" style={{ borderTop: '1px solid hsl(210 18% 92%)' }}>
                      <p className="text-xs text-slate-600"><span className="font-semibold">Chief complaint:</span> {content.chief_complaint}</p>
                      <p className="text-xs text-slate-600"><span className="font-semibold">Diagnosis:</span> {content.diagnosis}</p>
                      {content.notes && <p className="text-xs text-slate-600"><span className="font-semibold">Notes:</span> {content.notes}</p>}
                    </div>
                  ) : (
                    <button
                      onClick={() => { setBgTarget(f); setBgReason('') }}
                      className="mt-2 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                    >
                      <ShieldAlert size={13} /> Break-Glass Access
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Break-glass justification modal */}
      {bgTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setBgTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={18} className="text-rose-500" />
              <h3 className="text-base font-bold text-slate-800">Break-Glass Access</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              You are about to access a <strong>{bgTarget.restriction_label}</strong> record you are not the
              designated specialist for. This emergency access is <strong>logged and audited</strong>. State your clinical justification:
            </p>
            <textarea
              value={bgReason}
              onChange={(e) => setBgReason(e.target.value)}
              rows={3}
              placeholder="e.g. Emergency admission — need allergy/medication history to treat safely."
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setBgTarget(null)} className="text-sm font-medium text-slate-500 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors">Cancel</button>
              <button
                onClick={submitBreakGlass}
                disabled={bgReason.trim().length < 5 || breakGlass.isPending}
                className="text-sm font-semibold text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
                style={{ backgroundColor: 'hsl(345 80% 50%)' }}
              >
                {breakGlass.isPending ? 'Accessing…' : 'Confirm & Reveal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Attached Documents — list + upload (category + file) + delete. Clinical staff only. */
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
    <div className="space-y-2">
      {documents.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-1">
          <FileText size={14} /> No documents uploaded yet
        </div>
      ) : (
        <ul className="space-y-1.5">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ border: '1px solid hsl(210 18% 90%)', backgroundColor: 'hsl(210 20% 98%)' }}>
              <FileText size={16} className="text-blue-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-700 truncate">{d.original_name}</p>
                <p className="text-xs text-slate-400">{d.category_label} · {formatBytes(d.size)}</p>
              </div>
              <a href={d.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View / download">
                <Download size={14} />
              </a>
              <button onClick={() => setDeleteDoc(d)} disabled={remove.isPending} className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40" title="Delete">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-1">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 text-sm bg-white px-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {DOCUMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={onPick} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: 'hsl(201 100% 36%)' }}
        >
          {upload.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </button>
        <span className="text-xs text-slate-400">JPG/PNG/PDF · max 5 MB</span>
      </div>
      {upload.isError && <p className="text-xs text-red-500">Upload failed — check the file type/size and try again.</p>}

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
