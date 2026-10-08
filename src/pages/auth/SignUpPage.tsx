import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { FlaskConical, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../lib/hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const schema = z
  .object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export default function SignUpPage() {
  const { signUp } = useAuth()
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
      await signUp(data.email, data.password, data.fullName)
      setSuccess(true)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign up failed')
    }
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full" style={{ maxWidth: '420px' }}>
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pink mb-4">
            <FlaskConical size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-950">Create your account</h1>
          <p className="text-sm text-neutral-500 mt-1">Start tracking your ML experiments</p>
        </div>

        {/* Success state */}
        {success ? (
          <div className="card px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 mb-4">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-950 mb-2">Check your email</h2>
            <p className="text-sm text-neutral-500 leading-relaxed">
              We&apos;ve sent a confirmation link to your email address. Click it to activate your
              account.
            </p>
            <div className="mt-6 pt-6 border-t border-neutral-100">
              <p className="text-sm text-neutral-500">
                Already confirmed?{' '}
                <Link
                  to="/login"
                  className="text-pink font-medium hover:text-pink-hover transition-colors"
                >
                  Sign in
                </Link>
              </p>
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
                label="Full Name"
                type="text"
                placeholder="Alex Johnson"
                autoComplete="name"
                error={errors.fullName?.message}
                {...register('fullName')}
              />
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                error={errors.password?.message}
                hint="At least 8 characters"
                {...register('password')}
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
                Create Account
              </Button>
            </form>
          </div>
        )}

        {/* Footer link */}
        {!success && (
          <p className="text-center text-sm text-neutral-500 mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-pink font-medium hover:text-pink-hover transition-colors"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
