import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useMyTerms } from './queries'
import TermsContent from './TermsContent'


export default function TermsReviewPage() {
  const navigate = useNavigate()
  const { data: terms, isLoading } = useMyTerms()

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Back
      </button>
      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        {isLoading || !terms ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
        ) : (
          <>
            <TermsContent terms={terms} />
            {terms.accepted && terms.accepted_at && (
              <p className="mt-6 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                You accepted this agreement on {new Date(terms.accepted_at).toLocaleDateString('en-PH', { dateStyle: 'long' })}.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
