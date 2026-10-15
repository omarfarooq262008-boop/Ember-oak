import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        'animate-pulse rounded-(--radius-sm) bg-[color-mix(in_srgb,var(--color-border)_55%,var(--color-background))]',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
