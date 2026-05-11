import { useState } from 'react'
import { User, Mail, Phone, MapPin, Shield, Camera } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/features/auth/authStore'

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
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 700))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!user) return null

  return (
    <div className="max-w-2xl space-y-4">
      {/* Hero card */}
      <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid hsl(214 20% 90%)' }}>
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-sm">
              {user.name.charAt(0)}
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center" style={{ border: '1px solid hsl(214 20% 90%)' }}>
              <Camera size={12} className="text-slate-500" />
            </button>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-800">{user.name}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                Active
              </span>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-xs text-slate-400">Account ID</p>
            <p className="text-sm font-mono font-semibold text-slate-600">#{user.id.toString().padStart(4, '0')}</p>
            <p className="text-xs text-slate-400 mt-2">DEAMHI Staff</p>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <Section title="Personal Information" icon={<User size={14} />}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" icon={<User size={11} />}>
            <Input defaultValue={user.name} className="border-slate-200 text-sm h-10" />
          </Field>
          <Field label="Email Address" icon={<Mail size={11} />}>
            <Input type="email" defaultValue={user.email} className="border-slate-200 text-sm h-10" />
          </Field>
          <Field label="Phone Number" icon={<Phone size={11} />}>
            <Input defaultValue={user.phone ?? ''} placeholder="09XXXXXXXXX" className="border-slate-200 text-sm h-10" />
          </Field>
          <Field label="Address" icon={<MapPin size={11} />}>
            <Input defaultValue={user.address ?? ''} placeholder="Barangay, City" className="border-slate-200 text-sm h-10" />
          </Field>
        </div>

        <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid hsl(214 20% 93%)' }}>
          <p className="text-xs text-slate-400">Last updated: today</p>
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
            <p className="text-xs text-slate-400 mt-0.5">Last changed: Never · 2FA: Not configured</p>
          </div>
          <button
            onClick={() => setChangingPwd(!changingPwd)}
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            {changingPwd ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {changingPwd && (
          <div className="mt-5 space-y-3 pt-4" style={{ borderTop: '1px solid hsl(214 20% 93%)' }}>
            <Field label="Current Password" icon={<Shield size={11} />}>
              <Input type="password" placeholder="••••••••" className="border-slate-200 text-sm h-10" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="New Password" icon={<Shield size={11} />}>
                <Input type="password" placeholder="Min. 8 characters" className="border-slate-200 text-sm h-10" />
              </Field>
              <Field label="Confirm Password" icon={<Shield size={11} />}>
                <Input type="password" placeholder="Repeat new password" className="border-slate-200 text-sm h-10" />
              </Field>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors mt-2">
              Update Password
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}
