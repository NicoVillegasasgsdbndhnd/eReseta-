import { Link } from 'react-router-dom'
import {
  CalendarCheck, FileText, ShieldCheck, Stethoscope, ArrowRight,
  Search, ClipboardList, UserCheck, Loader2,
} from 'lucide-react'
import { usePublicDoctors } from './queries'
import { avatarColor, initial } from '@/lib/avatar'

const BLUE = 'hsl(201 100% 36%)'

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`max-w-6xl mx-auto px-6 ${className}`}>{children}</section>
}

const SERVICES = [
  { icon: CalendarCheck, title: 'Appointment Scheduling', desc: 'Request a visit with the right doctor online — no account needed to start.' },
  { icon: FileText, title: 'Patient Records', desc: 'Your history, consultations, and results in one secure, organized chart.' },
  { icon: ShieldCheck, title: 'Digital E-Prescription', desc: 'Tamper-evident prescriptions traced on a private blockchain ledger.' },
]

const STEPS = [
  { icon: Search, title: 'Browse doctors', desc: 'Find a specialist that fits your needs.' },
  { icon: ClipboardList, title: 'Request an appointment', desc: 'Submit a few details — no account required.' },
  { icon: UserCheck, title: 'Visit the clinic', desc: 'Our staff confirm your schedule and welcome you.' },
  { icon: FileText, title: 'Get your account', desc: 'Access records and e-prescriptions after your first visit.' },
]

export default function HomePage() {
  const { data: doctors, isLoading } = usePublicDoctors()
  const featured = (doctors ?? []).slice(0, 4)

  return (
    <div>
      {/* Hero */}
      <Section className="pt-16 pb-14 text-center">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-5"
          style={{ backgroundColor: 'hsl(201 60% 95%)', color: 'hsl(201 100% 30%)' }}
        >
          <Stethoscope size={13} /> DEAMHI · Trusted community care
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: 'hsl(215 30% 14%)' }}>
          Modern, secure healthcare<br className="hidden sm:block" /> at DEAMHI
        </h1>
        <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Book an appointment with our doctors in minutes. After your first visit, get full online
          access to your records and blockchain-secured e-prescriptions.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/book"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
            style={{ backgroundColor: BLUE }}
          >
            Book an Appointment <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-semibold px-6 py-3 rounded-xl bg-white hover:bg-slate-50 transition-colors"
            style={{ border: '1px solid hsl(210 18% 88%)', color: 'hsl(215 30% 20%)' }}
          >
            Log in
          </Link>
        </div>
      </Section>

      {/* Trust strip */}
      <div style={{ borderTop: '1px solid hsl(210 18% 90%)', borderBottom: '1px solid hsl(210 18% 90%)', backgroundColor: 'white' }}>
        <Section className="py-4">
          <p className="text-center text-sm text-slate-500 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} style={{ color: BLUE }} /> RA 10173 compliant</span>
            <span className="text-slate-300">·</span>
            <span>Blockchain-secured prescriptions</span>
            <span className="text-slate-300">·</span>
            <span>DEAMHI Inc.</span>
          </p>
        </Section>
      </div>

      {/* Services */}
      <Section className="py-16">
        <h2 className="text-2xl font-bold text-center mb-2" style={{ color: 'hsl(215 30% 14%)' }}>What we offer</h2>
        <p className="text-center text-slate-500 mb-10">Three connected modules, one seamless experience.</p>
        <div className="grid gap-5 sm:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.title} className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid hsl(210 18% 88%)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'hsl(201 60% 95%)' }}>
                <s.icon size={20} style={{ color: BLUE }} />
              </div>
              <h3 className="font-semibold mb-1.5" style={{ color: 'hsl(215 30% 14%)' }}>{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Featured doctors */}
      <div style={{ backgroundColor: 'white', borderTop: '1px solid hsl(210 18% 90%)', borderBottom: '1px solid hsl(210 18% 90%)' }}>
        <Section className="py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'hsl(215 30% 14%)' }}>Meet our doctors</h2>
              <p className="text-slate-500 mt-1">Experienced specialists ready to care for you.</p>
            </div>
            <Link to="/doctors" className="text-sm font-semibold inline-flex items-center gap-1 shrink-0" style={{ color: BLUE }}>
              View all <ArrowRight size={15} />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300" /></div>
          ) : featured.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Doctor profiles coming soon.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((d, i) => {
                const c = avatarColor(i)
                return (
                  <Link
                    key={d.id}
                    to={`/book?doctor=${d.id}`}
                    className="rounded-xl p-5 text-center hover:shadow-md transition-shadow"
                    style={{ border: '1px solid hsl(210 18% 88%)' }}
                  >
                    <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-xl font-bold" style={{ backgroundColor: c.bg, color: c.fg }}>
                      {initial(d.name)}
                    </div>
                    <p className="font-semibold mt-3 truncate" style={{ color: 'hsl(215 30% 14%)' }}>{d.name}</p>
                    <p className="text-xs text-slate-500 truncate">{d.specialization}</p>
                  </Link>
                )
              })}
            </div>
          )}
        </Section>
      </div>

      {/* How it works */}
      <Section className="py-16">
        <h2 className="text-2xl font-bold text-center mb-10" style={{ color: 'hsl(215 30% 14%)' }}>How it works</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="text-center">
              <div className="relative w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: 'hsl(201 60% 95%)' }}>
                <s.icon size={20} style={{ color: BLUE }} />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-[11px] font-bold flex items-center justify-center" style={{ backgroundColor: BLUE }}>
                  {i + 1}
                </span>
              </div>
              <h3 className="font-semibold mt-3" style={{ color: 'hsl(215 30% 14%)' }}>{s.title}</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* About / CTA */}
      <Section className="pb-20">
        <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: 'hsl(201 100% 36%)' }}>
          <h2 className="text-2xl font-bold text-white">Ready to see a doctor?</h2>
          <p className="text-white/80 mt-2 max-w-xl mx-auto">
            Submit an appointment request now — it only takes a minute and you don't need an account.
          </p>
          <Link
            to="/book"
            className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl mt-6 bg-white hover:opacity-90 transition-opacity"
            style={{ color: BLUE }}
          >
            Book an Appointment <ArrowRight size={16} />
          </Link>
        </div>
      </Section>
    </div>
  )
}
