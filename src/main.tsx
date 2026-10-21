import { QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppErrorFallback } from '@/components/errors/AppErrorFallback'
import { AuthProvider } from '@/contexts/AuthContext'
import { initSentry } from '@/lib/sentry/init'
import { queryClient } from '@/lib/queryClient'
import App from './App.tsx'
import './index.css'

initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={({ resetError }) => <AppErrorFallback resetError={resetError} />}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
