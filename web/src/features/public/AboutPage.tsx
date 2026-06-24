import { Link } from 'react-router-dom'
import { ArrowRight, Hospital, MapPin, ShieldCheck } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="bg-gradient-to-b from-white to-blue-50">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_0.85fr] lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">ABOUT DEAMHI</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">A trusted community hospital experience, made easier online</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            eReseta+ supports DEAMHI Hospital in Cainta, Rizal by simplifying outpatient appointments, patient records, and digital prescription verification.
          </p>
          <div className="mt-8 grid gap-4 text-sm text-slate-600">
            <p className="flex gap-3"><Hospital className="shrink-0 text-blue-600" size={20} /> Hospital workflows for patients, doctors, pharmacists, staff, and administrators.</p>
            <p className="flex gap-3"><MapPin className="shrink-0 text-blue-600" size={20} /> Serving the DEAMHI community in Cainta, Rizal.</p>
            <p className="flex gap-3"><ShieldCheck className="shrink-0 text-blue-600" size={20} /> Privacy-aware system design aligned with RA 10173.</p>
          </div>
          <Link
            to="/book"
            className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-bold text-white transition-colors hover:bg-blue-700"
          >
            Book an appointment
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Contact placeholder</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Replace this panel with final DEAMHI contact numbers, clinic hours, location map, and support email before production release.
          </p>
        </div>
      </section>
    </div>
  )
}
