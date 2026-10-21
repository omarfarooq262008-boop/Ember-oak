import { CheckCircle2Icon, Loader2Icon, AlertCircleIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Seo } from '@/components/seo/Seo'
import { Button } from '@/components/ui/button'
import { store } from '@/config/store'
import { isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; time: string }
  | { kind: 'error' }

async function fetchHealth(): Promise<HealthState> {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(
    /\/$/,
    '',
  )
  if (!base) return { kind: 'error' }

  try {
    // Public endpoint — no Authorization / apikey required (verify_jwt = false).
    const res = await fetch(`${base}/functions/v1/health`, { method: 'GET' })
    const body = (await res.json().catch(() => null)) as {
      status?: string
      time?: string
    } | null
    if (res.ok && body?.status === 'ok') {
      return { kind: 'ok', time: body.time ?? new Date().toISOString() }
    }
    return { kind: 'error' }
  } catch {
    return { kind: 'error' }
  }
}

export function StatusPage() {
  const [state, setState] = useState<HealthState>({ kind: 'loading' })

  const refresh = () => {
    setState({ kind: 'loading' })
    void fetchHealth().then(setState)
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <>
      <Seo
        title="Status"
        description={`${store.name} system status`}
        noindex
      />

      <div className="section-pad container-eo mx-auto flex max-w-lg flex-col items-center text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          {store.name}
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold md:text-4xl">
          System status
        </h1>

        {!isSupabaseConfigured ? (
          <p className="mt-6 text-sm text-muted">
            Status checks are unavailable in this environment.
          </p>
        ) : (
          <div
            className={cn(
              'mt-10 w-full rounded-(--radius-card) border border-border bg-surface px-6 py-10',
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {state.kind === 'loading' ? (
              <div className="flex flex-col items-center gap-3 text-muted">
                <Loader2Icon className="size-8 animate-spin" aria-hidden />
                <p className="text-sm">Checking systems…</p>
              </div>
            ) : state.kind === 'ok' ? (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle2Icon
                  className="size-10 text-success"
                  aria-hidden
                />
                <p className="font-display text-xl font-semibold text-text">
                  All systems working
                </p>
                <p className="text-xs text-muted">
                  Last check {new Date(state.time).toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <AlertCircleIcon className="size-10 text-error" aria-hidden />
                <p className="font-display text-xl font-semibold text-text">
                  We&apos;re having a problem
                </p>
                <p className="text-sm text-muted">
                  Our team has been notified. Please try again shortly.
                </p>
              </div>
            )}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          className="mt-8"
          onClick={refresh}
          disabled={state.kind === 'loading'}
        >
          Check again
        </Button>
      </div>
    </>
  )
}
