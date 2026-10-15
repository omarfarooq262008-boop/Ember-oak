import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type InputProps = ComponentProps<'input'> & {
  error?: boolean
}

function Input({ className, type = 'text', error, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      aria-invalid={error ? true : undefined}
      className={cn(
        'flex min-h-[44px] w-full rounded-(--radius-sm) border border-border bg-surface px-4 py-2 text-sm text-text shadow-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        error &&
          'border-error focus-visible:ring-error aria-invalid:border-error',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
