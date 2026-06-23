import { useRef, useState } from 'react'
import { UserPlus, Edit2, Power, Trash2, Loader2, Phone, MapPin, Stethoscope, Calendar } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import DataTable, { type Column } from '@/components/common/DataTable'
import StatusBadge from '@/components/common/StatusBadge'
import PageHeader from '@/components/common/PageHeader'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useDoctors } from './queries'
import api from '@/lib/api'
import { formatPeso } from '@/lib/utils'
import type { User } from '@/mocks/types'
import DoctorCredentialFields, {
  type DoctorFields, emptyDoctorFields, doctorFieldsFromUser, doctorPayload,
} from './DoctorCredentialFields'

const ROLE_LABELS: Record<string, string> = {
  patient:    'Patient',
  doctor:     'Physician',
  pharmacist: 'Pharmacist',
  admin:      'Admin',
  staff:      'Staff',
}

const ROLE_COLORS: Record<string, string> = {
  patient:    'bg-teal-50 text-teal-700',
  doctor:     'bg-sky-50 text-sky-700',
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
    assigned_doctor_id: '',
  })
  const [createDoctor, setCreateDoctor] = useState<DoctorFields>(emptyDoctorFields())

  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [editData, setEditData] = useState({ name: '', email: '', phone: '', role: 'patient' })
  const [editDoctor, setEditDoctor] = useState<DoctorFields>(emptyDoctorFields())
  const updateUser = useUpdateUser(editTarget?.id)
  const editFormRef = useRef<HTMLDivElement>(null)

  const openEdit = (user: User) => {
    setShowForm(false)
    setEditTarget(user)
    setEditData({ name: user.name, email: user.email, phone: user.phone ?? '', role: user.role })
    setEditDoctor(user.doctor ? doctorFieldsFromUser(user.doctor) : emptyDoctorFields())
    setTimeout(() => editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const handleEdit = async () => {
    if (!editTarget) return
    const payload: Record<string, unknown> = {
      name: editData.name, email: editData.email,
      phone: editData.phone, role: editData.role,
    }
    if (editData.role === 'doctor') Object.assign(payload, doctorPayload(editDoctor))
    await updateUser.mutateAsync(payload)
    setEditTarget(null)
  }

  const [toggleTarget, setToggleTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const deleteUser = useDeleteUser()
  const [viewTarget, setViewTarget] = useState<User | null>(null)

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
            <p className="text-xs text-slate-500">{row.email}</p>
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
            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => setToggleTarget(row)}
            disabled={toggleMutation.isPending}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${row.status === 'active' ? 'text-slate-500 hover:text-red-500 hover:bg-red-50' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
          >
            <Power size={13} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            disabled={deleteUser.isPending}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  const EMPTY_FORM = { name: '', email: '', password: '', role: 'patient', phone: '', assigned_doctor_id: '' }

  const resetCreate = () => { setShowForm(false); setFormData(EMPTY_FORM); setCreateDoctor(emptyDoctorFields()) }

  const handleCreate = async () => {
    if (!formData.name || !formData.email || !formData.password) return
    const payload: Record<string, unknown> = {
      name: formData.name, email: formData.email,
      password: formData.password, role: formData.role, phone: formData.phone,
    }
    if (formData.role === 'doctor') Object.assign(payload, doctorPayload(createDoctor))
    if (formData.role === 'staff' && formData.assigned_doctor_id) {
      payload.assigned_doctor_id = formData.assigned_doctor_id
    }
    await createUser.mutateAsync(payload)
    resetCreate()
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
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-3 py-2 rounded-xl shadow-sm transition-colors"
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
                className="w-full h-10 rounded-lg border text-sm text-slate-700 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                style={{ borderColor: 'var(--color-border)' }}
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
              <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">Physician Credentials</p>
              <DoctorCredentialFields value={createDoctor} onChange={(patch) => setCreateDoctor((p) => ({ ...p, ...patch }))} />
            </div>
          )}

          {formData.role === 'staff' && (
            <div className="mb-4 rounded-lg p-4" style={{ border: '1px solid hsl(271 83% 88%)', background: 'hsl(271 83% 98%)' }}>
              <p className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-3">Staff Assignment</p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned Physician</label>
                <select
                  className="w-full h-10 rounded-lg border text-sm text-slate-700 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  style={{ borderColor: 'var(--color-border)' }}
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
                  <p className="text-xs text-slate-500 mt-1">No doctors found. Create a doctor account first.</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  The selected doctor will receive a notification to approve this staff assignment.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={createUser.isPending || !formData.name || !formData.email || !formData.password || (formData.role === 'staff' && !formData.assigned_doctor_id)}
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
            >
              {createUser.isPending ? 'Creating…' : 'Create User'}
            </button>
            <button
              onClick={resetCreate}
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
          <p className="text-xs text-slate-500 mb-4">{editTarget.email}</p>
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
                className="w-full h-10 rounded-lg border text-sm text-slate-700 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                style={{ borderColor: 'var(--color-border)' }}
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
              <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">Physician Credentials</p>
              <DoctorCredentialFields value={editDoctor} onChange={(patch) => setEditDoctor((p) => ({ ...p, ...patch }))} />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleEdit}
              disabled={updateUser.isPending || !editData.name || !editData.email}
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
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
        onRowDoubleClick={(row) => setViewTarget(row)}
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

      {/* User Profile Modal */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">User Profile</DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-5">
              {/* Hero */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {viewTarget.profile_photo_url
                    ? <img src={viewTarget.profile_photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                    : viewTarget.name.charAt(0)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-slate-800 truncate">{viewTarget.name}</p>
                  <p className="text-sm text-slate-500 truncate">{viewTarget.email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ROLE_COLORS[viewTarget.role] ?? 'bg-slate-100 text-slate-600'}`}>
                      {ROLE_LABELS[viewTarget.role] ?? viewTarget.role}
                    </span>
                    <StatusBadge status={viewTarget.status} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-500">Account ID</p>
                  <p className="text-sm font-mono font-semibold text-slate-600">#{viewTarget.id.toString().padStart(4, '0')}</p>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-2 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                {viewTarget.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone size={13} className="text-slate-500 shrink-0" />
                    <span className="text-slate-700">{viewTarget.phone}</span>
                  </div>
                )}
                {viewTarget.address && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin size={13} className="text-slate-500 shrink-0" />
                    <span className="text-slate-700">{viewTarget.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={13} className="text-slate-500 shrink-0" />
                  <span className="text-slate-500">Joined {viewTarget.created_at ? new Date(viewTarget.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—'}</span>
                </div>
              </div>

              {/* Doctor details */}
              {viewTarget.role === 'doctor' && viewTarget.doctor && (() => {
                const d = viewTarget.doctor
                const peso = formatPeso
                const rows: [string, React.ReactNode][] = [
                  ['Specialization', d.specialization],
                  ['Title / Suffix', d.suffix || '—'],
                  ['Department', d.hospital_department || '—'],
                  ['Consultant Type', d.consultant_type || '—'],
                  ['PRC License No.', <span className="font-mono">{d.license_no}</span>],
                  ['PRC Expiry', d.prc_expiry ?? '—'],
                  ['PhilHealth (PAN)', d.philhealth_accreditation || '—'],
                  ['PDEA S2', d.s2_license || '—'],
                  ['TIN', d.tin || '—'],
                  ['Clinic Room', d.clinic_room_no || '—'],
                  ['Consultation Fee', peso(d.consultation_fee) ?? '—'],
                  ['Follow-up Fee', peso(d.followup_fee) ?? '—'],
                ]
                return (
                  <div className="rounded-lg p-4 space-y-3" style={{ border: '1px solid hsl(221 83% 88%)', background: 'hsl(221 83% 98%)' }}>
                    <p className="text-xs font-bold text-teal-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Stethoscope size={11} /> Physician Details
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {rows.map(([label, val]) => (
                        <div key={label}>
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="font-medium text-slate-700">{val}</p>
                        </div>
                      ))}
                    </div>
                    {(d.medical_society_affiliations?.length || d.hmo_partners?.length || d.clinic_available_days?.length) ? (
                      <div className="space-y-1.5 pt-1">
                        {d.medical_society_affiliations?.length ? <p className="text-xs text-slate-600"><span className="text-slate-500">Societies:</span> {d.medical_society_affiliations.join(', ')}</p> : null}
                        {d.hmo_partners?.length ? <p className="text-xs text-slate-600"><span className="text-slate-500">HMOs:</span> {d.hmo_partners.join(', ')}</p> : null}
                        {d.clinic_available_days?.length ? <p className="text-xs text-slate-600"><span className="text-slate-500">Clinic days:</span> {d.clinic_available_days.join(', ')}</p> : null}
                      </div>
                    ) : null}
                  </div>
                )
              })()}

              {/* Staff details */}
              {viewTarget.role === 'staff' && viewTarget.assigned_doctor && (
                <div className="rounded-lg p-4 space-y-2" style={{ border: '1px solid hsl(271 83% 88%)', background: 'hsl(271 83% 98%)' }}>
                  <p className="text-xs font-bold text-violet-700 uppercase tracking-wide">Assigned Physician</p>
                  <p className="text-sm font-medium text-slate-700">{viewTarget.assigned_doctor.user?.name ?? '—'}</p>
                  <p className="text-xs text-slate-500">{viewTarget.assigned_doctor.specialization}</p>
                  <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    viewTarget.staff_request?.status === 'approved' ? 'bg-emerald-50 text-emerald-700'
                    : viewTarget.staff_request?.status === 'rejected' ? 'bg-red-50 text-red-600'
                    : 'bg-amber-50 text-amber-700'
                  }`}>
                    {viewTarget.staff_request?.status === 'approved' ? 'Authorized'
                      : viewTarget.staff_request?.status === 'rejected' ? 'Rejected'
                      : 'Pending Approval'}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => { setViewTarget(null); openEdit(viewTarget) }}
                  className="text-sm font-semibold px-4 py-2 rounded-xl text-teal-600 hover:bg-teal-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setViewTarget(null)}
                  className="text-sm font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete User"
        description={`Permanently delete ${deleteTarget?.name}? This will remove their account, appointments, records, and prescriptions. This cannot be undone.`}
        confirmLabel="Delete Permanently"
        variant="destructive"
        loading={deleteUser.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return
          await deleteUser.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </>
  )
}
