import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { useAuth } from '../../lib/hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { FloatingNeuralNetwork } from '../../components/FloatingNeuralNetwork'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn, signInWithGitHub } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/dashboard'
  const oauthError = new URLSearchParams(window.location.search).get('error_description')
  const [authError, setAuthError] = React.useState<string | null>(oauthError)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function handleGitHubSignIn() {
    setAuthError(null)
    try {
      await signInWithGitHub()
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'GitHub sign in failed')
    }
  }

  async function onSubmit(data: FormValues) {
    setAuthError(null)
    try {
      await signIn(data.email, data.password)
      navigate(from, { replace: true })
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign in failed')
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
          <h1 className="text-2xl font-semibold text-neutral-950">Welcome back</h1>
          <p className="text-sm text-neutral-500 mt-1">Sign in to Experiment</p>
        </div>

        {/* Card */}
        <div className="card px-6 py-7">
          {authError && (
            <div
              role="alert"
              className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700"
            >
              {authError}
            </div>
          )}

          <Button type="button" variant="secondary" className="w-full" onClick={handleGitHubSignIn}>
            <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[9px] font-bold">GH</span> Continue with GitHub
          </Button>
          <div className="flex items-center gap-3 my-5 text-xs text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" />
            <span>or continue with email</span>
            <span className="h-px flex-1 bg-neutral-200" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="text-right">
                <Link
                  to="/reset-password"
                  className="text-xs text-neutral-950 hover:text-neutral-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
              Sign In
            </Button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-neutral-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-neutral-950 font-medium hover:text-neutral-700 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
