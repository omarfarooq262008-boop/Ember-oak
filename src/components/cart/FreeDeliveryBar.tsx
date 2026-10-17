import { useStoreSettings } from '@/hooks/useStoreSettings'
import { formatPKR } from '@/lib/format'
import { cn } from '@/lib/utils'

interface FreeDeliveryBarProps {
  subtotalAfterDiscount: number
  className?: string
}

export function FreeDeliveryBar({
  subtotalAfterDiscount,
  className,
}: FreeDeliveryBarProps) {
  const { delivery } = useStoreSettings()
  const { freeAbovePKR } = delivery
  const remainingForFree = Math.max(0, freeAbovePKR - subtotalAfterDiscount)
  const progress = Math.min(100, (subtotalAfterDiscount / freeAbovePKR) * 100)
  const qualified = remainingForFree === 0

  return (
    <div className={cn('space-y-2 text-sm', className)}>
      {qualified ? (
        <p className="text-success">You qualify for free delivery</p>
      ) : (
        <p className="text-muted">
          Add {formatPKR(remainingForFree)} more for free delivery (orders above{' '}
          {formatPKR(freeAbovePKR)})
        </p>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress toward free delivery"
      >
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
