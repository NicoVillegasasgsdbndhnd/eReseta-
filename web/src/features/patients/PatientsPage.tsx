import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Trash2, Loader2, Users, Sparkles, ShieldCheck, IdCard } from 'lucide-react'
import DataTable, { type Column } from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAuthStore } from '@/features/auth/authStore'
import { useDashboardSummary } from '@/features/dashboard/queries'
import { usePatients, useDeletePatient } from './queries'
import type { Patient } from '@/mocks/types'

const TEAL = 'hsl(168 79% 37%)'
const INK = 'hsl(215 30% 14%)'
const BORDER = 'hsl(210 18% 88%)'

function ageFromDob(dob: string): number | null {
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--
  return a
}

export default function PatientsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const { data, isLoading, isError } = usePatients()
  const { data: summary } = useDashboardSummary()
  const deletePatient = useDeletePatient()
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null)

  const patients = data?.data ?? []
  const total = data?.meta?.total ?? summary?.total_patients ?? patients.length
  const newThisWeek = summary?.new_patients_this_week ?? null
  // Coverage stats are only accurate when the full registry is loaded on one page.
  const fullyLoaded = patients.length >= total && patients.length > 0
  const philhealthCovered = fullyLoaded ? patients.filter((p) => !!p.philhealth_no).length : null
  const philhealthPct = philhealthCovered !== null && total > 0 ? Math.round((philhealthCovered / total) * 100) : null

  const stats = [
    { label: 'Total patients', value: String(total), hint: 'In registry', icon: Users, tint: 'text-teal-600' },
    { label: 'New this week', value: newThisWeek !== null ? String(newThisWeek) : '—', hint: 'Registered', icon: Sparkles, tint: 'text-emerald-600' },
    {
      label: 'PhilHealth covered',
      value: philhealthPct !== null ? `${philhealthPct}%` : '—',
      hint: philhealthCovered !== null ? `${philhealthCovered} of ${total}` : 'Full registry only',
      icon: ShieldCheck,
      tint: 'text-blue-600',
    },
  ]

  const columns: Column<Patient>[] = [
    {
      key: 'name',
      header: 'Patient',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-600">
            {row.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-800">{row.user?.name}</p>
              {row.patient_code && (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500">
                  {row.patient_code}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-slate-500">{row.user?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'dob',
      header: 'Age / DOB',
      render: (row) => {
        const age = ageFromDob(row.dob)
        return (
          <div>
            <p className="text-sm text-slate-700">
              {age !== null ? `${age} yrs` : '—'}
              <span className="capitalize text-slate-400"> · {row.sex}</span>
            </p>
            <p className="text-xs text-slate-500">
              {new Date(row.dob).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
            </p>
          </div>
        )
      },
    },
    {
      key: 'philhealth',
      header: 'PhilHealth No.',
      render: (row) =>
        row.philhealth_no ? (
          <span className="font-mono text-sm text-slate-700">{row.philhealth_no}</span>
        ) : (
          <span className="text-xs italic text-slate-300">Not registered</span>
        ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => <span className="text-sm text-slate-600">{row.contact || <span className="text-slate-300">—</span>}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.user?.status ?? 'active'} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      // Mentor revision: open a patient by double-clicking the row (no "View Profile" link).
      render: (row) =>
        isAdmin ? (
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row) }}
            disabled={deletePatient.isPending}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            aria-label={`Delete ${row.user?.name}`}
          >
            <Trash2 size={14} />
          </button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'hsl(168 79% 37% / 0.1)' }}>
            <IdCard size={22} style={{ color: TEAL }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>Patient Registry</h1>
            <p className="mt-0.5 text-sm text-slate-500">All registered DEAMHI patients — double-click a row to open a chart.</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate('/patients/new')}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-sm transition-colors hover:brightness-95"
            style={{ backgroundColor: TEAL }}
          >
            <UserPlus size={17} /> Add Patient
          </button>
        )}
      </div>

      {/* ── Compact metric chips ── */}
      {!isLoading && !isError && (
        <div className="flex flex-wrap items-center gap-2">
          {stats.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 shadow-sm"
              style={{ border: `1px solid ${BORDER}` }}
              title={s.hint}
            >
              <s.icon size={15} className={s.tint} />
              <span className="text-sm font-black tabular-nums" style={{ color: INK }}>{s.value}</span>
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* ── Registry table ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white py-16 text-center text-sm text-red-500 shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
          Failed to load patients. Check that the API is reachable and try again.
        </div>
      ) : (
        <DataTable<Patient>
          data={patients}
          columns={columns}
          onRowDoubleClick={(row) => navigate(`/patients/${row.id}`)}
          emptyMessage="No patients registered yet."
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
    </div>
  )
}
