import { useRef, useState } from 'react'
import { User, Mail, Phone, MapPin, Shield, Camera, Trash2, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/features/auth/authStore'
import api from '@/lib/api'

const ROLE_LABELS: Record<string, string> = {
  patient:    'Patient',
  doctor:     'Physician',
  pharmacist: 'Pharmacist',
  admin:      'Administrator',
  it_admin:   'IT Administrator',
}

const ROLE_COLORS: Record<string, string> = {
  patient:    'bg-blue-50 text-blue-700',
  doctor:     'bg-indigo-50 text-indigo-700',
  pharmacist: 'bg-emerald-50 text-emerald-700',
  admin:      'bg-amber-50 text-amber-700',
  it_admin:   'bg-rose-50 text-rose-700',
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid hsl(214 20% 90%)' }}>
      <div className="flex items-center gap-2 mb-5" style={{ paddingBottom: '1rem', borderBottom: '1px solid hsl(214 20% 93%)' }}>
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
          {icon}
        </div>
        <p className="font-semibold text-slate-700">{title}</p>
      </div>
      {children}
    </div>
  )
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <span>{icon}</span>
        {label}
      </label>
      {children}
    </div>
  )
}

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Photo state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [removingPhoto, setRemovingPhoto] = useState(false)

  // Profile form state
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [address, setAddress] = useState(user?.address ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Password state
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
    <div className="max-w-2xl space-y-4">
      {/* Hero card */}
      <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-sm">
              {displayPhoto
                ? <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                : <span>{user.name.charAt(0)}</span>
              }
            </div>
            {/* Camera overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto || removingPhoto}
              className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
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

          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-slate-800 truncate">{user.name}</h3>
            <p className="text-sm text-slate-500 mt-0.5 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                Active
              </span>
            </div>

            {/* Pending upload actions */}
            {pendingFile && (
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleUploadPhoto}
                  disabled={uploadingPhoto}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {uploadingPhoto ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                  {uploadingPhoto ? 'Uploading…' : 'Save Photo'}
                </button>
                <button
                  onClick={handleCancelPhoto}
                  disabled={uploadingPhoto}
                  className="text-xs font-semibold px-3 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Remove photo */}
            {!pendingFile && user.profile_photo_url && (
              <button
                onClick={handleRemovePhoto}
                disabled={removingPhoto}
                className="flex items-center gap-1 mt-3 text-xs text-red-500 hover:text-red-600 font-semibold disabled:opacity-60"
              >
                {removingPhoto ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Remove photo
              </button>
            )}
          </div>

          <div className="hidden sm:block text-right shrink-0">
            <p className="text-xs text-slate-400">Account ID</p>
            <p className="text-sm font-mono font-semibold text-slate-600">#{user.id.toString().padStart(4, '0')}</p>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <Section title="Personal Information" icon={<User size={14} />}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" icon={<User size={11} />}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-slate-200 text-sm h-10"
            />
          </Field>
          <Field label="Email Address" icon={<Mail size={11} />}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-slate-200 text-sm h-10"
            />
          </Field>
          <Field label="Phone Number" icon={<Phone size={11} />}>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09XXXXXXXXX"
              className="border-slate-200 text-sm h-10"
            />
          </Field>
          <Field label="Address" icon={<MapPin size={11} />}>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Barangay, City"
              className="border-slate-200 text-sm h-10"
            />
          </Field>
        </div>

        {saveError && (
          <p className="text-xs text-red-500 mt-3">{saveError}</p>
        )}

        <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid hsl(214 20% 93%)' }}>
          <p className="text-xs text-slate-400">
            {saved ? '✓ Changes saved successfully' : 'Update your personal details below'}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-sm transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </Section>

      {/* Security */}
      <Section title="Password & Security" icon={<Shield size={14} />}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Password</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {pwdSaved ? '✓ Password updated successfully' : 'Keep your account secure with a strong password'}
            </p>
          </div>
          <button
            onClick={() => { setChangingPwd(!changingPwd); setPwdError(null) }}
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            {changingPwd ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {changingPwd && (
          <div className="mt-5 space-y-3 pt-4" style={{ borderTop: '1px solid hsl(214 20% 93%)' }}>
            <Field label="Current Password" icon={<Shield size={11} />}>
              <Input
                type="password"
                placeholder="Enter current password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                className="border-slate-200 text-sm h-10"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="New Password" icon={<Shield size={11} />}>
                <Input
                  type="password"
                  placeholder="Min. 8 characters"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="border-slate-200 text-sm h-10"
                />
              </Field>
              <Field label="Confirm Password" icon={<Shield size={11} />}>
                <Input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="border-slate-200 text-sm h-10"
                />
              </Field>
            </div>
            {pwdError && <p className="text-xs text-red-500">{pwdError}</p>}
            <button
              onClick={handlePasswordChange}
              disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {pwdSaving && <Loader2 size={14} className="animate-spin" />}
              {pwdSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}
