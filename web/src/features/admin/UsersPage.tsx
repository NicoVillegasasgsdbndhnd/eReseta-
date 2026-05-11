import { useState } from 'react'
import { UserPlus, Edit2, Power } from 'lucide-react'
import { Input } from '@/components/ui/input'
import DataTable, { type Column } from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import PageHeader from '@/components/common/PageHeader'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { mockUsers } from '@/mocks/data'
import type { User } from '@/mocks/types'

const ROLE_LABELS: Record<string, string> = {
  patient: 'Patient',
  doctor: 'Physician',
  pharmacist: 'Pharmacist',
  admin: 'Admin',
  it_admin: 'IT Admin',
}

const ROLE_COLORS: Record<string, string> = {
  patient:    'bg-blue-50 text-blue-700',
  doctor:     'bg-indigo-50 text-indigo-700',
  pharmacist: 'bg-emerald-50 text-emerald-700',
  admin:      'bg-amber-50 text-amber-700',
  it_admin:   'bg-rose-50 text-rose-700',
}

export default function UsersPage() {
  const [showForm, setShowForm] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<User | null>(null)
  const [toggling, setToggling] = useState(false)

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
            {row.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-sm">{row.name}</p>
            <p className="text-xs text-slate-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ROLE_COLORS[row.role] ?? 'bg-slate-100 text-slate-600'}`}>
          {ROLE_LABELS[row.role] ?? row.role}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => <span className="text-sm text-slate-600">{row.phone ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'created',
      header: 'Joined',
      render: (row) => (
        <span className="text-sm text-slate-500">
          {row.created_at ? new Date(row.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => setToggleTarget(row)}
            className={`p-1.5 rounded-lg transition-colors ${row.status === 'active' ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
          >
            <Power size={13} />
          </button>
        </div>
      ),
    },
  ]

  const handleToggle = async () => {
    setToggling(true)
    await new Promise((r) => setTimeout(r, 700))
    setToggling(false)
    setToggleTarget(null)
  }

  return (
    <>
      <PageHeader
        title="User Management"
        description="Manage system users, roles, and access permissions"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-xl shadow-sm transition-colors"
          >
            <UserPlus size={15} /> Add User
          </button>
        }
      />

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-5" style={{ border: '1px solid hsl(221 83% 88%)' }}>
          <p className="text-sm font-bold text-slate-700 mb-4">New User Account</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</label>
              <Input placeholder="e.g. Dr. Juan dela Cruz" className="border-slate-200 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Address</label>
              <Input type="email" placeholder="user@deamhi.test" className="border-slate-200 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</label>
              <select className="w-full h-10 rounded-lg border text-sm text-slate-700 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ borderColor: 'hsl(214 20% 90%)' }}>
                {Object.entries(ROLE_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
              <Input placeholder="09XXXXXXXXX" className="border-slate-200 text-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              Create User
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <DataTable<User>
        data={mockUsers}
        columns={columns}
        searchPlaceholder="Search by name, email, or role…"
        searchFn={(row, q) =>
          row.name.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q) ||
          (ROLE_LABELS[row.role] ?? row.role).toLowerCase().includes(q)
        }
      />

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(o) => !o && setToggleTarget(null)}
        title={toggleTarget?.status === 'active' ? 'Deactivate User' : 'Activate User'}
        description={`Are you sure you want to ${toggleTarget?.status === 'active' ? 'deactivate' : 'activate'} ${toggleTarget?.name}?`}
        confirmLabel={toggleTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        variant={toggleTarget?.status === 'active' ? 'destructive' : 'default'}
        loading={toggling}
        onConfirm={handleToggle}
      />
    </>
  )
}
