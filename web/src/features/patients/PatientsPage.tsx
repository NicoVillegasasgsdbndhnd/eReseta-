import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Trash2, Loader2 } from 'lucide-react'
import DataTable, { type Column } from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import PageHeader from '@/components/common/PageHeader'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAuthStore } from '@/features/auth/authStore'
import { usePatients, useDeletePatient } from './queries'
import type { Patient } from '@/mocks/types'

export default function PatientsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data, isLoading, isError } = usePatients()
  const deletePatient = useDeletePatient()
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null)

  const patients = data?.data ?? []

  const columns: Column<Patient>[] = [
    {
      key: 'name',
      header: 'Patient',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-600 shrink-0">
            {row.user?.name?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-sm">{row.user?.name}</p>
            <p className="text-xs text-slate-500">{row.user?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'dob',
      header: 'Date of Birth',
      render: (row) => (
        <div>
          <p className="text-sm text-slate-700">
            {new Date(row.dob).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
          </p>
          <p className="text-xs text-slate-500 capitalize">{row.sex}</p>
        </div>
      ),
    },
    {
      key: 'philhealth',
      header: 'PhilHealth No.',
      render: (row) =>
        row.philhealth_no ? (
          <span className="text-sm font-mono text-slate-700">{row.philhealth_no}</span>
        ) : (
          <span className="text-xs text-slate-300 italic">Not registered</span>
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
      className: 'w-32',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/patients/${row.id}`)}
            className="text-xs text-teal-600 hover:text-teal-700 font-semibold px-2 py-1 rounded hover:bg-teal-50 transition-colors"
          >
            View Profile →
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setDeleteTarget(row)}
              disabled={deletePatient.isPending}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
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
            <button
              onClick={() => navigate('/patients/new')}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-3 py-2 rounded-xl shadow-sm transition-colors"
            >
              <UserPlus size={15} /> Add Patient
            </button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : isError ? (
        <div className="text-center py-20 text-sm text-red-500">Failed to load patients.</div>
      ) : (
        <DataTable<Patient>
          data={patients}
          columns={columns}
          searchPlaceholder="Search by name, email, or PhilHealth no…"
          searchFn={(row, q) =>
            (row.user?.name ?? '').toLowerCase().includes(q) ||
            (row.user?.email ?? '').toLowerCase().includes(q) ||
            (row.philhealth_no ?? '').toLowerCase().includes(q)
          }
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Patient"
        description={`Permanently delete ${deleteTarget?.user?.name}? This will remove their account, appointments, records, and prescriptions. This cannot be undone.`}
        confirmLabel="Delete Permanently"
        variant="destructive"
        loading={deletePatient.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return
          await deletePatient.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </>
  )
}
