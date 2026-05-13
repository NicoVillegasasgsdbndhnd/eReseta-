import { useNavigate } from 'react-router-dom'
import { Eye, FilePlus, Loader2 } from 'lucide-react'
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
        title="Prescriptions"
        description="View and manage all prescriptions"
        action={
          user?.role === 'doctor' ? (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/prescriptions/new')}>
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
        />
      )}
    </>
  )
}
