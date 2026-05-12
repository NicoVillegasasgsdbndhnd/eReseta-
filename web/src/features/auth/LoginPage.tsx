import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import {
  Eye, EyeOff, Loader2, User, Stethoscope, Pill,
  ShieldCheck, MonitorDot, AlertCircle,
} from 'lucide-react'
import { useAuthStore } from './authStore'
import { loginSchema, type LoginInput } from './schemas'
import { Input } from '@/components/ui/input'
import type { Role } from '@/mocks/types'

const ROLES: {
  role: Role
  label: string
  email: string
  description: string
  icon: React.ReactNode
  activeColor: string
}[] = [
  {
    role: 'patient',
    label: 'Patient',
    email: 'patient@deamhi.test',
    description: 'Book appointments & view prescriptions',
    icon: <User size={16} />,
    activeColor: 'border-blue-500 bg-blue-50 text-blue-700',
  },
  {
    role: 'doctor',
    label: 'Doctor',
    email: 'doctor@deamhi.test',
    description: 'Manage consultations & issue Rx',
    icon: <Stethoscope size={16} />,
    activeColor: 'border-indigo-500 bg-indigo-50 text-indigo-700',
  },
  {
    role: 'pharmacist',
    label: 'Pharmacist',
    email: 'pharmacist@deamhi.test',
    description: 'Verify & dispense prescriptions',
    icon: <Pill size={16} />,
    activeColor: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  },
  {
    role: 'admin',
    label: 'Admin',
    email: 'admin@deamhi.test',
    description: 'Full system access & reports',
    icon: <ShieldCheck size={16} />,
    activeColor: 'border-amber-500 bg-amber-50 text-amber-700',
  },
  {
    role: 'it_admin',
    label: 'IT Admin',
    email: 'it@deamhi.test',
    description: 'Users, audit logs & system config',
    icon: <MonitorDot size={16} />,
    activeColor: 'border-rose-500 bg-rose-50 text-rose-700',
  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [selectedRole, setSelectedRole] = useState<Role>('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const selected = ROLES.find((r) => r.role === selectedRole)!

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'admin@deamhi.test', password: 'password' },
  })

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role)
    setValue('email', ROLES.find((r) => r.role === role)!.email)
    setApiError(null)
  }

  const onSubmit = async (data: LoginInput) => {
    setApiError(null)
    try {
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setApiError(err.response?.data?.message ?? 'Invalid credentials. Please try again.')
      } else {
        setApiError('Something went wrong. Please try again.')
      }
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8" style={{ border: '1px solid hsl(214 20% 90%)' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to your DEAMHI eReseta+ account</p>
      </div>

      {/* Role selector — dev convenience */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Sign in as</p>
        <div className="grid grid-cols-5 gap-2">
          {ROLES.map((r) => (
            <button
              key={r.role}
              type="button"
              onClick={() => handleRoleSelect(r.role)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center ${
                selectedRole === r.role
                  ? r.activeColor
                  : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
              }`}
            >
              {r.icon}
              <span className="text-[11px] font-semibold leading-none">{r.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">{selected.description}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            readOnly
            {...register('email')}
            className="h-11 text-sm border-slate-200 bg-slate-50 text-slate-500 cursor-default"
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

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
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
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
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {apiError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5" style={{ border: '1px solid hsl(0 72% 90%)' }}>
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600">{apiError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-sm"
        >
          {isSubmitting
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
