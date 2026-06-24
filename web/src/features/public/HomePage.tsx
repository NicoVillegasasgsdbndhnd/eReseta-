import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Hospital,
  LockKeyhole,
  Pill,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react'

function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </section>
  )
}

function SectionHeader({
  label,
  title,
  subtitle,
  centered = true,
}: {
  label?: string
  title: string
  subtitle?: string
  centered?: boolean
}) {
  return (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      {label && <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{label}</p>}
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{subtitle}</p>}
    </div>
  )
}

function ImageSlot({
  src,
  alt,
  className = '',
  children,
}: {
  src: string
  alt: string
  className?: string
  children?: React.ReactNode
}) {
  const [hasError, setHasError] = useState(false)

  return (
    <div className={`relative w-full max-w-full overflow-hidden rounded-xl bg-slate-200 shadow-lg ring-1 ring-slate-900/5 ${className}`}>
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-blue-50 via-sky-50 to-slate-200" aria-hidden="true" />
      {children}
      {!hasError && (
        <img
          src={src}
          alt={alt}
          loading={src.includes('hero') ? 'eager' : 'lazy'}
          onError={() => setHasError(true)}
          className="relative z-10 h-full w-full rounded-xl object-cover"
        />
      )}
      {hasError && (
        <div className="relative z-10 flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-blue-200 bg-gradient-to-br from-blue-50 via-white to-sky-50 px-4 text-center text-sm font-semibold text-slate-500 sm:min-h-56 sm:px-6">
          Image placeholder: {alt}
        </div>
      )}
    </div>
  )
}

const services = [
  {
    icon: CalendarDays,
    title: 'Appointment Booking',
    description: 'Request a visit with any DEAMHI physician online - no phone calls, no queues. Choose your doctor, date, and time slot.',
    tag: 'For patients',
  },
  {
    icon: ClipboardList,
    title: 'Medical Records Access',
    description: 'View your full consultation history, diagnoses, and treatment notes from any device. Private and always available.',
    tag: 'For patients',
  },
  {
    icon: Pill,
    title: 'Digital E-Prescriptions',
    description: 'Doctors issue prescriptions digitally - tamper-proof and verified on Hyperledger Fabric before dispensing at the DEAMHI pharmacy.',
    tag: 'Blockchain-secured',
  },
  {
    icon: Stethoscope,
    title: 'Doctor Consultations',
    description: 'In-person consultations with DEAMHI physicians. Doctors record findings and notes directly into the system during your visit.',
    tag: 'In-person',
  },
  {
    icon: ShieldCheck,
    title: 'Pharmacy Verification',
    description: 'DEAMHI pharmacists verify every prescription on the blockchain before dispensing - reducing errors and supporting safer care.',
    tag: 'For pharmacists',
  },
  {
    icon: BarChart3,
    title: 'Hospital Administration',
    description: 'Administrators manage users, generate reports, and monitor system health from a dedicated admin dashboard.',
    tag: 'For admin',
  },
]

const processSteps = [
  ['Book online', 'Choose your doctor, pick a date and time, and submit your request in minutes.'],
  ['Doctor confirms', 'Your doctor reviews and approves. You get notified once confirmed.'],
  ['Visit DEAMHI', 'Attend your consultation. Your doctor records findings directly into the system.'],
  ['Get your Rx', 'Receive a blockchain-verified prescription. Pick it up at the DEAMHI pharmacy safely.'],
]

const featureRows = [
  {
    label: 'FOR PATIENTS',
    title: 'Your health records, appointments, and prescriptions - in one place',
    body: 'No more paper records or missed prescriptions. eReseta+ gives every DEAMHI patient a personal health portal they can access anytime.',
    checks: ['Book without calling', 'View past consultations', 'Track active prescriptions'],
    src: '/images/patient-dashboard.jpg',
    alt: 'Patient dashboard',
    reverse: false,
    comment: 'TODO: Screenshot of patient dashboard or patient using phone in hospital',
  },
  {
    label: 'FOR DOCTORS',
    title: 'Manage your patients, consultations, and prescriptions digitally',
    body: 'Physicians get a clear daily overview - pending approvals, patient queue, consultation history, and digital prescription issuance.',
    checks: ['Approve appointments instantly', 'Record consultation notes', 'Issue blockchain-verified Rx'],
    src: '/images/doctor-dashboard.jpg',
    alt: 'Doctor dashboard',
    reverse: true,
    comment: 'TODO: Screenshot of doctor dashboard or doctor using computer at desk',
  },
  {
    label: 'BLOCKCHAIN-SECURED',
    title: 'Every prescription verified on Hyperledger Fabric',
    body: 'All prescriptions are recorded on a private blockchain - tamper-proof, auditable, and compliant with RA 10173. Pharmacists verify instantly before dispensing.',
    checks: ['Immutable records cannot be altered', 'Pharmacist verification required', 'RA 10173 compliant audit trail'],
    src: '/images/pharmacy-verify.jpg',
    alt: 'Pharmacy verification',
    reverse: false,
    comment: 'TODO: Photo of pharmacist at counter, or pharmacy interior at DEAMHI',
  },
]

const roleCards = [
  {
    icon: Stethoscope,
    role: 'Patients',
    description: 'Book visits, view records, and track prescriptions from home.',
    features: 'Appointment booking | Prescription history | Consultation records',
  },
  {
    icon: Activity,
    role: 'Doctors',
    description: 'Manage appointments, consultations, and issue digital Rx.',
    features: 'Appointment approvals | Clinical notes | Digital prescriptions',
  },
  {
    icon: Pill,
    role: 'Pharmacists',
    description: 'Verify blockchain prescriptions and manage dispensing queue.',
    features: 'Verify queue | Blockchain check | Dispense history',
  },
  {
    icon: ClipboardList,
    role: 'Staff & Admin',
    description: 'Schedule appointments, manage users, and view reports.',
    features: 'Appointment scheduling | User management | Reports',
  },
]

const stats = [
  ['5+', 'User roles supported'],
  ['100%', 'Blockchain-verified prescriptions'],
  ['RA 10173', 'Data privacy compliant'],
  ['DEAMHI', 'Hospital, Cainta, Rizal'],
]

const faqs = [
  {
    question: 'Do I need an account to book an appointment?',
    answer: 'No. You can request an appointment as a guest. Staff register your patient account after your first visit so the record starts with verified hospital intake.',
  },
  {
    question: 'How do blockchain prescriptions work?',
    answer: 'The system records prescription lifecycle events on a private Hyperledger Fabric ledger. It acts like a tamper-evident log so pharmacists can verify the prescription before dispensing.',
  },
  {
    question: 'How long does doctor approval take?',
    answer: 'Staff and doctors review requests based on clinic availability. Once approved, your requested slot becomes a scheduled appointment and you receive the confirmation details.',
  },
  {
    question: 'How is my data protected under RA 10173?',
    answer: 'Personal health information stays in the secured hospital database with role-based access. The blockchain layer stores no patient names, addresses, or PhilHealth numbers.',
  },
  {
    question: 'How do I pick up medicine after consultation?',
    answer: 'After the doctor issues a digital prescription, the DEAMHI pharmacy verifies it in the system before dispensing your medication safely.',
  },
  {
    question: 'Can I cancel or reschedule appointments?',
    answer: 'Yes. Appointment changes are handled through the appointment flow. Staff and doctors can help confirm the next available slot based on the clinic schedule.',
  },
]

function HeroSection() {
  return (
    <div className="w-full overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#eff6ff_30%,#ffffff_64%)]">
      <Section className="grid items-center gap-8 py-10 sm:gap-12 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:pt-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600 shadow-sm">
            <Stethoscope size={15} />
            DEAMHI - Trusted community care
          </span>
          <h1 className="mt-6 max-w-4xl text-3xl font-bold tracking-tight text-slate-950 sm:mt-7 sm:text-6xl">
            A calmer digital front door for hospital care
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8">
            Book a DEAMHI visit without creating an account first, then continue with secure records and blockchain-verified prescriptions after your consultation.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
            <Link
              to="/book"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
            >
              <CalendarDays size={18} />
              Book an appointment
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-blue-100 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-blue-50"
            >
              Log in to your account
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">No account needed to book - Register after your first visit</p>

          <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-3">
            {[
              ['Guest-first', 'Request a slot before registration'],
              ['Private by role', 'Patients, doctors, staff, pharmacy'],
              ['Rx verified', 'Ledger-backed prescription events'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-blue-100 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-sm font-bold text-slate-900">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-w-0">
          <div className="absolute left-0 top-10 h-32 w-32 rounded-full bg-blue-200/40 blur-3xl sm:-left-8 sm:h-48 sm:w-48" aria-hidden="true" />
          <div className="absolute bottom-8 right-0 h-36 w-36 rounded-full bg-sky-200/50 blur-3xl sm:-right-8 sm:h-56 sm:w-56" aria-hidden="true" />
          <div className="relative rounded-2xl border border-white/80 bg-white/85 p-2 shadow-2xl shadow-blue-950/10 backdrop-blur sm:rounded-[2rem] sm:p-4">
            <ImageSlot src="/images/hero-hospital.jpg" alt="DEAMHI Hospital" className="aspect-[4/3] rounded-2xl">
              {/* TODO: Replace with actual DEAMHI hospital or consultation photo */}
            </ImageSlot>
            <div className="absolute left-0 top-10 z-30 hidden -translate-x-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:block">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Today</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">12</p>
              <p className="text-xs text-slate-500">appointment requests</p>
            </div>
            <div className="absolute bottom-8 right-0 z-30 hidden translate-x-6 rounded-2xl border border-blue-100 bg-blue-600 p-4 text-white shadow-xl lg:block">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-100">Prescription</p>
              <p className="mt-1 text-sm font-bold">Blockchain verified</p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}

function TrustBar() {
  const items = [
    [LockKeyhole, 'RA 10173 compliant'],
    [ShieldCheck, 'Blockchain-secured prescriptions'],
    [Hospital, 'DEAMHI Hospital, Cainta, Rizal'],
    [Users, '5 user roles supported'],
  ]

  return (
    <div className="w-full overflow-x-hidden border-y border-slate-200 bg-white">
      <Section className="py-4">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-sm font-medium text-slate-600">
          {items.map(([Icon, label], index) => (
            <div key={label as string} className="flex items-center gap-4">
              <span className="inline-flex items-center gap-2">
                <Icon size={17} className="text-blue-600" />
                {label as string}
              </span>
              {index < items.length - 1 && <span className="hidden text-slate-300 sm:inline">.</span>}
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function ServicesSection() {
  return (
      <Section id="services" className="py-12 sm:py-24">
      <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <SectionHeader
          label="OUR SERVICES"
          title="Care workflows connected end to end"
          subtitle="From first booking to pharmacy verification, eReseta+ keeps the hospital journey organized, traceable, and easier to follow."
          centered={false}
        />
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
          <p className="text-sm font-semibold leading-6 text-slate-700">
            Built for the real DEAMHI flow: guests request visits first, staff validate intake, doctors consult in person, and pharmacy verifies the final prescription trail.
          </p>
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:mt-12 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <article
            key={service.title}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <service.icon size={22} />
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-900">{service.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{service.description}</p>
            <span className="mt-5 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {service.tag}
            </span>
          </article>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/5 sm:mt-12 sm:rounded-[1.5rem] sm:p-3">
        <ImageSlot src="/images/services-banner.jpg" alt="DEAMHI Hospital Services" className="aspect-[4/3] sm:aspect-[21/6] sm:min-h-48">
          {/* TODO: Replace with DEAMHI hospital building or services photo */}
        </ImageSlot>
      </div>
    </Section>
  )
}

function HowItWorks() {
  return (
    <div className="w-full overflow-x-hidden bg-slate-50">
      <Section className="py-16 sm:py-20">
        <SectionHeader label="SIMPLE PROCESS" title="How it works" subtitle="From booking to consultation in 4 easy steps." />
        <div className="relative mt-12 grid gap-5 md:grid-cols-4">
          <div className="absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-slate-200 md:block" aria-hidden="true" />
          {processSteps.map(([title, description], index) => (
            <article key={title} className="relative rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-base font-bold text-white shadow-sm ring-4 ring-blue-100">
                {index + 1}
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-900">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}

function FeatureSplitRows() {
  return (
    <div className="w-full overflow-x-hidden bg-white">
      {featureRows.map((row) => (
        <Section key={row.title} className="border-b border-slate-100 py-12 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className={`rounded-3xl p-2 ${row.reverse ? 'lg:order-2' : ''}`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{row.label}</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{row.title}</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">{row.body}</p>
              <div className="mt-6 grid gap-3">
                {row.checks.map((check) => (
                  <div key={check} className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                      <Check size={14} />
                    </span>
                    {check}
                  </div>
                ))}
              </div>
            </div>
            <div className={`min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-xl shadow-slate-900/5 sm:rounded-[1.5rem] sm:p-3 ${row.reverse ? 'lg:order-1' : ''}`}>
              <ImageSlot src={row.src} alt={row.alt} className="aspect-[4/3] rounded-2xl">
                {/* {row.comment} */}
              </ImageSlot>
            </div>
          </div>
        </Section>
      ))}
    </div>
  )
}

function WhoIsItFor() {
  return (
    <div className="w-full overflow-x-hidden bg-slate-950">
      <Section className="py-12 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">Built for every role at DEAMHI</h2>
          <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">One platform, five distinct experiences.</p>
        </div>
        <div className="mx-auto mt-8 max-w-5xl sm:mt-10">
          <ImageSlot src="/images/deamhi-team.jpg" alt="DEAMHI medical team" className="aspect-[4/3] sm:aspect-[16/5] sm:min-h-48">
            {/* TODO: Group photo of DEAMHI medical staff or team */}
          </ImageSlot>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {roleCards.map((card) => (
            <article
              key={card.role}
              className="rounded-xl border border-white/10 bg-white/[0.06] p-6 transition-colors hover:border-blue-300/40 hover:bg-white/10"
            >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-400/10 text-blue-100">
                <card.icon size={21} />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">{card.role}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{card.description}</p>
              <p className="mt-5 text-xs font-semibold leading-5 text-slate-400">{card.features}</p>
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}

function StatsBand() {
  return (
    <div className="w-full overflow-x-hidden bg-blue-600">
      <Section className="py-10">
        <div className="grid gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([stat, label], index) => (
            <div
              key={label}
              className={`text-center ${index > 0 ? 'lg:border-l lg:border-white/15' : ''}`}
            >
              <p className="text-4xl font-extrabold tracking-tight text-white">{stat}</p>
              <p className="mt-2 text-sm font-medium text-blue-100">{label}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        className={`flex min-h-14 w-full items-center justify-between gap-4 px-5 text-left text-sm font-bold text-slate-900 transition-colors ${
          isOpen ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
        }`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{question}</span>
        <ChevronDown className={`shrink-0 text-blue-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={18} />
      </button>
      {isOpen && <p className="px-5 pb-5 pt-1 text-sm leading-6 text-slate-600">{answer}</p>}
    </div>
  )
}

function FaqSection() {
  return (
    <div className="w-full overflow-x-hidden bg-slate-50">
      <Section className="py-16 sm:py-20">
        <SectionHeader
          label="COMMON QUESTIONS"
          title="Frequently asked questions"
          subtitle="Everything patients ask before booking at DEAMHI"
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {faqs.map((faq) => (
            <FaqItem key={faq.question} {...faq} />
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-slate-600">
          Still have questions?{' '}
          <Link to="/faq" className="font-bold text-blue-600 hover:text-blue-700">View all FAQs</Link>
          {' '}or{' '}
          <Link to="/about" className="font-bold text-blue-600 hover:text-blue-700">Contact DEAMHI</Link>
        </p>
      </Section>
    </div>
  )
}

function FinalCta() {
  return (
    <div className="w-full overflow-x-hidden bg-gradient-to-b from-white to-blue-50">
      <Section className="py-16 text-center sm:py-20">
        <div className="rounded-2xl bg-blue-600 px-5 py-10 text-white shadow-2xl shadow-blue-950/20 sm:rounded-[2rem] sm:px-10 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">Ready to experience better healthcare?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-blue-100">
            Book an appointment at DEAMHI today - no account needed to get started.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/book"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-7 text-sm font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 sm:w-auto"
            >
              <CalendarDays size={18} />
              Book an appointment
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-white/25 px-7 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              Log in to my account
            </Link>
          </div>
        </div>
      </Section>
    </div>
  )
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustBar />
      <ServicesSection />
      <HowItWorks />
      <FeatureSplitRows />
      <WhoIsItFor />
      <StatsBand />
      <FaqSection />
      <FinalCta />
    </>
  )
}
