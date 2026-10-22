import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { isDemoMode } from '@/lib/demoMode'
import { formatPKR } from '@/lib/format'
import {
  fetchPaymentProviderName,
  resolveMockCheckoutAccess,
  type MockCheckoutAccess,
} from '@/lib/paymentProvider'
import { setSentryOrderStage } from '@/lib/sentry/tags'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

/**
 * Hosted fake checkout for PAYMENT_PROVIDER=mock.
 * Never holds the webhook secret — signs via mock-sign-payment edge function.
 *
 * Page visibility: VITE_DEMO_MODE=true, or health.paymentProvider=mock.
 * mock-sign-payment still refuses unless PAYMENT_PROVIDER=mock.
 */
export function MockCheckoutPage() {
  const demoMode = isDemoMode()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<'paid' | 'failed' | 'cancelled' | null>(null)
  const [access, setAccess] = useState<MockCheckoutAccess>(() =>
    demoMode ? 'checkout' : 'loading',
  )

  const orderNumber = params.get('order') ?? ''
  const amount = Number(params.get('amount') ?? 0)
  const currency = params.get('currency') ?? 'PKR'
  const email = params.get('email') ?? ''
  const cancelUrl = params.get('cancel') ?? '/checkout?payment=cancelled'

  const amountLabel = useMemo(() => {
    if (!Number.isFinite(amount) || amount <= 0) return '—'
    return currency === 'PKR' ? formatPKR(amount) : `${currency} ${amount}`
  }, [amount, currency])

  useEffect(() => {
    if (demoMode) {
      setAccess(
        resolveMockCheckoutAccess({
          loading: false,
          provider: null,
          demoMode: true,
        }),
      )
      return
    }
    let cancelled = false
    void (async () => {
      const { provider, error } = await fetchPaymentProviderName()
      if (cancelled) return
      setAccess(
        resolveMockCheckoutAccess({
          loading: false,
          provider,
          error,
          demoMode: false,
        }),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [demoMode])

  useEffect(() => {
    if (access === 'checkout') setSentryOrderStage('mock_payment')
  }, [access])

  if (access === 'loading') {
    return (
      <>
        <Seo title="Mock checkout" noindex />
        <div className="section-pad container-eo mx-auto max-w-md">
          <p className="text-sm text-muted">Checking payment provider…</p>
        </div>
      </>
    )
  }

  if (access === 'notfound') {
    return <NotFoundPage />
  }

  const signOutcome = async (outcome: 'paid' | 'failed' | 'cancelled') => {
    if (!orderNumber) {
      toast.error('Missing order number')
      return
    }
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase is not configured')
      return
    }
    setBusy(outcome)
    try {
      const { data, error } = await supabase.functions.invoke('mock-sign-payment', {
        body: { orderNumber, outcome },
      })
      if (error) {
        const ctx = error as { context?: Response; message?: string }
        let message = error.message || 'Payment action failed'
        try {
          const body = ctx.context ? await ctx.context.json() : null
          if (body?.error) message = String(body.error)
        } catch {
          /* ignore */
        }
        toast.error(message)
        return
      }
      const body = data as {
        error?: string
        redirectUrl?: string
        outcome?: string
      } | null
      if (body?.error) {
        toast.error(body.error)
        return
      }
      if (body?.redirectUrl) {
        if (body.redirectUrl.startsWith('http')) {
          window.location.assign(body.redirectUrl)
        } else {
          navigate(body.redirectUrl, { replace: true })
        }
        return
      }
      if (outcome === 'paid') {
        navigate(`/order-confirmation/${encodeURIComponent(orderNumber)}?paid=1`, {
          replace: true,
        })
      } else {
        navigate(
          cancelUrl.startsWith('http') ? '/checkout?payment=' + outcome : cancelUrl,
          { replace: true },
        )
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Seo title="Mock checkout" description="Demo payment page — not a real card form." noindex />
      <div className="section-pad container-eo mx-auto max-w-md">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Mock payment provider
        </p>
        <h1 className="mt-2 text-3xl">Complete payment</h1>
        <p className="mt-2 text-sm font-medium text-text">
          Test mode: no real money is charged.
        </p>
        <p className="mt-2 text-sm text-muted">
          This is a hosted fake checkout. No card data is collected or stored. The browser never
          holds the webhook secret — outcomes are signed server-side only when{' '}
          <code className="text-xs">PAYMENT_PROVIDER=mock</code>.
        </p>

        <div className="mt-8 space-y-3 rounded-(--radius-card) border border-border bg-surface p-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Order</span>
            <span className="font-medium tabular-nums">{orderNumber || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Amount</span>
            <span className="font-medium tabular-nums">{amountLabel}</span>
          </div>
          {email ? (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Email</span>
              <span className="truncate pl-4">{email}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Button
            type="button"
            disabled={!orderNumber || busy !== null}
            onClick={() => void signOutcome('paid')}
          >
            {busy === 'paid' ? 'Processing…' : 'Pay successfully'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!orderNumber || busy !== null}
            onClick={() => void signOutcome('failed')}
          >
            {busy === 'failed' ? 'Processing…' : 'Payment fails'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy !== null}
            onClick={() => void signOutcome('cancelled')}
          >
            {busy === 'cancelled' ? 'Processing…' : 'Cancel'}
          </Button>
        </div>

        <p className="mt-8 text-center text-sm text-muted">
          <Link to="/checkout" className="underline hover:text-accent">
            Back to checkout
          </Link>
        </p>
      </div>
    </>
  )
}
