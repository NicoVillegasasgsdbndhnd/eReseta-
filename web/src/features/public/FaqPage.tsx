const faqGroups = [
  {
    title: 'Patient',
    items: [
      ['Do I need an account to book?', 'No. Guests can request an appointment online and register after their first verified hospital visit.'],
      ['Can I cancel or reschedule?', 'Yes. Appointment changes can be coordinated through the appointment flow and hospital staff.'],
      ['Where do I get my medicine?', 'After consultation, bring your verified e-prescription to the DEAMHI pharmacy for dispensing.'],
    ],
  },
  {
    title: 'Doctor',
    items: [
      ['Can doctors approve requests?', 'Doctors and assigned staff can manage appointment status based on clinic availability.'],
      ['Can prescriptions be printed?', 'Yes. Hospital Rx views are available for prescription review and printing.'],
    ],
  },
  {
    title: 'Technical',
    items: [
      ['What does blockchain-secured mean?', 'Prescription lifecycle events are mirrored to a private Hyperledger Fabric ledger for tamper-evident verification.'],
      ['Does the blockchain replace the database?', 'No. MySQL remains the source of truth. The ledger mirrors prescription events only.'],
    ],
  },
  {
    title: 'Privacy',
    items: [
      ['Is patient information stored on-chain?', 'No. Personal names, addresses, contact numbers, and PhilHealth details are not written to the blockchain.'],
      ['How is privacy handled?', 'The system uses role-based access, audit logs, and data minimization aligned with RA 10173.'],
    ],
  },
]

export default function FaqPage() {
  return (
    <div className="bg-gradient-to-b from-blue-50 to-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">HELP CENTER</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Frequently asked questions</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Common answers for patients, doctors, technical reviewers, and privacy questions about eReseta+.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {faqGroups.map((group) => (
            <section key={group.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-200">
              <h2 className="text-xl font-bold text-slate-900">{group.title}</h2>
              <div className="mt-5 grid gap-5">
                {group.items.map(([question, answer]) => (
                  <article key={question}>
                    <h3 className="text-sm font-bold text-slate-900">{question}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}
