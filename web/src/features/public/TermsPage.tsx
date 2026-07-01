import { Loader2 } from 'lucide-react'
import { usePublicTerms } from '@/features/legal/queries'
import TermsContent from '@/features/legal/TermsContent'

/** Public guest-facing Terms of Service (patient agreement) — linked from the site footer. */
export default function TermsPage() {
  const { data: terms, isLoading } = usePublicTerms()

  return (
    <div className="bg-gradient-to-b from-white to-blue-50">
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Legal</p>
        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm sm:p-8" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          {isLoading || !terms ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
          ) : (
            <TermsContent terms={terms} />
          )}
        </div>
      </section>
    </div>
  )
}
