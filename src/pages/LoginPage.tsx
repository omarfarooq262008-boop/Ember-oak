import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const { user, loading, configured, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'signup' ? 'signup' : 'login'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/account" replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    const result =
      mode === 'signup'
        ? await signUp(email, password, fullName)
        : await signIn(email, password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    if (mode === 'signup') {
      toast.success('Account created. You can shop and checkout as usual.')
    }
    navigate('/account', { replace: true })
  }

  return (
    <>
      <Seo
        title={mode === 'signup' ? 'Create account' : 'Log in'}
        description="Sign in to Ember & Oak — guest checkout still works without an account."
      />

      <div className="section-pad container-eo mx-auto max-w-md">
        <h1 className="text-3xl">{mode === 'signup' ? 'Create account' : 'Log in'}</h1>
        <p className="mt-2 text-sm text-muted">
          Guest checkout still works — an account is optional for order history and
          wishlist sync.
        </p>

        {!configured ? (
          <p className="mt-8 rounded-(--radius-card) border border-border bg-surface p-4 text-sm text-muted">
            Accounts require Supabase. Set <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
            {mode === 'signup' ? (
              <div className="space-y-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={8}
                required
              />
              <p className="text-xs text-muted">At least 8 characters.</p>
            </div>
            {error ? (
              <p className="text-sm text-error" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting
                ? 'Please wait…'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Log in'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-sm text-muted">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <Link to="/login" className="text-text underline hover:text-accent">
                Log in
              </Link>
            </>
          ) : (
            <>
              New here?{' '}
              <Link
                to="/login?mode=signup"
                className="text-text underline hover:text-accent"
              >
                Create an account
              </Link>
            </>
          )}
        </p>
        <p className="mt-2 text-sm text-muted">
          Prefer not to?{' '}
          <Link to="/checkout" className="text-text underline hover:text-accent">
            Continue as guest
          </Link>
        </p>
      </div>
    </>
  )
}
