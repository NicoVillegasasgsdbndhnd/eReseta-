import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { registerSchema, type RegisterInput } from './schemas'
import { useAuthStore } from './authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { switchRole } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (_data: RegisterInput) => {
    setIsLoading(true)
    try {
      // Phase 4: replace with real API call
      await new Promise((r) => setTimeout(r, 800))
      switchRole('patient')
      navigate('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-lg border-[var(--color-border)]">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold text-center">Create account</CardTitle>
        <CardDescription className="text-center">
          Register as a DEAMHI patient
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-[var(--color-foreground)]">
              Full name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Juan dela Cruz"
              autoComplete="name"
              {...register('name')}
              aria-invalid={!!errors.name}
              className={errors.name ? 'border-red-400 focus-visible:ring-red-400' : ''}
            />
            {errors.name && (
              <p className="text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-[var(--color-foreground)]">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              {...register('email')}
              aria-invalid={!!errors.email}
              className={errors.email ? 'border-red-400 focus-visible:ring-red-400' : ''}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[var(--color-foreground)]">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
                autoComplete="new-password"
                {...register('password')}
                aria-invalid={!!errors.password}
                className={errors.password ? 'border-red-400 focus-visible:ring-red-400 pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label htmlFor="password_confirmation" className="text-sm font-medium text-[var(--color-foreground)]">
              Confirm password
            </label>
            <div className="relative">
              <Input
                id="password_confirmation"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter password"
                autoComplete="new-password"
                {...register('password_confirmation')}
                aria-invalid={!!errors.password_confirmation}
                className={errors.password_confirmation ? 'border-red-400 focus-visible:ring-red-400 pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password_confirmation && (
              <p className="text-xs text-red-600">{errors.password_confirmation.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t border-[var(--color-border)] pt-4">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
