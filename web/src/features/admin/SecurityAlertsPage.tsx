import { ShieldAlert, Loader2, Hammer } from 'lucide-react'
import { useBreakGlassAlerts } from '@/features/records/queries'

const BORDER = '1px solid hsl(210 18% 88%)'

function when(value: string) {
  return new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/**
 * Admin "Security Alerts" — break-the-glass emergency record accesses. Every override an unlinked
 * doctor performs lands here from the append-only audit trail for review (RA 10173 accountability).
 */
export default function SecurityAlertsPage() {
  const { data, isLoading } = useBreakGlassAlerts()
  const alerts = data ?? []

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-2">
        <ShieldAlert size={18} className="text-red-600" />
        <h2 className="text-base font-bold text-slate-800">Security Alerts — Break-Glass Access</h2>
      </div>

      <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800" style={{ border: '1px solid hsl(38 90% 85%)' }}>
        Each entry is an emergency override where a doctor accessed a patient's chart <b>without a care relationship</b>.
        These records are append-only and cannot be deleted. Review them for any misuse.
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: BORDER }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-slate-300" />
          </div>
        ) : alerts.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">No break-glass access recorded.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'hsl(210 18% 90%)' }}>
            {alerts.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <Hammer size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {a.doctor_name ?? 'A doctor'} <span className="font-normal text-slate-500">accessed</span> {a.patient_name ?? `patient #${a.patient_id}`}
                  </p>
                  <p className="mt-0.5 text-xs italic text-slate-600">"{a.reason}"</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Granted {when(a.granted_at)} · expires {when(a.expires_at)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${a.active ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  {a.active ? 'Active' : 'Expired'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
