import { useMemo, useState } from 'react'
import { ShieldCheck, ShieldAlert, Loader2, Stethoscope, UserCog, Hammer, Info } from 'lucide-react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useMyConsent, useMyPrivacyLog, useWithdrawMyConsent, type PrivacyLogEntry } from './queries'

const BORDER = '1px solid hsl(210 18% 88%)'

function when(v: string) {
  return new Date(v).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** Map an audit action → how the patient sees it (label, icon, tone). */
function describe(e: PrivacyLogEntry) {
  const basis = e.context ?? ''
  if (e.action === 'BREAK_GLASS') return { label: 'Emergency Break-Glass access', tone: 'danger', icon: Hammer, detail: e.context?.replace(/^Emergency chart access granted \((.*)\)$/, '$1') ?? null }
  if (e.action === 'READ_BREAK_GLASS') return { label: 'Viewed (emergency access)', tone: 'danger', icon: Hammer, detail: null }
  if (e.action === 'CONSENT_GIVEN') return { label: 'DPA consent recorded', tone: 'ok', icon: ShieldCheck, detail: null }
  if (e.action === 'CONSENT_WITHDRAWN') return { label: 'DPA consent withdrawn', tone: 'warn', icon: ShieldAlert, detail: null }
  // plain read — distinguish treatment vs consent basis
  if (basis.includes('treatment')) return { label: 'Viewed for treatment', tone: 'muted', icon: Stethoscope, detail: null }
  if (basis.includes('consent')) return { label: 'Viewed (you consented)', tone: 'muted', icon: UserCog, detail: null }
  return { label: 'Viewed your records', tone: 'muted', icon: UserCog, detail: null }
}

const TONE: Record<string, string> = {
  danger: 'bg-rose-50 text-rose-600',
  ok: 'bg-teal-50 text-teal-700',
  warn: 'bg-amber-50 text-amber-700',
  muted: 'bg-slate-100 text-slate-500',
}

export default function PatientPrivacyPage() {
  const { data: consent, isLoading: consentLoading } = useMyConsent()
  const { data: log, isLoading: logLoading } = useMyPrivacyLog()
  const withdraw = useWithdrawMyConsent()
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)

  const current = consent?.current
  const given = current?.status === 'given'

  // Most recent break-glass, for the alert banner.
  const recentBreakGlass = useMemo(() => (log ?? []).find((e) => e.action === 'BREAK_GLASS'), [log])

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-blue-600" />
        <div>
          <h1 className="text-lg font-bold text-slate-900">Privacy & Data Access</h1>
          <p className="text-sm text-slate-500">See who has accessed your medical records and manage your consent.</p>
        </div>
      </div>

      {/* Emergency alert banner */}
      {recentBreakGlass && (
        <div className="rounded-xl bg-rose-50 p-4" style={{ border: '1px solid hsl(350 80% 88%)' }}>
          <p className="flex items-center gap-2 text-sm font-bold text-rose-700">
            <ShieldAlert size={16} /> Emergency access to your records
          </p>
          <p className="mt-1 text-sm text-rose-700/90">
            <b>{recentBreakGlass.actor_name}</b> accessed your medical records on {when(recentBreakGlass.at)} for emergency care.
          </p>
          {describe(recentBreakGlass).detail && (
            <p className="mt-1 text-xs italic text-rose-600">Reason: "{describe(recentBreakGlass).detail}"</p>
          )}
        </div>
      )}

      {/* Consent card */}
      <div className="rounded-xl bg-white p-5 shadow-sm" style={{ border: BORDER }}>
        <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldCheck size={16} className="text-blue-600" /> Data Privacy Consent
        </p>
        {consentLoading ? (
          <Loader2 size={18} className="mt-3 animate-spin text-slate-300" />
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${given ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                {given ? 'GIVEN' : current?.status === 'withdrawn' ? 'WITHDRAWN' : 'NOT RECORDED'}
              </span>
              {current && (
                <span className="text-xs text-slate-500">
                  {when(current.recorded_at)}{current.recorded_by ? ` · by ${current.recorded_by}` : ''}
                </span>
              )}
            </div>
            <p className="mt-3 flex gap-2 text-xs leading-5 text-slate-500">
              <Info size={14} className="mt-0.5 shrink-0" />
              This controls whether non-doctor hospital staff (e.g. front desk, billing) may view your clinical records.
              Your attending doctors can always access them for your treatment.
            </p>
            {given && (
              <button
                onClick={() => setConfirmWithdraw(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
              >
                <ShieldAlert size={15} /> Withdraw my consent
              </button>
            )}
          </>
        )}
      </div>

      {/* Access log */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: BORDER }}>
        <div className="border-b px-5 py-3.5" style={{ borderColor: 'hsl(210 18% 90%)' }}>
          <p className="text-sm font-bold text-slate-900">Who accessed my records</p>
          <p className="text-xs text-slate-500">A permanent, unalterable record of every access to your medical file.</p>
        </div>
        {logLoading ? (
          <div className="flex items-center justify-center py-14"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
        ) : (log ?? []).length === 0 ? (
          <p className="py-14 text-center text-sm text-slate-500">No access to your records yet.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'hsl(210 18% 92%)' }}>
            {(log ?? []).map((e) => {
              const d = describe(e)
              const Icon = d.icon
              return (
                <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE[d.tone]}`}>
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {e.actor_name}
                      {e.actor_role && <span className="ml-1 text-xs font-normal capitalize text-slate-400">({e.actor_role})</span>}
                    </p>
                    <p className="text-xs text-slate-500">{d.label}</p>
                    {d.detail && <p className="mt-0.5 text-xs italic text-rose-600">"{d.detail}"</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">{when(e.at)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Rights footer */}
      <p className="rounded-xl bg-blue-50 px-4 py-3 text-[11px] leading-5 text-blue-700">
        Under the Data Privacy Act (RA 10173) you may request a copy of your records, ask for corrections, or file a
        complaint with the DEAMHI Data Protection Officer or the National Privacy Commission.
      </p>

      <ConfirmDialog
        open={confirmWithdraw}
        onOpenChange={(o) => !o && setConfirmWithdraw(false)}
        variant="destructive"
        title="Withdraw DPA consent?"
        description="Non-doctor staff will no longer be able to view your clinical records. Your attending doctors keep access for treatment. You can give consent again anytime."
        confirmLabel="Withdraw consent"
        loading={withdraw.isPending}
        onConfirm={() => withdraw.mutate(undefined, { onSuccess: () => setConfirmWithdraw(false) })}
      />
    </div>
  )
}
