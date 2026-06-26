import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { forgotPasswordSchema, type ForgotPasswordInput } from './schemas'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true)
    setApiError(null)
    try {
      // The API always responds generically (it never reveals whether the email exists),
      // so we always show the confirmation screen unless the request itself failed.
      await api.post('/auth/forgot-password', { email: data.email })
      setSubmittedEmail(data.email)
      setSubmitted(true)
    } catch {
      setApiError('Could not reach the server. Check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card className="shadow-lg border-[var(--color-border)]">
        <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <MailCheck size={32} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Check your email</h2>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              We sent a password reset link to
            </p>
            <p className="text-sm font-medium mt-0.5">{submittedEmail}</p>
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)] max-w-xs">
            Didn't receive it? Check your spam folder or{' '}
            <button
              onClick={() => setSubmitted(false)}
              className="text-teal-600 hover:underline"
            >
              try again
            </button>
            .
          </p>
        </CardContent>
        <CardFooter className="justify-center border-t border-[var(--color-border)] pt-4">
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm text-teal-600 font-medium hover:underline"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-[var(--color-border)]">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold text-center">Forgot password?</CardTitle>
        <CardDescription className="text-center">
          Enter your email and we'll send you a reset link.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-[var(--color-foreground)]">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@deamhi.test"
              autoComplete="email"
              {...register('email')}
              aria-invalid={!!errors.email}
              className={errors.email ? 'border-red-400 focus-visible:ring-red-400' : ''}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          {apiError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{apiError}</p>
          )}

          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Sending reset link…
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t border-[var(--color-border)] pt-4">
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-sm text-teal-600 font-medium hover:underline"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  )
}
