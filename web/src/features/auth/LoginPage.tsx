import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, User, Stethoscope, Pill, ShieldCheck, MonitorDot } from 'lucide-react'
import { useAuthStore } from './authStore'
import { Input } from '@/components/ui/input'
import type { Role } from '@/mocks/types'

// ── Role selector config ───────────────────────────────────────────
const ROLES: {
  role: Role
  label: string
  email: string
  description: string
  icon: React.ReactNode
  color: string
  activeColor: string
}[] = [
  {
    role: 'patient',
    label: 'Patient',
    email: 'patient@deamhi.test',
    description: 'Book appointments & view prescriptions',
    icon: <User size={16} />,
    color: 'border-slate-200 text-slate-500',
    activeColor: 'border-blue-500 bg-blue-50 text-blue-700',
  },
  {
    role: 'doctor',
    label: 'Doctor',
    email: 'doctor@deamhi.test',
    description: 'Manage consultations & issue Rx',
    icon: <Stethoscope size={16} />,
    color: 'border-slate-200 text-slate-500',
    activeColor: 'border-indigo-500 bg-indigo-50 text-indigo-700',
  },
  {
    role: 'pharmacist',
    label: 'Pharmacist',
    email: 'pharmacist@deamhi.test',
    description: 'Verify & dispense prescriptions',
    icon: <Pill size={16} />,
    color: 'border-slate-200 text-slate-500',
    activeColor: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  },
  {
    role: 'admin',
    label: 'Admin',
    email: 'admin@deamhi.test',
    description: 'Full system access & reports',
    icon: <ShieldCheck size={16} />,
    color: 'border-slate-200 text-slate-500',
    activeColor: 'border-amber-500 bg-amber-50 text-amber-700',
  },
  {
    role: 'it_admin',
    label: 'IT Admin',
    email: 'it@deamhi.test',
    description: 'Users, audit logs & system config',
    icon: <MonitorDot size={16} />,
    color: 'border-slate-200 text-slate-500',
    activeColor: 'border-rose-500 bg-rose-50 text-rose-700',
  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { switchRole } = useAuthStore()
  const [selectedRole, setSelectedRole] = useState<Role>('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const selected = ROLES.find((r) => r.role === selectedRole)!

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 700))
    switchRole(selectedRole)
    navigate('/dashboard')
    setIsLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8" style={{ border: '1px solid hsl(214 20% 90%)' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to your DEAMHI eReseta+ account</p>
      </div>

      {/* Role selector */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Sign in as</p>
        <div className="grid grid-cols-5 gap-2">
          {ROLES.map((r) => (
            <button
              key={r.role}
              type="button"
              onClick={() => setSelectedRole(r.role)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center ${
                selectedRole === r.role ? r.activeColor : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
              }`}
            >
              {r.icon}
              <span className="text-[11px] font-semibold leading-none">{r.label}</span>
            </button>
          ))}
        </div>
        {/* Description of selected role */}
        <p className="text-xs text-slate-500 mt-2 text-center">{selected.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email — pre-filled based on role */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            value={selected.email}
            readOnly
            className="h-11 text-sm border-slate-200 bg-slate-50 text-slate-500 cursor-default"
          />
          <p className="text-[10px] text-slate-400">Auto-filled for dev mode</p>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              defaultValue="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="h-11 text-sm border-slate-200 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-sm"
        >
          {isLoading
            ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
            : `Sign in as ${selected.label}`}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="text-blue-600 font-semibold hover:underline">
          Register here
        </Link>
      </p>
    </div>
  )
}
