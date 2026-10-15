import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-(--radius-sm) font-medium transition-[color,background-color,border-color,transform,opacity] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-brand-band-text hover:bg-brand-band active:bg-primary',
        secondary:
          'border border-border bg-surface text-primary hover:bg-background active:bg-surface',
        ghost:
          'bg-transparent text-primary hover:bg-background active:bg-border/60',
      },
      size: {
        default: 'min-h-[44px] px-5 py-2.5 text-sm',
        sm: 'min-h-[44px] px-4 py-2 text-sm',
        lg: 'min-h-[44px] px-8 py-3 text-base',
        icon: 'size-11 min-h-[44px] min-w-[44px] shrink-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
