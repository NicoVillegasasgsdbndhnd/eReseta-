import { useNavigate } from 'react-router-dom'
import { CalendarDays, FilePlus, FileText, Loader2, Pill, ShieldCheck, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DataTable, { type Column } from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import PageHeader from '@/components/common/PageHeader'
import { useAuthStore } from '@/features/auth/authStore'
import { usePrescriptions } from './queries'
import type { Prescription } from '@/mocks/types'

export default function PrescriptionsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data, isLoading, isError } = usePrescriptions()

  const prescriptions = data?.data ?? []
  const isPatient = user?.role === 'patient'
  const activePrescriptions = prescriptions.filter((rx) => rx.status === 'issued' || rx.status === 'verified')
  const dispensedPrescriptions = prescriptions.filter((rx) => rx.status === 'dispensed')
  const latestPrescription = prescriptions[0]

  const columns: Column<Prescription>[] = [
    {
      key: 'ref',
      header: 'Reference No.',
      render: (row) => (
        <span className="font-mono text-sm font-semibold">{row.reference_no}</span>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <span className="text-sm">{row.patient_record?.patient?.user?.name ?? '—'}</span>
      ),
    },
    {
      key: 'doctor',
      header: 'Prescribing Doctor',
      render: (row) => <span className="text-sm">{row.doctor?.user?.name ?? '—'}</span>,
    },
    {
      key: 'items',
      header: 'Medications',
      render: (row) => (
        <span className="text-sm text-slate-500">
          {row.items.slice(0, 2).map((i) => i.drug_name).join(', ')}
          {row.items.length > 2 ? ` +${row.items.length - 2} more` : ''}
        </span>
      ),
    },
    {
      key: 'issued_at',
      header: 'Issued',
      render: (row) => (
        <span className="text-sm">
          {new Date(row.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ]

  if (isPatient) {
    return (
      <div className="mx-auto max-w-6xl space-y-5">
        <section
          className="overflow-hidden rounded-xl bg-white shadow-sm"
          style={{ border: '1px solid hsl(210 18% 88%)' }}
        >
          <div
            className="grid gap-5 p-6 md:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]"
            style={{ background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(205 92% 30%) 58%, hsl(152 48% 35%) 100%)' }}
          >
            <div className="min-w-0 text-white">
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
              >
                <Pill size={14} />
                My prescription records
              </div>
              <h1 className="text-3xl font-bold leading-tight">Your medicines, clearly organized.</h1>
              <p className="mt-2 max-w-xl text-sm" style={{ color: 'rgba(255,255,255,0.76)' }}>
                Review active prescriptions, check dispensing status, and open your printable DEAMHI Hospital Rx.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { label: 'Total Rx', value: prescriptions.length },
                  { label: 'Active', value: activePrescriptions.length },
                  { label: 'Dispensed', value: dispensedPrescriptions.length },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg px-4 py-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.18)' }}
                  >
                    <p className="text-2xl font-bold leading-none">{item.value}</p>
                    <p className="mt-1 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-lg">
              {latestPrescription ? (
                <>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Latest prescription</p>
                      <p className="mt-1 font-mono text-xl font-bold leading-tight text-slate-900">{latestPrescription.reference_no}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(latestPrescription.issued_at).toLocaleDateString('en-PH', { dateStyle: 'long' })}
                      </p>
                    </div>
                    <StatusBadge status={latestPrescription.status} />
                  </div>
                  <div className="space-y-2">
                    {latestPrescription.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                          <Pill size={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{item.drug_name}</p>
                          <p className="text-xs text-slate-500">{item.dosage} · {item.frequency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate(`/prescriptions/${latestPrescription.id}`)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: 'hsl(201 100% 36%)' }}
                  >
                    Open Hospital Rx
                  </button>
                </>
              ) : (
                <div className="flex min-h-56 flex-col items-center justify-center text-center">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <FileText size={22} />
                  </span>
                  <p className="text-lg font-bold text-slate-900">No prescriptions yet</p>
                  <p className="mt-1 max-w-xs text-sm text-slate-500">Your digital prescriptions will appear here after a consultation.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : isError ? (
          <div className="text-center py-20 text-sm text-red-500">Failed to load prescriptions.</div>
        ) : prescriptions.length === 0 ? (
          <div className="rounded-xl bg-white px-6 py-14 text-center shadow-sm" style={{ border: '1px solid hsl(210 18% 88%)' }}>
            <Pill size={28} className="mx-auto text-slate-300" />
            <p className="mt-3 text-base font-bold text-slate-900">No prescription records</p>
            <p className="mt-1 text-sm text-slate-500">Your prescriptions will be listed after a DEAMHI physician issues them.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {prescriptions.map((rx) => (
              <button
                key={rx.id}
                onClick={() => navigate(`/prescriptions/${rx.id}`)}
                className="rounded-xl bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ border: '1px solid hsl(210 18% 88%)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-base font-bold text-slate-900">{rx.reference_no}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Issued {new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                    </p>
                  </div>
                  <StatusBadge status={rx.status} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <Stethoscope size={16} className="mb-2 text-sky-700" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900">{rx.doctor?.user?.name ?? '-'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <CalendarDays size={16} className="mb-2 text-emerald-700" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diagnosis</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900">{rx.patient_record?.diagnosis ?? '-'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <ShieldCheck size={16} className="mb-2 text-violet-700" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{rx.items.length} medicine{rx.items.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {rx.items.slice(0, 3).map((item) => (
                    <span key={item.id} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {item.drug_name}
                    </span>
                  ))}
                  {rx.items.length > 3 && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      +{rx.items.length - 3} more
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Prescriptions"
        description="View and manage all prescriptions"
        action={
          user?.role === 'doctor' ? (
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => navigate('/prescriptions/new')}>
              <FilePlus size={15} className="mr-1.5" /> New Prescription
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : isError ? (
        <div className="text-center py-20 text-sm text-red-500">Failed to load prescriptions.</div>
      ) : (
        <DataTable<Prescription>
          data={prescriptions}
          columns={columns}
          searchPlaceholder="Search by reference or patient…"
          searchFn={(row, q) =>
            row.reference_no.toLowerCase().includes(q) ||
            (row.patient_record?.patient?.user?.name ?? '').toLowerCase().includes(q) ||
            (row.doctor?.user?.name ?? '').toLowerCase().includes(q)
          }
          onRowClick={(row) => navigate(`/prescriptions/${row.id}`)}
        />
      )}
    </>
  )
}
