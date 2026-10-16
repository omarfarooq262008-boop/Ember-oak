import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function CatalogError({
  message = 'We couldn’t load this right now. Check your connection and try again.',
  onRetry,
  className,
}: {
  message?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-(--radius-card) border border-border bg-surface px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <p className="text-sm text-muted">{message}</p>
      {onRetry ? (
        <Button type="button" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="space-y-3">
          <Skeleton className="aspect-product w-full rounded-(--radius-card)" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </li>
      ))}
    </ul>
  )
}

export function SectionSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-(--radius-card)" />
    </div>
  )
}

export function QueryGate({
  isLoading,
  isError,
  onRetry,
  skeleton,
  children,
}: {
  isLoading: boolean
  isError: boolean
  onRetry?: () => void
  skeleton?: ReactNode
  children: ReactNode
}) {
  if (isLoading) return <>{skeleton ?? <SectionSkeleton />}</>
  if (isError) return <CatalogError onRetry={onRetry} />
  return <>{children}</>
}
