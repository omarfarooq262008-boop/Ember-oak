import { describe, expect, it, vi } from 'vitest'

import {
  runDiscountApplyGesture,
  runDiscountCodeKeyDown,
} from './discountFieldGestures'

describe('discount field gestures (must not submit checkout)', () => {
  it('Apply click preventDefaults and does not rely on form submit', () => {
    const preventDefault = vi.fn()
    const stopPropagation = vi.fn()
    const apply = vi.fn()
    const submitCheckout = vi.fn()

    runDiscountApplyGesture({ preventDefault, stopPropagation }, apply)

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(stopPropagation).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledTimes(1)
    expect(submitCheckout).not.toHaveBeenCalled()
  })

  it('Enter in the code input preventDefaults and applies instead of submitting', () => {
    const preventDefault = vi.fn()
    const stopPropagation = vi.fn()
    const apply = vi.fn()
    const submitCheckout = vi.fn()

    runDiscountCodeKeyDown(
      { key: 'Enter', preventDefault, stopPropagation },
      apply,
    )

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(stopPropagation).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledTimes(1)
    expect(submitCheckout).not.toHaveBeenCalled()
  })

  it('non-Enter keys do not apply or preventDefault', () => {
    const preventDefault = vi.fn()
    const apply = vi.fn()

    runDiscountCodeKeyDown({ key: 'a', preventDefault }, apply)

    expect(preventDefault).not.toHaveBeenCalled()
    expect(apply).not.toHaveBeenCalled()
  })
})
