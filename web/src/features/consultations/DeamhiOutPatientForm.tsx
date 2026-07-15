import type { ReactNode } from 'react'
import { VITALS, PE_SYSTEMS } from './clinicalForm'
import type { PatientRecord, Patient } from '@/mocks/types'

// Printable DEAMHI Out-Patient record — the digital equivalent of the hospital's paper form.
// Mirrors the paper layout: header, demographics, chief complaint, vitals, physical exam,
// diagnosis, medication, diagnostics, treatment/notes. Confidentiality (internal) is not shown.
// Conditional sections (medication, diagnostics, notes) render only when the doctor filled them.

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-end gap-1">
      <span className="text-[11px] font-bold shrink-0" style={{ color: '#111827' }}>{label}:</span>
      <span className="flex-1 text-[13px] pb-0.5" style={{ borderBottom: '1px solid #374151', color: '#111827', minWidth: '60px' }}>
        {value || ' '}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-bold text-[11px] tracking-wide" style={{ color: '#111827' }}>{title}</p>
      <div className="text-[13px]" style={{ color: '#111827' }}>{children}</div>
    </div>
  )
}

export default function DeamhiOutPatientForm({ record, patient }: { record: PatientRecord; patient: Patient }) {
  const name    = patient.user?.name ?? ''
  const age     = patient.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / 31557600000) : ''
  const gender  = patient.sex ?? ''
  const vs      = record.vital_signs ?? {}
  const pe      = record.physical_exam ?? {}
  const meds    = record.prescriptions?.flatMap((rx) => rx.items) ?? []
  const tests   = record.diagnostic_orders?.flatMap((o) => o.items) ?? []
  const visit   = record.visit_date ? new Date(record.visit_date).toLocaleDateString('en-PH', { dateStyle: 'long' }) : ''

  return (
    <div className="bg-white w-full mx-auto" style={{ maxWidth: '800px', color: '#111827' }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div className="flex items-center gap-3">
          <svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <circle cx="23" cy="23" r="21" fill="white" stroke="#15803d" strokeWidth="2"/>
            <rect x="20" y="9"  width="6" height="28" rx="1" fill="#15803d"/>
            <rect x="9"  y="20" width="28" height="6" rx="1" fill="#15803d"/>
            <circle cx="23" cy="23" r="5" fill="white"/>
            <line x1="23" y1="16" x2="23" y2="30" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M20 19 C20 17 26 17 26 20.5 C26 24 20 24 20 27.5 C20 31 26 31 26 28.5" stroke="#dc2626" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
          </svg>
          <div className="text-left">
            <p className="font-black text-xl leading-none" style={{ color: '#15803d', letterSpacing: '0.04em' }}>DEAMHI</p>
            <p className="text-[9px] font-semibold leading-tight mt-0.5" style={{ color: '#374151' }}>DR. EUTIQUIO LL. ATANACIO, JR.</p>
            <p className="text-[9px] font-semibold leading-tight" style={{ color: '#374151' }}>MEMORIAL HOSPITAL, INC.</p>
          </div>
        </div>
        <p className="font-black text-lg" style={{ color: '#111827', letterSpacing: '0.05em' }}>OUT-PATIENT</p>
      </div>

      {/* ── Demographics ── */}
      <div className="px-6 pt-3 pb-3 space-y-2" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Field label="ATTENDING PHYSICIAN" value={record.doctor?.user?.name} />
          <Field label="DATE/TIME" value={visit} />
          <Field label="CONTACT NO" value={patient.contact} />
          <Field label="HMO" value={patient.hmo_provider} />
        </div>
        <div className="grid gap-x-6 gap-y-2" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
          <Field label="NAME" value={name} />
          <Field label="AGE" value={age} />
          <Field label="GENDER" value={gender} />
        </div>
        <Field label="ADDRESS" value={patient.address} />
      </div>

      {/* ── Clinical ── */}
      <div className="px-6 py-3 space-y-3">
        <Section title="CHIEF COMPLAINT:"><p className="whitespace-pre-wrap">{record.chief_complaint}</p></Section>

        <Section title="VITAL SIGNS:">
          <p>{VITALS.map(([k, label]) => `${label}: ${vs[k] || '—'}`).join('    ')}</p>
        </Section>

        <Section title="PHYSICAL EXAMINATION:">
          <div className="grid grid-cols-2 gap-x-8">
            {PE_SYSTEMS.map(([k, label]) => {
              const e = pe[k]
              const status = e?.status ?? 'Normal'
              return (
                <p key={k}>
                  <span className="font-medium">{label}:</span> {status}
                  {status === 'Abnormal' && e?.notes ? ` — ${e.notes}` : ''}
                </p>
              )
            })}
          </div>
        </Section>

        <Section title="DIAGNOSIS:"><p className="whitespace-pre-wrap">{record.diagnosis}</p></Section>

        {meds.length > 0 && (
          <Section title="MEDICATION:">
            <ul className="list-disc pl-5">
              {meds.map((m) => (
                <li key={m.id}>{m.drug_name} — {m.dosage}, {m.quantity}{m.quantity_unit ? ` ${m.quantity_unit}` : ''}, {m.frequency}, {m.duration}</li>
              ))}
            </ul>
          </Section>
        )}

        {tests.length > 0 && (
          <Section title="DIAGNOSTIC/S:">
            <ul className="list-disc pl-5">
              {tests.map((t) => (
                <li key={t.id}>{t.test_name}{t.clinical_reason ? ` — ${t.clinical_reason}` : ''}</li>
              ))}
            </ul>
          </Section>
        )}

        {record.notes && (
          <Section title="TREATMENT / RECOMMENDATION:"><p className="whitespace-pre-wrap">{record.notes}</p></Section>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="text-center px-6 py-2 text-[10px]" style={{ borderTop: '1px solid #e5e7eb', color: '#4b5563' }}>
        F. TIMBOL ST. SAN JOSE CONCEPCION TARLAC&nbsp;&nbsp;|&nbsp;&nbsp;TEL. NO. : (045) 6090 368&nbsp;&nbsp;|&nbsp;&nbsp;deamhi@yahoo.com.ph
      </div>
    </div>
  )
}
