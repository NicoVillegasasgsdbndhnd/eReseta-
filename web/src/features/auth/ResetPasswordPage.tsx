import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import axios from 'axios'
import { resetPasswordSchema, type ResetPasswordInput } from './schemas'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [showPwd, setShowPwd] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  // A reset link must carry both token and email — otherwise it's malformed/expired.
  if (!token || !email) {
    return (
      <Card className="shadow-lg border-[var(--color-border)]">
        <CardContent className="flex flex-col items-center gap-4 pb-6 pt-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Invalid reset link</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              This link is missing information or has expired. Please request a new one.
            </p>
          </div>
          <Link to="/forgot-password" className="text-sm font-medium text-teal-600 hover:underline">
            Request a new link
          </Link>
        </CardContent>
      </Card>
    )
  }

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true)
    setApiError(null)
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password: data.password,
        password_confirmation: data.password_confirmation,
      })
      setDone(true)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        setApiError('This reset link is invalid or has expired. Please request a new one.')
      } else if (axios.isAxiosError(err) && err.response) {
        setApiError(err.response.data?.message ?? 'Could not reset your password. Please try again.')
      } else {
        setApiError('Could not reach the server. Check your connection and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (done) {
    return (
      <Card className="shadow-lg border-[var(--color-border)]">
        <CardContent className="flex flex-col items-center gap-4 pb-6 pt-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Password reset</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Your password has been updated. You can now sign in with your new password.
            </p>
          </div>
          <Button onClick={() => navigate('/login')} className="w-full bg-teal-600 hover:bg-teal-700">
            Go to sign in
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-[var(--color-border)]">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold">
          <ShieldCheck size={22} className="text-teal-600" /> Set a new password
        </CardTitle>
        <CardDescription className="text-center">
          for <span className="font-medium text-slate-700">{email}</span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[var(--color-foreground)]">
              New password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPwd ? 'text' : 'password'}
                placeholder="Enter a strong password"
                autoComplete="new-password"
                {...register('password')}
                aria-invalid={!!errors.password}
                className={errors.password ? 'pr-10 border-red-400 focus-visible:ring-red-400' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password_confirmation" className="text-sm font-medium text-[var(--color-foreground)]">
              Confirm new password
            </label>
            <Input
              id="password_confirmation"
              type={showPwd ? 'text' : 'password'}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              {...register('password_confirmation')}
              aria-invalid={!!errors.password_confirmation}
              className={errors.password_confirmation ? 'border-red-400 focus-visible:ring-red-400' : ''}
            />
            {errors.password_confirmation && (
              <p className="text-xs text-red-600">{errors.password_confirmation.message}</p>
            )}
          </div>

          {apiError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{apiError}</p>
          )}

          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Resetting…
              </>
            ) : (
              'Reset password'
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t border-[var(--color-border)] pt-4">
        <Link to="/login" className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:underline">
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  )
}
