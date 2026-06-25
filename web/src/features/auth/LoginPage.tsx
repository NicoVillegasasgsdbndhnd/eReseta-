import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react'
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
        setApiError(
          err.response
            ? err.response.data?.message ?? 'Invalid credentials. Please try again.'
            : 'Cannot reach the eReseta+ API. Check that the backend server is running and reachable from this device.',
        )
      } else {
        setApiError('Something went wrong. Please try again.')
      }
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Sign in with your assigned DEAMHI eReseta+ account to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold text-slate-700">
            Email address
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="name@deamhi.test"
              autoComplete="email"
              {...register('email')}
              className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-10 text-sm shadow-none focus-visible:bg-white"
            />
          </div>
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-semibold text-[hsl(201_100%_36%)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <LockKeyhole size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              {...register('password')}
              className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-10 pr-11 text-sm shadow-none focus-visible:bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center rounded-md px-1 text-slate-500 hover:text-slate-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        </div>

        {apiError && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-3" style={{ border: '1px solid hsl(0 72% 90%)' }}>
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-xs leading-5 text-red-600">{apiError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(201_100%_36%)] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[hsl(201_100%_30%)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </div>
  )
}
