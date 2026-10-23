import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppErrorFallback } from '@/components/errors/AppErrorFallback'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { AuthProvider } from '@/contexts/AuthContext'
import { queryClient } from '@/lib/queryClient'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      fallback={({ resetError }) => <AppErrorFallback resetError={resetError} />}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)

/** Defer Sentry so it is not in the critical first-load path. */
function loadSentry() {
  void import('@/lib/sentry/init').then((m) => {
    m.initSentry()
  })
}

const w = window as Window &
  typeof globalThis & {
    requestIdleCallback?: (
      cb: IdleRequestCallback,
      opts?: IdleRequestOptions,
    ) => number
  }

if (typeof w.requestIdleCallback === 'function') {
  w.requestIdleCallback(() => loadSentry(), { timeout: 4000 })
} else {
  globalThis.setTimeout(loadSentry, 2000)
}
