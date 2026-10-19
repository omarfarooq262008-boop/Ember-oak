import { Loader2Icon } from 'lucide-react'
import { Outlet } from 'react-router-dom'

import { Seo } from '@/components/seo/Seo'
import { useAuth } from '@/contexts/AuthContext'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function AdminGate() {
  const { profile, loading, user } = useAuth()

  // Wait for profile when a session exists so refresh doesn't flash the 404.
  if (loading || (user && !profile)) {
    return (
      <>
        <Seo title="Admin" noindex />
        <div className="flex min-h-dvh items-center justify-center bg-background">
          <Loader2Icon className="size-8 animate-spin text-muted" aria-label="Loading" />
        </div>
      </>
    )
  }

  if (!profile?.is_admin) {
    return <NotFoundPage />
  }

  return (
    <>
      <Seo title="Admin" noindex />
      <Outlet />
    </>
  )
}
