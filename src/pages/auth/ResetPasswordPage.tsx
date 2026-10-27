import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { FlaskConical, MailCheck } from 'lucide-react'
import { useAuth } from '../../lib/hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { FloatingNeuralNetwork } from '../../components/FloatingNeuralNetwork'

const schema = z.object({
  email: z.string().email('Invalid email address'),
})
type FormValues = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const [authError, setAuthError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormValues) {
    setAuthError(null)
    try {
      await resetPassword(data.email)
      setSuccess(true)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Request failed')
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-page flex items-center justify-center px-4">
      <FloatingNeuralNetwork density="auth" className="fixed opacity-100" />
      <div className="relative z-10 w-full" style={{ maxWidth: '420px' }}>
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-950 mb-4">
            <FlaskConical size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-950">Reset your password</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {/* Success state */}
        {success ? (
          <div className="card px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-200 mb-4">
              <MailCheck size={24} className="text-neutral-950" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-950 mb-2">Check your email</h2>
            <p className="text-sm text-neutral-500 leading-relaxed">
              If an account with that email exists, we&apos;ve sent a password reset link. It may
              take a minute to arrive.
            </p>
            <div className="mt-6 pt-6 border-t border-neutral-100">
              <Link
                to="/login"
                className="text-sm text-neutral-950 font-medium hover:text-neutral-700 transition-colors"
              >
                ← Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          /* Card */
          <div className="card px-6 py-7">
            {authError && (
              <div
                role="alert"
                className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700"
              >
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
                Send Reset Link
              </Button>
            </form>
          </div>
        )}

        {/* Footer link */}
        {!success && (
          <p className="text-center text-sm text-neutral-500 mt-6">
            Remember your password?{' '}
            <Link
              to="/login"
              className="text-neutral-950 font-medium hover:text-neutral-700 transition-colors"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
