import { useRef, useState } from 'react'
import { UserPlus, Edit2, Power, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import DataTable, { type Column } from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import PageHeader from '@/components/common/PageHeader'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUsers, useCreateUser, useUpdateUser, useDoctors } from './queries'
import api from '@/lib/api'
import type { User } from '@/mocks/types'

const ROLE_LABELS: Record<string, string> = {
  patient:    'Patient',
  doctor:     'Physician',
  pharmacist: 'Pharmacist',
  admin:      'Admin',
  staff:      'Staff',
}

const ROLE_COLORS: Record<string, string> = {
  patient:    'bg-blue-50 text-blue-700',
  doctor:     'bg-indigo-50 text-indigo-700',
  pharmacist: 'bg-emerald-50 text-emerald-700',
  admin:      'bg-amber-50 text-amber-700',
  staff:      'bg-violet-50 text-violet-700',
}

export default function UsersPage() {
  const { data, isLoading } = useUsers()
  const users = data?.data ?? []
  const createUser = useCreateUser()
  const { data: doctorsData } = useDoctors()
  const doctors = doctorsData?.data ?? []
  const qc = useQueryClient()

  const toggleMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: number | string; status: 'active' | 'inactive' }) =>
      api.put<User>(`/users/${userId}`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'patient', phone: '',
    specialization: '', license_no: '', prc_expiry: '',
    assigned_doctor_id: '',
  })

  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [editData, setEditData] = useState({
    name: '', email: '', phone: '', role: 'patient',
    specialization: '', license_no: '', prc_expiry: '',
  })
  const updateUser = useUpdateUser(editTarget?.id)
  const editFormRef = useRef<HTMLDivElement>(null)

  const openEdit = (user: User) => {
    setShowForm(false)
    setEditTarget(user)
    setEditData({
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      specialization: user.doctor?.specialization ?? '',
      license_no: user.doctor?.license_no ?? '',
      prc_expiry: user.doctor?.prc_expiry ?? '',
    })
    setTimeout(() => editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const handleEdit = async () => {
    if (!editTarget) return
    const payload: Record<string, string> = {
      name: editData.name, email: editData.email,
      phone: editData.phone, role: editData.role,
    }
    if (editData.role === 'doctor') {
      payload.specialization = editData.specialization
      payload.license_no     = editData.license_no
      payload.prc_expiry     = editData.prc_expiry
    }
    await updateUser.mutateAsync(payload)
    setEditTarget(null)
  }

  const [toggleTarget, setToggleTarget] = useState<User | null>(null)

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
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => setToggleTarget(row)}
            disabled={toggleMutation.isPending}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${row.status === 'active' ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
          >
            <Power size={13} />
          </button>
        </div>
      ),
    },
  ]

  const EMPTY_FORM = { name: '', email: '', password: '', role: 'patient', phone: '', specialization: '', license_no: '', prc_expiry: '', assigned_doctor_id: '' }

  const handleCreate = async () => {
    if (!formData.name || !formData.email || !formData.password) return
    const payload: Record<string, string> = {
      name: formData.name, email: formData.email,
      password: formData.password, role: formData.role, phone: formData.phone,
    }
    if (formData.role === 'doctor') {
      payload.specialization = formData.specialization
      payload.license_no = formData.license_no
      payload.prc_expiry = formData.prc_expiry
    }
    if (formData.role === 'staff' && formData.assigned_doctor_id) {
      payload.assigned_doctor_id = formData.assigned_doctor_id
    }
    await createUser.mutateAsync(payload)
    setShowForm(false)
    setFormData(EMPTY_FORM)
  }

  const handleToggle = async () => {
    if (!toggleTarget) return
    await toggleMutation.mutateAsync({
      userId: toggleTarget.id,
      status: toggleTarget.status === 'active' ? 'inactive' : 'active',
    })
    setToggleTarget(null)
  }

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
              <Input
                placeholder="e.g. Dr. Juan dela Cruz"
                className="border-slate-200 text-sm"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Address</label>
              <Input
                type="email"
                placeholder="user@deamhi.test"
                className="border-slate-200 text-sm"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</label>
              <select
                className="w-full h-10 rounded-lg border text-sm text-slate-700 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: 'hsl(214 20% 90%)' }}
                value={formData.role}
                onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
              >
                {Object.entries(ROLE_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
              <Input
                placeholder="09XXXXXXXXX"
                className="border-slate-200 text-sm"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Temporary Password</label>
              <Input
                type="text"
                placeholder="Set a temporary password for the account"
                className="border-slate-200 text-sm"
                value={formData.password}
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
              />
            </div>
          </div>

          {formData.role === 'doctor' && (
            <div className="mb-4 rounded-lg p-4" style={{ border: '1px solid hsl(221 83% 88%)', background: 'hsl(221 83% 98%)' }}>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">Physician Details</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Specialization</label>
                  <Input
                    placeholder="e.g. Internal Medicine"
                    className="border-slate-200 text-sm bg-white"
                    value={formData.specialization}
                    onChange={(e) => setFormData((p) => ({ ...p, specialization: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PRC License No.</label>
                  <Input
                    placeholder="e.g. 0123456"
                    className="border-slate-200 text-sm bg-white"
                    value={formData.license_no}
                    onChange={(e) => setFormData((p) => ({ ...p, license_no: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PRC Expiry Date</label>
                  <Input
                    type="date"
                    className="border-slate-200 text-sm bg-white"
                    value={formData.prc_expiry}
                    onChange={(e) => setFormData((p) => ({ ...p, prc_expiry: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {formData.role === 'staff' && (
            <div className="mb-4 rounded-lg p-4" style={{ border: '1px solid hsl(271 83% 88%)', background: 'hsl(271 83% 98%)' }}>
              <p className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-3">Staff Assignment</p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned Physician</label>
                <select
                  className="w-full h-10 rounded-lg border text-sm text-slate-700 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  style={{ borderColor: 'hsl(214 20% 90%)' }}
                  value={formData.assigned_doctor_id}
                  onChange={(e) => setFormData((p) => ({ ...p, assigned_doctor_id: e.target.value }))}
                >
                  <option value="">Select a doctor…</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user?.name ?? `Doctor #${d.id}`} — {d.specialization}
                    </option>
                  ))}
                </select>
                {doctors.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">No doctors found. Create a doctor account first.</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  The selected doctor will receive a notification to approve this staff assignment.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={createUser.isPending || !formData.name || !formData.email || !formData.password || (formData.role === 'staff' && !formData.assigned_doctor_id)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
            >
              {createUser.isPending ? 'Creating…' : 'Create User'}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setFormData(EMPTY_FORM)
              }}
              className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editTarget && (
        <div ref={editFormRef} className="bg-white rounded-xl shadow-sm p-5 mb-5" style={{ border: '1px solid hsl(221 83% 88%)' }}>
          <p className="text-sm font-bold text-slate-700 mb-1">Edit User — {editTarget.name}</p>
          <p className="text-xs text-slate-400 mb-4">{editTarget.email}</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</label>
              <Input
                className="border-slate-200 text-sm"
                value={editData.name}
                onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Address</label>
              <Input
                type="email"
                className="border-slate-200 text-sm"
                value={editData.email}
                onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</label>
              <select
                className="w-full h-10 rounded-lg border text-sm text-slate-700 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: 'hsl(214 20% 90%)' }}
                value={editData.role}
                onChange={(e) => setEditData((p) => ({ ...p, role: e.target.value }))}
              >
                {Object.entries(ROLE_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
              <Input
                className="border-slate-200 text-sm"
                value={editData.phone}
                onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
          </div>

          {editData.role === 'doctor' && (
            <div className="mb-4 rounded-lg p-4" style={{ border: '1px solid hsl(221 83% 88%)', background: 'hsl(221 83% 98%)' }}>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">Physician Details</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Specialization</label>
                  <Input
                    placeholder="e.g. Internal Medicine"
                    className="border-slate-200 text-sm bg-white"
                    value={editData.specialization}
                    onChange={(e) => setEditData((p) => ({ ...p, specialization: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PRC License No.</label>
                  <Input
                    placeholder="e.g. 0123456"
                    className="border-slate-200 text-sm bg-white"
                    value={editData.license_no}
                    onChange={(e) => setEditData((p) => ({ ...p, license_no: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PRC Expiry Date</label>
                  <Input
                    type="date"
                    className="border-slate-200 text-sm bg-white"
                    value={editData.prc_expiry}
                    onChange={(e) => setEditData((p) => ({ ...p, prc_expiry: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleEdit}
              disabled={updateUser.isPending || !editData.name || !editData.email}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
            >
              {updateUser.isPending ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={() => setEditTarget(null)}
              className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <DataTable<User>
        data={users}
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
        loading={toggleMutation.isPending}
        onConfirm={handleToggle}
      />
    </>
  )
}
