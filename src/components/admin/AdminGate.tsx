import { Loader2Icon } from 'lucide-react'
import { Outlet } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function AdminGate() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2Icon className="size-8 animate-spin text-muted" aria-label="Loading" />
      </div>
    )
  }

  if (!profile?.is_admin) {
    return <NotFoundPage />
  }

  return <Outlet />
}
