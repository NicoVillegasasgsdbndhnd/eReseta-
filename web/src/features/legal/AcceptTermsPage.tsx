import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck, LogOut } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import { useMyTerms, useAcceptTerms } from './queries'
import TermsContent from './TermsContent'

/**
 * Blocking first-login Terms & Privacy acceptance (after the password step). The user cannot reach
 * the app until they accept the current version. Declining logs them out.
 */
export default function AcceptTermsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const { data: terms, isLoading } = useMyTerms()
  const accept = useAcceptTerms()
  const [agreed, setAgreed] = useState(false)

  const onAccept = async () => {
    await accept.mutateAsync()
    if (user) setUser({ ...user, terms_accepted: true }) // unlock the RequireAuth gate
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-slate-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-500">
          <ShieldCheck size={16} className="text-blue-600" /> One more step before you continue
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          {isLoading || !terms ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
          ) : (
            <>
              <div className="max-h-[52vh] overflow-y-auto pr-2">
                <TermsContent terms={terms} />
              </div>

              <label className="mt-6 flex cursor-pointer items-start gap-2.5 rounded-lg bg-slate-50 px-4 py-3" style={{ border: '1px solid hsl(210 18% 90%)' }}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4" />
                <span className="text-sm font-medium text-slate-700">
                  I have read and agree to the Terms &amp; Privacy agreement above.
                </span>
              </label>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
                <button
                  onClick={onAccept}
                  disabled={!agreed || accept.isPending}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {accept.isPending && <Loader2 size={15} className="animate-spin" />}
                  Agree &amp; Continue
                </button>
                <button
                  onClick={() => logout()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <LogOut size={15} /> Decline &amp; sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
