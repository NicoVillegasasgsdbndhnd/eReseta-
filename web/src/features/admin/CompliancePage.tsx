import { useState } from 'react'
import { ShieldCheck, Loader2, FileCheck2, UserCheck } from 'lucide-react'
import { useConsentRegister, useTermsAcceptanceRegister } from './complianceQueries'

const BORDER = '1px solid hsl(210 18% 88%)'

function when(v: string | null) {
  return v ? new Date(v).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'
}

const STATUS_PILL: Record<string, string> = {
  given: 'bg-teal-50 text-teal-700',
  withdrawn: 'bg-amber-50 text-amber-700',
  none: 'bg-slate-100 text-slate-500',
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm" style={{ border: BORDER }}>
      <p className={`text-2xl font-black tabular-nums ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  )
}

function ConsentRegister() {
  const { data, isLoading } = useConsentRegister()
  const rows = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:max-w-md">
        <Stat label="Consent given" value={data?.summary.given ?? 0} tone="text-teal-600" />
        <Stat label="Withdrawn" value={data?.summary.withdrawn ?? 0} tone="text-amber-600" />
        <Stat label="No consent" value={data?.summary.none ?? 0} tone="text-slate-500" />
      </div>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: BORDER }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">No patients yet.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'hsl(210 18% 92%)' }}>
            {rows.map((r) => (
              <li key={r.patient_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{r.patient_name ?? `Patient #${r.patient_id}`}</p>
                  <p className="text-xs text-slate-400">
                    {r.status === 'none' ? 'No consent on record' : `${when(r.recorded_at)}${r.recorded_by ? ` · by ${r.recorded_by}` : ''}`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_PILL[r.status]}`}>
                  {r.status === 'none' ? 'None' : r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function TermsRegister() {
  const { data, isLoading } = useTermsAcceptanceRegister()
  const rows = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
        <Stat label="Accepted (current)" value={data?.summary.up_to_date ?? 0} tone="text-teal-600" />
        <Stat label="Pending / outdated" value={data?.summary.pending ?? 0} tone="text-amber-600" />
      </div>
      <p className="text-xs text-slate-500">Current version: <b>{data?.current_version ?? '—'}</b></p>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: BORDER }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">No users yet.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'hsl(210 18% 92%)' }}>
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {r.name} <span className="text-xs font-normal capitalize text-slate-400">({r.role ?? '—'})</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.accepted_version ? `Accepted ${r.accepted_version} · ${when(r.accepted_at)}` : 'Never accepted'}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${r.up_to_date ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
                  {r.up_to_date ? 'Up to date' : 'Pending'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}


export default function CompliancePage() {
  const [tab, setTab] = useState<'consent' | 'terms'>('consent')

  const tabBtn = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
      active ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'
    }`

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
          <ShieldCheck size={22} className="text-slate-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Compliance</h1>
          <p className="mt-0.5 text-sm text-slate-500">RA 10173 registers — patient consent and Terms acceptance at a glance (DPO view).</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab('consent')} className={tabBtn(tab === 'consent')} style={{ border: BORDER }}>
          <UserCheck size={15} /> Consent Register
        </button>
        <button onClick={() => setTab('terms')} className={tabBtn(tab === 'terms')} style={{ border: BORDER }}>
          <FileCheck2 size={15} /> Terms Acceptance
        </button>
      </div>

      {tab === 'consent' ? <ConsentRegister /> : <TermsRegister />}
    </div>
  )
}
