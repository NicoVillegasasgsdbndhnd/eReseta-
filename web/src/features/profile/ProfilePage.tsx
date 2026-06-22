import React, { useRef, useState } from 'react'
import { User, Mail, Phone, MapPin, Shield, Camera, Trash2, Loader2, Stethoscope, UserCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/features/auth/authStore'
import api from '@/lib/api'
import type { User as UserType } from '@/mocks/types'

function useMyProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => api.get<UserType>('/auth/me').then((r) => r.data),
  })
}

const ROLE_LABELS: Record<string, string> = {
  patient:    'Patient',
  doctor:     'Physician',
  pharmacist: 'Pharmacist',
  admin:      'Administrator',
  staff:      'Staff',
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'hsl(215 16% 50%)' }}>
        <span>{icon}</span>
        {label}
      </label>
      {children}
    </div>
  )
}

const TAB_TRIGGER =
  'rounded-none border-b-2 border-transparent ' +
  'data-[state=active]:border-[hsl(201_100%_36%)] data-[state=active]:text-[hsl(201_100%_36%)] ' +
  'data-[state=active]:bg-transparent data-[state=active]:shadow-none ' +
  'px-5 pb-3 pt-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors'

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sigInputRef = useRef<HTMLInputElement>(null)

  const { data: myProfile } = useMyProfile()

  const { data: staffListData } = useQuery({
    queryKey: ['users', { role: 'staff' }],
    queryFn: () => api.get<{ data: UserType[] }>('/users', { params: { role: 'staff' } }).then((r) => r.data),
    enabled: user?.role === 'doctor',
  })
  const myStaff = (staffListData?.data ?? []).filter(
    (u) => u.assigned_doctor?.user?.id === user?.id,
  )

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [removingPhoto, setRemovingPhoto] = useState(false)

  // Doctor e-signature image
  const [sigUrl, setSigUrl] = useState<string | null>(user?.doctor?.signature_image ?? null)
  const [uploadingSig, setUploadingSig] = useState(false)

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [address, setAddress] = useState(user?.address ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [changingPwd, setChangingPwd] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSaved, setPwdSaved] = useState(false)

  if (!user) return null

  const displayPhoto = previewUrl ?? user.profile_photo_url

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleUploadPhoto = async () => {
    if (!pendingFile) return
    setUploadingPhoto(true)
    try {
      const form = new FormData()
      form.append('photo', pendingFile)
      const { data } = await api.post<{ profile_photo_url: string }>('/profile/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const token = useAuthStore.getState().token!
      setAuth({ ...user, profile_photo_url: data.profile_photo_url }, token)
      setPendingFile(null)
      setPreviewUrl(null)
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleCancelPhoto = () => {
    setPendingFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemovePhoto = async () => {
    setRemovingPhoto(true)
    try {
      await api.delete('/profile/photo')
      const token = useAuthStore.getState().token!
      setAuth({ ...user, profile_photo_url: null }, token)
    } finally {
      setRemovingPhoto(false)
    }
  }

  const handleSignatureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSig(true)
    try {
      const form = new FormData()
      form.append('signature', file)
      const { data } = await api.post<{ signature_image_url: string }>('/profile/signature', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSigUrl(data.signature_image_url)
    } finally {
      setUploadingSig(false)
      if (sigInputRef.current) sigInputRef.current.value = ''
    }
  }

  const handleRemoveSignature = async () => {
    setUploadingSig(true)
    try {
      await api.delete('/profile/signature')
      setSigUrl(null)
    } finally {
      setUploadingSig(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const { data } = await api.put('/profile', { name, email, phone, address })
      const token = useAuthStore.getState().token!
      setAuth({ ...user, ...data }, token)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setSaveError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match.'); return }
    if (newPwd.length < 8) { setPwdError('Password must be at least 8 characters.'); return }
    setPwdSaving(true)
    setPwdError(null)
    try {
      await api.put('/profile', { password: newPwd, current_password: currentPwd })
      setPwdSaved(true)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      setChangingPwd(false)
      setTimeout(() => setPwdSaved(false), 3000)
    } catch {
      setPwdError('Current password is incorrect.')
    } finally {
      setPwdSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Hero banner ── */}
      <div
        className="rounded-2xl overflow-hidden mb-0.5"
        style={{ background: 'linear-gradient(135deg, hsl(201 100% 36%) 0%, hsl(210 90% 24%) 100%)' }}
      >
        <div className="px-8 py-7 flex items-center gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white text-3xl font-bold"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.28)' }}
            >
              {displayPhoto
                ? <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                : <span>{user.name.charAt(0).toUpperCase()}</span>
              }
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto || removingPhoto}
              className="absolute inset-0 rounded-full flex items-center justify-center bg-black/35 opacity-0 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
              title="Change photo"
            >
              <Camera size={18} className="text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Name / email / badges */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">{user.name}</h2>
            <p className="text-sm mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.68)' }}>
              {user.email}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
              >
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(52,211,153,0.22)', color: 'rgb(187,247,208)' }}
              >
                Active
              </span>
            </div>

            {pendingFile && (
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleUploadPhoto}
                  disabled={uploadingPhoto}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-60"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  {uploadingPhoto ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                  {uploadingPhoto ? 'Uploading…' : 'Save Photo'}
                </button>
                <button
                  onClick={handleCancelPhoto}
                  disabled={uploadingPhoto}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  Cancel
                </button>
              </div>
            )}
            {!pendingFile && user.profile_photo_url && (
              <button
                onClick={handleRemovePhoto}
                disabled={removingPhoto}
                className="flex items-center gap-1 mt-3 text-xs font-semibold disabled:opacity-60"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {removingPhoto ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Remove photo
              </button>
            )}
          </div>

          {/* Account ID */}
          <div className="hidden sm:block text-right shrink-0">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Account ID</p>
            <p className="text-2xl font-mono font-bold text-white mt-0.5">
              #{user.id.toString().padStart(4, '0')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="personal">
        {/* Tab bar */}
        <div className="bg-white" style={{ borderBottom: '1px solid hsl(210 18% 88%)' }}>
          <TabsList className="w-full justify-start gap-0 bg-transparent rounded-none h-auto p-0 px-2">
            <TabsTrigger value="personal" className={TAB_TRIGGER}>
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="security" className={TAB_TRIGGER}>
              Password &amp; Security
            </TabsTrigger>
            {user.role === 'doctor' && (
              <TabsTrigger value="staff" className={TAB_TRIGGER}>
                My Staff
              </TabsTrigger>
            )}
            {user.role === 'staff' && (
              <TabsTrigger value="physician" className={TAB_TRIGGER}>
                My Physician
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* ── Personal Info ── */}
        <TabsContent
          value="personal"
          className="bg-white rounded-b-xl mt-0 p-6"
          style={{ border: '1px solid hsl(210 18% 88%)', borderTop: 'none' }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name" icon={<User size={11} />}>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="text-sm h-10" />
            </Field>
            <Field label="Email Address" icon={<Mail size={11} />}>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="text-sm h-10" />
            </Field>
            <Field label="Phone Number" icon={<Phone size={11} />}>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09XXXXXXXXX" className="text-sm h-10" />
            </Field>
            <Field label="Address" icon={<MapPin size={11} />}>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Barangay, City" className="text-sm h-10" />
            </Field>
          </div>

          {saveError && <p className="text-xs text-red-500 mt-3">{saveError}</p>}

          <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid hsl(210 18% 92%)' }}>
            <p className="text-xs" style={{ color: saved ? 'hsl(152 50% 38%)' : 'hsl(215 16% 50%)' }}>
              {saved ? '✓ Changes saved successfully' : 'Update your personal details below'}
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-white text-sm font-semibold px-5 py-2 rounded-lg shadow-sm transition-opacity disabled:opacity-60"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
            </button>
          </div>

          {/* Doctor e-signature image — rendered on the Hospital Rx (falls back to typed name). */}
          {user.role === 'doctor' && (
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid hsl(210 18% 92%)' }}>
              <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'hsl(215 30% 14%)' }}>
                <Stethoscope size={13} className="text-teal-600" /> E-Signature
              </p>
              <p className="text-xs mt-0.5 mb-3" style={{ color: 'hsl(215 16% 50%)' }}>
                Upload your signature image (PNG with transparent background works best) — it prints on your prescriptions.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="h-16 w-44 rounded-lg flex items-center justify-center bg-white" style={{ border: '1px dashed hsl(210 18% 80%)' }}>
                  {sigUrl
                    ? <img src={sigUrl} alt="Signature" className="h-12 object-contain" />
                    : <span className="text-xs text-slate-400">No signature uploaded</span>}
                </div>
                <input ref={sigInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleSignatureChange} className="hidden" />
                <button
                  onClick={() => sigInputRef.current?.click()}
                  disabled={uploadingSig}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: 'hsl(201 100% 36%)' }}
                >
                  {uploadingSig ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  {uploadingSig ? 'Saving…' : sigUrl ? 'Replace' : 'Upload signature'}
                </button>
                {sigUrl && (
                  <button onClick={handleRemoveSignature} disabled={uploadingSig} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60">
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Password & Security ── */}
        <TabsContent
          value="security"
          className="bg-white rounded-b-xl mt-0 p-6"
          style={{ border: '1px solid hsl(210 18% 88%)', borderTop: 'none' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>Password</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(215 16% 50%)' }}>
                {pwdSaved ? '✓ Password updated successfully' : 'Keep your account secure with a strong password'}
              </p>
            </div>
            <button
              onClick={() => { setChangingPwd(!changingPwd); setPwdError(null) }}
              className="text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              style={{ color: 'hsl(201 100% 36%)' }}
            >
              {changingPwd ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {changingPwd && (
            <div className="mt-5 space-y-3 pt-4" style={{ borderTop: '1px solid hsl(210 18% 92%)' }}>
              <Field label="Current Password" icon={<Shield size={11} />}>
                <Input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className="text-sm h-10"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="New Password" icon={<Shield size={11} />}>
                  <Input
                    type="password"
                    placeholder="Min. 8 characters"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="text-sm h-10"
                  />
                </Field>
                <Field label="Confirm Password" icon={<Shield size={11} />}>
                  <Input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    className="text-sm h-10"
                  />
                </Field>
              </div>
              {pwdError && <p className="text-xs text-red-500">{pwdError}</p>}
              <button
                onClick={handlePasswordChange}
                disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
                className="text-white text-sm font-semibold px-4 py-2 rounded-lg transition-opacity disabled:opacity-60 flex items-center gap-2"
                style={{ backgroundColor: 'hsl(201 100% 36%)' }}
              >
                {pwdSaving && <Loader2 size={14} className="animate-spin" />}
                {pwdSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          )}
        </TabsContent>

        {/* ── My Staff (doctor only) ── */}
        {user.role === 'doctor' && (
          <TabsContent
            value="staff"
            className="bg-white rounded-b-xl mt-0 p-6"
            style={{ border: '1px solid hsl(210 18% 88%)', borderTop: 'none' }}
          >
            {myStaff.length === 0 ? (
              <div className="py-8 text-center">
                <UserCheck size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm" style={{ color: 'hsl(215 16% 55%)' }}>No staff assigned to you yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myStaff.map((s) => {
                  const status = s.staff_request?.status
                  const badge =
                    status === 'approved'
                      ? { label: 'Authorized', cls: 'bg-emerald-50 text-emerald-700' }
                      : status === 'rejected'
                      ? { label: 'Rejected', cls: 'bg-red-50 text-red-600' }
                      : { label: 'Pending', cls: 'bg-amber-50 text-amber-700' }
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-4 p-3 rounded-xl"
                      style={{ backgroundColor: 'hsl(210 14% 98%)', border: '1px solid hsl(210 18% 92%)' }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: 'hsl(201 100% 36%)' }}
                      >
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: 'hsl(215 30% 14%)' }}>{s.name}</p>
                        <p className="text-xs" style={{ color: 'hsl(215 16% 50%)' }}>{s.email}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        )}

        {/* ── My Physician (staff only) ── */}
        {user.role === 'staff' && (
          <TabsContent
            value="physician"
            className="bg-white rounded-b-xl mt-0 p-6"
            style={{ border: '1px solid hsl(210 18% 88%)', borderTop: 'none' }}
          >
            {!myProfile?.assigned_doctor ? (
              <div className="py-8 text-center">
                <Stethoscope size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm" style={{ color: 'hsl(215 16% 55%)' }}>No physician assigned yet.</p>
              </div>
            ) : (
              <div
                className="flex items-center gap-4 p-4 rounded-xl"
                style={{ backgroundColor: 'hsl(210 14% 98%)', border: '1px solid hsl(210 18% 92%)' }}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ backgroundColor: 'hsl(201 60% 90%)', color: 'hsl(201 100% 30%)' }}
                >
                  {myProfile.assigned_doctor.user?.name?.charAt(0) ?? 'D'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: 'hsl(215 30% 14%)' }}>
                    {myProfile.assigned_doctor.user?.name ?? '—'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(215 16% 50%)' }}>
                    {myProfile.assigned_doctor.specialization}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  myProfile.staff_request?.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700'
                    : myProfile.staff_request?.status === 'rejected'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {myProfile.staff_request?.status === 'approved' ? 'Authorized'
                    : myProfile.staff_request?.status === 'rejected' ? 'Rejected'
                    : 'Pending Approval'}
                </span>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
