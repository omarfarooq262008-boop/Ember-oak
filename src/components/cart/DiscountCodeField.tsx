import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCart } from '@/contexts/CartContext'
import { formatPKR } from '@/lib/format'
import { cn } from '@/lib/utils'

type DiscountCodeFieldProps = {
  className?: string
  idPrefix?: string
  compact?: boolean
}

export function DiscountCodeField({
  className,
  idPrefix = 'discount',
  compact = false,
}: DiscountCodeFieldProps) {
  const {
    discountCode,
    discountAmount,
    discountRuleSummary,
    discountFeedback,
    applyDiscount,
    clearDiscount,
    clearDiscountFeedback,
  } = useCart()
  const reactId = useId()
  const fieldId = `${idPrefix}-code-${reactId}`
  const statusId = `${idPrefix}-status-${reactId}`

  const [codeInput, setCodeInput] = useState('')
  const [pending, setPending] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (discountCode) setCodeInput(discountCode)
  }, [discountCode])

  const statusMessage =
    localError ??
    discountFeedback?.message ??
    (discountCode && discountAmount > 0
      ? `${discountCode} applied: you save ${formatPKR(discountAmount)}.`
      : null)
  const statusTone: 'success' | 'error' | 'info' | null = localError
    ? 'error'
    : discountFeedback?.tone ?? (discountCode ? 'success' : null)

  const handleApply = async (e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLocalError(null)
    clearDiscountFeedback()
    const trimmed = codeInput.trim()
    if (!trimmed) {
      setLocalError('Enter a discount code.')
      return
    }
    setPending(true)
    const result = await applyDiscount(trimmed)
    setPending(false)
    if (!result.ok) {
      setLocalError(result.message)
    }
  }

  const handleRemove = () => {
    clearDiscount()
    setCodeInput('')
    setLocalError(null)
  }

  return (
    <div className={cn('space-y-2', className)}>
      {discountCode && discountAmount > 0 ? (
        <div
          className={cn(
            'flex items-start justify-between gap-3 rounded-(--radius-sm) border border-border bg-background px-3 py-2.5',
            compact && 'py-2',
          )}
        >
          <div className="min-w-0 text-sm">
            <p className="font-medium text-text">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold tracking-wide">
                {discountCode}
              </span>{' '}
              <span className="font-normal text-success">
                −{formatPKR(discountAmount)}
              </span>
            </p>
            {discountRuleSummary ? (
              <p className="mt-1 text-xs text-muted">{discountRuleSummary}</p>
            ) : (
              <p className="mt-1 text-xs text-muted">Discount applied</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={handleRemove}
          >
            Remove
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleApply(e)} className="space-y-2">
          <Label htmlFor={fieldId}>Discount code</Label>
          <div className="flex gap-2">
            <Input
              id={fieldId}
              name={`${idPrefix}-code`}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value)
                if (localError) setLocalError(null)
              }}
              placeholder="Enter code"
              aria-invalid={statusTone === 'error' ? true : undefined}
              aria-describedby={statusMessage ? statusId : undefined}
              disabled={pending}
            />
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" aria-hidden />
                  <span className="sr-only">Checking code</span>
                </>
              ) : (
                'Apply'
              )}
            </Button>
          </div>
        </form>
      )}

      <div
        id={statusId}
        className="min-h-[1.25rem]"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMessage && statusTone ? (
          <p
            className={cn(
              'flex items-start gap-2 text-sm',
              statusTone === 'error' && 'text-error',
              statusTone === 'success' && 'text-success',
              statusTone === 'info' && 'text-muted',
            )}
            role={statusTone === 'error' ? 'alert' : 'status'}
          >
            {statusTone === 'error' ? (
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : statusTone === 'success' ? (
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : null}
            <span>{statusMessage}</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}
