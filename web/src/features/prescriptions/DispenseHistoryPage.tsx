import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DataTable, { type Column } from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import PageHeader from '@/components/common/PageHeader'
import { mockPrescriptions } from '@/mocks/data'
import type { Prescription } from '@/mocks/types'

export default function DispenseHistoryPage() {
  const navigate = useNavigate()
  const dispensed = mockPrescriptions.filter((rx) => rx.status === 'dispensed' || rx.status === 'expired')

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
        <Button variant="ghost" size="sm" onClick={() => navigate(`/prescriptions/${row.id}`)}>
          <Eye size={14} className="mr-1" /> View
        </Button>
      ),
    },
  ]

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
