import type { Terms } from './queries'

/** Renders the title, intro, and sections of a Terms agreement (shared by all placements). */
export default function TermsContent({ terms }: { terms: Terms }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">{terms.title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{terms.intro}</p>
      <div className="mt-5 space-y-4">
        {terms.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-sm font-bold text-slate-800">{s.heading}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{s.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-6 text-[11px] uppercase tracking-wide text-slate-400">Version {terms.version}</p>
    </div>
  )
}
