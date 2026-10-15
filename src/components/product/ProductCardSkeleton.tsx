import { Skeleton } from '@/components/ui/skeleton'

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="aspect-product w-full rounded-(--radius-card)" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  )
}
