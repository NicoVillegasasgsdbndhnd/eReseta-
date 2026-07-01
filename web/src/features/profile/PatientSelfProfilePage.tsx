import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  HeartPulse,
  Home,
  IdCard,
  KeyRound,
  Languages,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react'
import api from '@/lib/api'
import { Input } from '@/components/ui/input'
import PasswordRequirements, { isStrongPassword } from '@/components/common/PasswordRequirements'
import { useMyChart } from '@/features/records/queries'

const fmtDate = (d?: string | null) =>
  d ? new Date(d + (d.length <= 10 ? 'T00:00:00' : '')).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '-'

function value(v: string | number | null | undefined) {
  return v === null || v === undefined || v === '' ? '-' : String(v)
}

function InfoRow({ icon, label, value, danger, mono }: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  danger?: boolean
  mono?: boolean
}) {
  return (
    <div className="grid gap-2 rounded-lg bg-slate-50 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)]" style={{ border: '1px solid hsl(210 18% 92%)' }}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm">
          {icon}
        </span>
        {label}
      </div>
      <div className={`min-w-0 text-sm font-semibold ${danger ? 'text-red-600' : 'text-slate-800'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  )
}

function Section({ title, subtitle, icon, children }: {
  title: string
  subtitle?: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function ChangePasswordSection() {
  const [open, setOpen] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const submit = async () => {
    setError(null)
    if (newPwd !== confirmPwd) { setError('Passwords do not match.'); return }
    if (!isStrongPassword(newPwd)) { setError('Password does not meet all the requirements below.'); return }
    setSaving(true)
    try {
      await api.put('/profile', { password: newPwd, current_password: currentPwd })
      setSaved(true)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); setOpen(false)
      setTimeout(() => setSaved(false), 4000)
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not update password. Check your current password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Account Security" subtitle="Change the password you use to sign in." icon={<Lock size={18} />}>
      {saved && (
        <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={15} /> Password updated.
        </p>
      )}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3.5 py-2 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
        >
          <KeyRound size={15} /> Change Password
        </button>
      ) : (
        <div className="space-y-3 rounded-lg bg-slate-50 p-4" style={{ border: '1px solid hsl(210 18% 92%)' }}>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Current password</label>
            <Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className="h-9 text-sm" autoComplete="current-password" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">New password</label>
            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="h-9 text-sm" autoComplete="new-password" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Confirm new password</label>
            <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="h-9 text-sm" autoComplete="new-password" />
          </div>
          {newPwd.length > 0 && <PasswordRequirements value={newPwd} />}
          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={saving || !currentPwd || !isStrongPassword(newPwd) || newPwd !== confirmPwd}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Update password
            </button>
            <button onClick={() => { setOpen(false); setError(null) }} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">
              Cancel
            </button>
          </div>
        </div>
      )}
    </Section>
  )
}

export default function PatientSelfProfilePage({ patientId }: { patientId: number | string | undefined }) {
  const { data, isLoading } = useMyChart(!!patientId)

  if (!patientId) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-10 text-center shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <p className="text-sm font-semibold text-slate-600">Your patient record is not linked yet.</p>
        <p className="mt-1 text-sm text-slate-500">Please contact staff after your first visit.</p>
      </div>
    )
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
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-10 text-center shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <p className="text-sm font-semibold text-slate-600">Your profile is not available.</p>
      </div>
    )
  }

  const { patient } = data
  const sex = patient.sex === 'male' ? 'Male' : patient.sex === 'female' ? 'Female' : value(patient.sex)
  const allergies = patient.known_allergies || 'No known allergies'

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <div
          className="grid gap-5 p-6 md:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.75fr)]"
          style={{ background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(205 92% 30%) 58%, hsl(152 48% 35%) 100%)' }}
        >
          <div className="min-w-0 text-white">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
              <ShieldCheck size={14} />
              Demographics
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-2xl font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.22)' }}>
                {(patient.name ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-bold leading-tight">{patient.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>Active patient</span>
                  <span className="rounded-full px-2.5 py-1 font-mono text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>{patient.patient_code}</span>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex max-w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}>
                <CalendarDays size={14} />
                {patient.age != null ? `${patient.age} years old` : '-'}
              </span>
              <span className="inline-flex max-w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}>
                <Phone size={14} />
                {value(patient.contact)}
              </span>
              <span className="inline-flex max-w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}>
                <MapPin size={14} />
                <span className="truncate">{value(patient.address)}</span>
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Profile summary</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-2xl font-bold text-slate-900">{value(patient.visits_count)}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Visits</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-2xl font-bold text-slate-900">{value(patient.rx_count)}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Rx</p>
              </div>
            </div>
            <Link
              to="/my-records"
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
            >
              View My Records
            </Link>
          </div>
        </div>
      </div>

      <Section title="Personal Information" subtitle="Basic identity and contact details." icon={<User size={18} />}>
        <InfoRow icon={<User size={14} />} label="Full name" value={value(patient.name)} />
        <InfoRow icon={<Mail size={14} />} label="Email address" value={value(patient.email)} />
        <InfoRow icon={<Phone size={14} />} label="Phone number" value={value(patient.contact)} />
        <InfoRow icon={<CalendarDays size={14} />} label="Date of birth" value={fmtDate(patient.dob)} />
        <InfoRow icon={<IdCard size={14} />} label="Sex" value={sex} />
        <InfoRow icon={<Languages size={14} />} label="Preferred language" value={value(patient.preferred_language)} />
        <InfoRow icon={<Home size={14} />} label="Home address" value={value(patient.address)} />
      </Section>

      <Section title="Health Safety" subtitle="High-signal patient safety information." icon={<HeartPulse size={18} />}>
        <InfoRow
          icon={patient.known_allergies ? <AlertCircle size={14} /> : <ShieldCheck size={14} />}
          label="Known allergies"
          value={allergies}
          danger={!!patient.known_allergies}
        />
      </Section>

      <Section title="Government & Insurance" subtitle="Verification details used by staff during visits." icon={<CreditCard size={18} />}>
        <InfoRow icon={<CreditCard size={14} />} label="PhilHealth No." value={value(patient.philhealth_no)} mono />
        <InfoRow icon={<ShieldCheck size={14} />} label="HMO provider" value={value(patient.hmo_provider)} />
        <InfoRow icon={<IdCard size={14} />} label="Policy No." value={value(patient.hmo_policy_no)} mono />
        <InfoRow icon={<IdCard size={14} />} label="HMO group No." value={value(patient.hmo_group_no)} mono />
        <InfoRow icon={<CreditCard size={14} />} label="Copay" value={value(patient.copay)} />
        <InfoRow icon={<IdCard size={14} />} label="Government ID type" value={value(patient.gov_id_type)} />
        <InfoRow icon={<IdCard size={14} />} label="Government ID No." value={value(patient.gov_id_no)} mono />
      </Section>

      <Section title="Emergency Contact" subtitle="Who the hospital should contact when needed." icon={<Users size={18} />}>
        <InfoRow icon={<User size={14} />} label="Contact person" value={value(patient.emergency_contact_name)} />
        <InfoRow icon={<Users size={14} />} label="Relationship" value={value(patient.emergency_contact_relation)} />
        <InfoRow icon={<Phone size={14} />} label="Contact number" value={value(patient.emergency_contact_phone)} />
      </Section>

      <ChangePasswordSection />

      <p className="text-xs text-slate-400">Registered {fmtDate(patient.registered_at)}</p>
    </div>
  )
}
