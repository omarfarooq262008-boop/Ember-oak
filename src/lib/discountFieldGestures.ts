/**
 * Gestures for Apply / Enter on the discount field.
 * Must never submit a parent checkout <form>.
 */

type Preventable = {
  preventDefault: () => void
  stopPropagation?: () => void
}

export function runDiscountApplyGesture(
  event: Preventable,
  apply: () => void | Promise<void>,
): void {
  event.preventDefault()
  event.stopPropagation?.()
  void apply()
}

export function runDiscountCodeKeyDown(
  event: Preventable & { key: string },
  apply: () => void | Promise<void>,
): void {
  if (event.key !== 'Enter') return
  event.preventDefault()
  event.stopPropagation?.()
  void apply()
}
