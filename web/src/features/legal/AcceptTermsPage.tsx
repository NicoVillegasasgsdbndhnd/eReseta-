import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck, LogOut, ArrowDown, Check } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import { useMyTerms, useAcceptTerms } from './queries'
import TermsContent from './TermsContent'

type Variant = 'patient' | 'employee' | 'admin'

const ACCENT: Record<Variant, { grad: string; ring: string; soft: string; btn: string; badge: string; label: string }> = {
  patient:  { grad: 'from-blue-600 to-sky-500',     ring: 'ring-blue-500/20',   soft: 'bg-blue-50 text-blue-700',     btn: 'bg-blue-600 hover:bg-blue-700',     badge: 'bg-blue-50 text-blue-700',     label: 'Patient' },
  employee: { grad: 'from-teal-600 to-emerald-500', ring: 'ring-teal-500/20',   soft: 'bg-teal-50 text-teal-700',     btn: 'bg-teal-600 hover:bg-teal-700',     badge: 'bg-teal-50 text-teal-700',     label: 'Clinical / Staff' },
  admin:    { grad: 'from-indigo-600 to-violet-500', ring: 'ring-indigo-500/20', soft: 'bg-indigo-50 text-indigo-700', btn: 'bg-indigo-600 hover:bg-indigo-700', badge: 'bg-indigo-50 text-indigo-700', label: 'Administrator' },
}





export default function AcceptTermsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const { data: terms, isLoading } = useMyTerms()
  const accept = useAcceptTerms()

  const [agreed, setAgreed] = useState(false)
  const [readToEnd, setReadToEnd] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const a = ACCENT[(terms?.variant as Variant) ?? 'patient']

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReadToEnd(true)
  }

  const onAccept = async () => {
    await accept.mutateAsync()
    if (user) setUser({ ...user, terms_accepted: true }) // unlock the RequireAuth gate
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-100 to-slate-50 py-6 sm:py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className={`overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ${a.ring}`}>
          {isLoading || !terms ? (
            <div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin text-slate-300" /></div>
          ) : (
            <>
              {/* Branded, role-tinted header */}
              <div className={`bg-gradient-to-r ${a.grad} px-6 py-6 text-white sm:px-8`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25">
                    <ShieldCheck size={22} />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">eReseta+ · DEAMHI</p>
                    <h1 className="text-lg font-bold leading-tight sm:text-xl">{terms.title}</h1>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-white/20 px-2.5 py-1 font-semibold">{a.label}</span>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium text-white/90">Version {terms.version} · {terms.effective_date}</span>
                </div>
              </div>

              {/* Intro strip */}
              <div className="px-6 pt-5 sm:px-8">
                <p className={`rounded-lg px-3 py-2 text-xs font-medium ${a.soft}`}>
                  Please read the full agreement below and accept it to continue using eReseta+.
                </p>
              </div>

              {/* Scrollable terms */}
              <div className="relative px-6 sm:px-8">
                <div
                  ref={scrollRef}
                  onScroll={onScroll}
                  className="mt-4 max-h-[46vh] overflow-y-auto rounded-xl bg-slate-50 p-4 sm:p-5"
                  style={{ border: '1px solid hsl(210 18% 90%)' }}
                >
                  <TermsContent terms={terms} />
                </div>
                {!readToEnd && (
                  <div className="pointer-events-none absolute inset-x-6 bottom-0 flex justify-center sm:inset-x-8">
                    <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                      <ArrowDown size={12} /> Scroll to read all
                    </span>
                  </div>
                )}
              </div>

              {/* Sticky agree bar */}
              <div className="mt-4 border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
                <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2.5 transition-colors ${readToEnd ? 'bg-slate-50' : 'cursor-not-allowed opacity-60'}`} style={{ border: '1px solid hsl(210 18% 92%)' }}>
                  <input
                    type="checkbox"
                    checked={agreed}
                    disabled={!readToEnd}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    I have read and agree to the Terms &amp; Privacy agreement above.
                    {!readToEnd && <span className="ml-1 text-xs font-normal text-slate-400">(scroll to the end first)</span>}
                  </span>
                </label>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
                  <button
                    onClick={onAccept}
                    disabled={!agreed || accept.isPending}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50 ${a.btn}`}
                  >
                    {accept.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
                    Agree &amp; Continue
                  </button>
                  <button
                    onClick={() => logout()}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <LogOut size={15} /> Decline &amp; sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
