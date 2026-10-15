import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function Sheet({
  ...props
}: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-primary/50 backdrop-blur-[2px] transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
        className,
      )}
      {...props}
    />
  )
}

type SheetContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  side?: 'right' | 'left'
}

function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'fixed z-50 flex h-full flex-col border-border bg-surface shadow-[0_0_48px_-12px_rgba(28,25,23,0.2)] transition-transform duration-300 ease-out outline-none',
          side === 'right' &&
            'inset-y-0 right-0 w-full max-w-md border-l data-[state=closed]:translate-x-full data-[state=open]:translate-x-0',
          side === 'left' &&
            'inset-y-0 left-0 w-full max-w-md border-r data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-(--radius-sm) text-muted transition-colors duration-200 hover:bg-background hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Close panel"
        >
          <XIcon className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-2 border-b border-border p-6 pr-16', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        'mt-auto flex flex-col gap-2 border-t border-border p-6',
        className,
      )}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn('font-display text-lg font-bold text-text', className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-muted', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
