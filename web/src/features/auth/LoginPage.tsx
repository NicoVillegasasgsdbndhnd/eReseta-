import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { useAuthStore } from './authStore'
import { loginSchema, type LoginInput } from './schemas'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

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
    <div className="bg-white rounded-2xl shadow-sm p-8" style={{ border: '1px solid var(--color-border)' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to your DEAMHI eReseta+ account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            {...register('email')}
            className="h-11 text-sm border-slate-200"
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Password
          </label>
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
              className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-600"
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
          className="w-full h-11 bg-[var(--color-primary)] hover:bg-[hsl(168_79%_31%)] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-sm"
        >
          {isSubmitting
            ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
            : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
