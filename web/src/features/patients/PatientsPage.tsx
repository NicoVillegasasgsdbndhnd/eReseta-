import { useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import DataTable, { type Column } from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import PageHeader from '@/components/common/PageHeader'
import { mockPatients } from '@/mocks/data'
import { useAuthStore } from '@/features/auth/authStore'
import type { Patient } from '@/mocks/types'

export default function PatientsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const columns: Column<Patient>[] = [
    {
      key: 'name',
      header: 'Patient',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
            {row.user?.name?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-sm">{row.user?.name}</p>
            <p className="text-xs text-slate-400">{row.user?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'dob',
      header: 'Date of Birth',
      render: (row) => (
        <div>
          <p className="text-sm text-slate-700">{new Date(row.dob).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</p>
          <p className="text-xs text-slate-400 capitalize">{row.sex}</p>
        </div>
      ),
    },
    {
      key: 'philhealth',
      header: 'PhilHealth No.',
      render: (row) => (
        row.philhealth_no
          ? <span className="text-sm font-mono text-slate-700">{row.philhealth_no}</span>
          : <span className="text-xs text-slate-300 italic">Not registered</span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => <span className="text-sm text-slate-600">{row.contact}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.user?.status ?? 'active'} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (row) => (
        <button
          onClick={() => navigate(`/patients/${row.id}`)}
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 rounded hover:bg-blue-50 transition-colors"
        >
          View Profile →
        </button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Patients"
        description="Registry of all registered DEAMHI patients"
        action={
          user?.role === 'admin' ? (
            <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-xl shadow-sm transition-colors">
              <UserPlus size={15} /> Add Patient
            </button>
          ) : undefined
        }
      />

      <DataTable<Patient>
        data={mockPatients}
        columns={columns}
        searchPlaceholder="Search by name, email, or PhilHealth no…"
        searchFn={(row, q) =>
          (row.user?.name ?? '').toLowerCase().includes(q) ||
          (row.user?.email ?? '').toLowerCase().includes(q) ||
          (row.philhealth_no ?? '').toLowerCase().includes(q)
        }
      />
    </>
  )
}
