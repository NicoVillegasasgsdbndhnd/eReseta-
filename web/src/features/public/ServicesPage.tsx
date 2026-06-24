import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, ClipboardList, Pill, ShieldCheck, Stethoscope } from 'lucide-react'

const services = [
  ['Appointment Booking', 'Request visits online without needing an account first.', CalendarDays],
  ['Medical Records', 'Access consultation history and treatment notes after registration.', ClipboardList],
  ['Digital E-Prescriptions', 'Receive doctor-issued prescriptions with blockchain traceability.', Pill],
  ['Doctor Consultations', 'Support in-person DEAMHI consultations with structured clinical records.', Stethoscope],
  ['Pharmacy Verification', 'Verify prescriptions before dispensing at the hospital pharmacy.', ShieldCheck],
]

export default function ServicesPage() {
  return (
    <div className="bg-gradient-to-b from-blue-50 to-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">SERVICES</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Connected hospital services for DEAMHI</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            eReseta+ connects appointment booking, patient records, digital prescriptions, and pharmacy verification in one secure workflow.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map(([title, description, Icon]) => (
            <article key={title as string} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <Icon size={22} />
              </div>
              <h2 className="mt-5 text-lg font-bold text-slate-900">{title as string}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description as string}</p>
            </article>
          ))}
        </div>

        <Link
          to="/book"
          className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-bold text-white transition-colors hover:bg-blue-700"
        >
          Book an appointment
          <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  )
}
