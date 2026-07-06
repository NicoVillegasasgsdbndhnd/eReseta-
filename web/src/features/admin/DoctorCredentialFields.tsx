import { Input } from '@/components/ui/input'





export interface DoctorFields {
  specialization: string
  license_no: string
  prc_expiry: string
  ptr_no: string
  s2_license: string
  signature: string
  suffix: string
  gender: string
  date_of_birth: string
  corporate_email: string
  secure_phone: string
  secretary_phone: string
  clinic_email: string
  trunkline_ext: string
  philhealth_accreditation: string
  tin: string
  hospital_department: string
  consultant_type: string
  clinic_room_no: string
  medical_society_affiliations: string[]
  hmo_partners: string[]
  clinic_available_days: string[]
  consultation_fee: string
  followup_fee: string
  inpatient_fee: string
  er_referral_fee: string
}

export const emptyDoctorFields = (): DoctorFields => ({
  specialization: '', license_no: '', prc_expiry: '', ptr_no: '', s2_license: '', signature: '',
  suffix: '', gender: '', date_of_birth: '', corporate_email: '', secure_phone: '',
  secretary_phone: '', clinic_email: '', trunkline_ext: '', philhealth_accreditation: '', tin: '',
  hospital_department: '', consultant_type: '', clinic_room_no: '',
  medical_society_affiliations: [], hmo_partners: [], clinic_available_days: [],
  consultation_fee: '', followup_fee: '', inpatient_fee: '', er_referral_fee: '',
})


export function doctorFieldsFromUser(d: NonNullable<import('@/mocks/types').User['doctor']>): DoctorFields {
  const num = (v: string | number | null | undefined) => (v == null ? '' : String(v))
  return {
    specialization: d.specialization ?? '', license_no: d.license_no ?? '', prc_expiry: d.prc_expiry ?? '',
    ptr_no: d.ptr_no ?? '', s2_license: d.s2_license ?? '', signature: d.signature ?? '',
    suffix: d.suffix ?? '', gender: d.gender ?? '', date_of_birth: d.date_of_birth ?? '',
    corporate_email: d.corporate_email ?? '', secure_phone: d.secure_phone ?? '',
    secretary_phone: d.secretary_phone ?? '', clinic_email: d.clinic_email ?? '',
    trunkline_ext: d.trunkline_ext ?? '', philhealth_accreditation: d.philhealth_accreditation ?? '',
    tin: d.tin ?? '', hospital_department: d.hospital_department ?? '',
    consultant_type: d.consultant_type ?? '', clinic_room_no: d.clinic_room_no ?? '',
    medical_society_affiliations: d.medical_society_affiliations ?? [],
    hmo_partners: d.hmo_partners ?? [], clinic_available_days: d.clinic_available_days ?? [],
    consultation_fee: num(d.consultation_fee), followup_fee: num(d.followup_fee),
    inpatient_fee: num(d.inpatient_fee), er_referral_fee: num(d.er_referral_fee),
  }
}


export function doctorPayload(f: DoctorFields): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const str: (keyof DoctorFields)[] = [
    'specialization', 'license_no', 'prc_expiry', 'ptr_no', 's2_license', 'signature', 'suffix',
    'date_of_birth', 'corporate_email', 'secure_phone', 'secretary_phone', 'clinic_email',
    'trunkline_ext', 'philhealth_accreditation', 'tin', 'hospital_department', 'consultant_type',
    'clinic_room_no',
  ]
  for (const k of str) { const v = f[k] as string; if (v) out[k] = v }
  const fees: (keyof DoctorFields)[] = ['consultation_fee', 'followup_fee', 'inpatient_fee', 'er_referral_fee']
  for (const k of fees) { const v = f[k] as string; if (v !== '') out[k] = v }
  if (f.medical_society_affiliations.length) out.medical_society_affiliations = f.medical_society_affiliations
  if (f.hmo_partners.length) out.hmo_partners = f.hmo_partners
  if (f.clinic_available_days.length) out.clinic_available_days = f.clinic_available_days
  return out
}

const SUFFIXES = ['MD', 'DO', 'DDS', 'PhD', 'None']
const DEPARTMENTS = ['Internal Medicine', 'Pediatrics', 'Surgery', 'OB-GYN', 'ER', 'Family Medicine', 'Cardiology', 'Orthopedics']
const CONSULTANT_TYPES = ['Active Consultant', 'Visiting Consultant', 'Resident', 'Fellow']
const SOCIETIES = ['PMA', 'PPS', 'PCP', 'PCS', 'POGS', 'PSGS', 'PCR']
const HMOS = ['Maxicare', 'Medicard', 'Intellicare', 'Caritas', 'PhilHealth', 'Cocolife', 'ValuCare']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const labelCls = 'text-xs font-semibold text-slate-500 uppercase tracking-wide'
const selectCls = 'w-full h-10 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-teal-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className={labelCls}>{label}</label>{children}</div>
}

function CheckGroup({ label, options, selected, onToggle }: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                on ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface Props {
  value: DoctorFields
  onChange: (patch: Partial<DoctorFields>) => void

  hideTin?: boolean
}

export default function DoctorCredentialFields({ value, onChange, hideTin = false }: Props) {
  const v = value
  const set = (patch: Partial<DoctorFields>) => onChange(patch)
  const toggle = (key: 'medical_society_affiliations' | 'hmo_partners' | 'clinic_available_days', opt: string) => {
    const cur = v[key]
    set({ [key]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] } as Partial<DoctorFields>)
  }

  return (
    <div className="space-y-5">
      {/* Identity & Specialization */}
      <div>
        <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">Identity &amp; Specialization</p>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Specialization">
            <Input className="border-slate-200 text-sm bg-white" placeholder="e.g. Internal Medicine"
              value={v.specialization} onChange={(e) => set({ specialization: e.target.value })} />
          </Field>
          <Field label="Suffix / Title">
            <select className={selectCls} value={v.suffix} onChange={(e) => set({ suffix: e.target.value })}>
              <option value="">Select…</option>
              {SUFFIXES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          {/* Gender is captured once at the account level (top of the form), not here. */}
          <Field label="Date of Birth">
            <Input type="date" className="border-slate-200 text-sm bg-white"
              value={v.date_of_birth} onChange={(e) => set({ date_of_birth: e.target.value })} />
          </Field>
          <Field label="Hospital Department">
            <select className={selectCls} value={v.hospital_department} onChange={(e) => set({ hospital_department: e.target.value })}>
              <option value="">Select…</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Consultant Type">
            <select className={selectCls} value={v.consultant_type} onChange={(e) => set({ consultant_type: e.target.value })}>
              <option value="">Select…</option>
              {CONSULTANT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Government Licensing & Credentials */}
      <div>
        <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">Government Licensing &amp; Credentials</p>
        <div className="grid grid-cols-3 gap-4">
          <Field label="PRC License No."><Input className="border-slate-200 text-sm bg-white" value={v.license_no} onChange={(e) => set({ license_no: e.target.value })} /></Field>
          <Field label="PRC Expiry Date"><Input type="date" className="border-slate-200 text-sm bg-white" value={v.prc_expiry} onChange={(e) => set({ prc_expiry: e.target.value })} /></Field>
          <Field label="PhilHealth Accreditation (PAN)"><Input className="border-slate-200 text-sm bg-white" value={v.philhealth_accreditation} onChange={(e) => set({ philhealth_accreditation: e.target.value })} /></Field>
          <Field label="PDEA S2 License No."><Input className="border-slate-200 text-sm bg-white" placeholder="For controlled drugs" value={v.s2_license} onChange={(e) => set({ s2_license: e.target.value })} /></Field>
          <Field label="PTR No."><Input className="border-slate-200 text-sm bg-white" placeholder="Professional Tax Receipt" value={v.ptr_no} onChange={(e) => set({ ptr_no: e.target.value })} /></Field>
          {!hideTin && (
            <Field label="TIN (Admin only)"><Input className="border-slate-200 text-sm bg-white" placeholder="Tax Identification No." value={v.tin} onChange={(e) => set({ tin: e.target.value })} /></Field>
          )}
        </div>
      </div>

      {/* Contact */}
      <div>
        <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">Contact</p>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Corporate Email"><Input type="email" className="border-slate-200 text-sm bg-white" value={v.corporate_email} onChange={(e) => set({ corporate_email: e.target.value })} /></Field>
          <Field label="Secure Phone"><Input className="border-slate-200 text-sm bg-white" value={v.secure_phone} onChange={(e) => set({ secure_phone: e.target.value })} /></Field>
          <Field label="Secretary's Phone"><Input className="border-slate-200 text-sm bg-white" value={v.secretary_phone} onChange={(e) => set({ secretary_phone: e.target.value })} /></Field>
          <Field label="Clinic Email"><Input type="email" className="border-slate-200 text-sm bg-white" value={v.clinic_email} onChange={(e) => set({ clinic_email: e.target.value })} /></Field>
          <Field label="Trunkline Ext / Local"><Input className="border-slate-200 text-sm bg-white" value={v.trunkline_ext} onChange={(e) => set({ trunkline_ext: e.target.value })} /></Field>
          <Field label="Clinic Room No."><Input className="border-slate-200 text-sm bg-white" value={v.clinic_room_no} onChange={(e) => set({ clinic_room_no: e.target.value })} /></Field>
        </div>
      </div>

      {/* Affiliations */}
      <div className="space-y-4">
        <p className="text-xs font-bold text-teal-700 uppercase tracking-wide">Affiliations &amp; Schedule</p>
        <CheckGroup label="Medical Society Affiliations" options={SOCIETIES} selected={v.medical_society_affiliations} onToggle={(o) => toggle('medical_society_affiliations', o)} />
        <CheckGroup label="HMO / Insurance Partners" options={HMOS} selected={v.hmo_partners} onToggle={(o) => toggle('hmo_partners', o)} />
        <CheckGroup label="Clinic Available Days" options={DAYS} selected={v.clinic_available_days} onToggle={(o) => toggle('clinic_available_days', o)} />
      </div>

      {/* Fees */}
      <div>
        <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">Professional Fees (₱)</p>
        <div className="grid grid-cols-4 gap-4">
          <Field label="Consultation"><Input type="number" min={0} step="0.01" className="border-slate-200 text-sm bg-white" value={v.consultation_fee} onChange={(e) => set({ consultation_fee: e.target.value })} /></Field>
          <Field label="Follow-up"><Input type="number" min={0} step="0.01" className="border-slate-200 text-sm bg-white" value={v.followup_fee} onChange={(e) => set({ followup_fee: e.target.value })} /></Field>
          <Field label="Inpatient / Day"><Input type="number" min={0} step="0.01" className="border-slate-200 text-sm bg-white" value={v.inpatient_fee} onChange={(e) => set({ inpatient_fee: e.target.value })} /></Field>
          <Field label="ER Referral"><Input type="number" min={0} step="0.01" className="border-slate-200 text-sm bg-white" value={v.er_referral_fee} onChange={(e) => set({ er_referral_fee: e.target.value })} /></Field>
        </div>
      </div>

      {/* Signature (e-signature text; file upload handled separately) */}
      <Field label="Signature (printed name / e-signature)">
        <Input className="border-slate-200 text-sm bg-white" placeholder="Shown on the Hospital Rx, e.g. Juan D. Cruz, M.D."
          value={v.signature} onChange={(e) => set({ signature: e.target.value })} />
      </Field>
    </div>
  )
}
