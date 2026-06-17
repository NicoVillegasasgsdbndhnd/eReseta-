import { useNavigate } from 'react-router-dom'
import { Eye, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DataTable, { type Column } from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import PageHeader from '@/components/common/PageHeader'
import { usePrescriptions } from './queries'
import type { Prescription } from '@/mocks/types'

export default function DispenseHistoryPage() {
  const navigate = useNavigate()
  const { data, isLoading } = usePrescriptions({ status: 'dispensed' })
  const dispensed = data?.data ?? []

  const columns: Column<Prescription>[] = [
    {
      key: 'ref',
      header: 'Reference No.',
      render: (row) => <span className="font-mono text-sm font-semibold">{row.reference_no}</span>,
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => <span className="text-sm">{row.patient_record?.patient?.user?.name ?? '—'}</span>,
    },
    {
      key: 'doctor',
      header: 'Doctor',
      render: (row) => <span className="text-sm">{row.doctor?.user?.name ?? '—'}</span>,
    },
    {
      key: 'dispensed_at',
      header: 'Dispensed',
      render: (row) => {
        const dispenseEvent = row.events?.find((e) => e.event_type === 'DISPENSED')
        return (
          <span className="text-sm">
            {dispenseEvent
              ? new Date(dispenseEvent.occurred_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })
              : '—'}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/prescriptions/${row.id}`, { state: { from: '/dispense-history' } })}>
          <Eye size={14} className="mr-1" /> View
        </Button>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Dispense History"
        description="Record of all dispensed prescriptions"
      />
      <DataTable<Prescription>
        data={dispensed}
        columns={columns}
        searchPlaceholder="Search by reference or patient…"
        searchFn={(row, q) =>
          row.reference_no.toLowerCase().includes(q) ||
          (row.patient_record?.patient?.user?.name ?? '').toLowerCase().includes(q)
        }
        emptyMessage="No dispensed prescriptions yet."
      />
    </>
  )
}
