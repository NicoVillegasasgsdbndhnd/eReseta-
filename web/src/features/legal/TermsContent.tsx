import type { Terms } from './queries'


export default function TermsContent({ terms }: { terms: Terms }) {
  return (
    <div>
      <p className="text-sm leading-6 text-slate-600">{terms.intro}</p>
      <div className="mt-5 space-y-4">
        {terms.sections.map((s) => (
          <section key={s.heading} className="border-l-2 border-slate-100 pl-4">
            <h3 className="text-sm font-bold text-slate-800">{s.heading}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{s.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-6 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
        Version {terms.version} · Effective {terms.effective_date}
      </p>
    </div>
  )
}
