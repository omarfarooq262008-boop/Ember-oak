import { describe, expect, it } from 'vitest'

import {
  allowedNextStatuses,
  isTransitionAllowed,
  ORDER_STATUSES,
} from './orderStatus'

describe('order status transitions', () => {
  it('exports all statuses', () => {
    expect(ORDER_STATUSES).toHaveLength(7)
  })

  it('pending_payment transitions', () => {
    expect(allowedNextStatuses('pending_payment')).toEqual([
      'awaiting_payment',
      'awaiting_fulfilment',
      'cancelled',
    ])
    expect(isTransitionAllowed('pending_payment', 'awaiting_payment')).toBe(true)
    expect(isTransitionAllowed('pending_payment', 'awaiting_fulfilment')).toBe(true)
    expect(isTransitionAllowed('pending_payment', 'cancelled')).toBe(true)
    expect(isTransitionAllowed('pending_payment', 'shipped')).toBe(false)
    expect(isTransitionAllowed('pending_payment', 'pending_payment')).toBe(false)
  })

  it('awaiting_payment transitions', () => {
    expect(allowedNextStatuses('awaiting_payment')).toEqual([
      'awaiting_fulfilment',
      'cancelled',
      'refunded',
    ])
    expect(isTransitionAllowed('awaiting_payment', 'refunded')).toBe(true)
    expect(isTransitionAllowed('awaiting_payment', 'delivered')).toBe(false)
  })

  it('awaiting_fulfilment transitions', () => {
    expect(allowedNextStatuses('awaiting_fulfilment')).toEqual(['shipped', 'cancelled'])
    expect(isTransitionAllowed('awaiting_fulfilment', 'shipped')).toBe(true)
    expect(isTransitionAllowed('awaiting_fulfilment', 'delivered')).toBe(false)
  })

  it('shipped transitions', () => {
    expect(allowedNextStatuses('shipped')).toEqual(['delivered', 'refunded'])
    expect(isTransitionAllowed('shipped', 'delivered')).toBe(true)
    expect(isTransitionAllowed('shipped', 'cancelled')).toBe(false)
  })

  it('delivered transitions', () => {
    expect(allowedNextStatuses('delivered')).toEqual(['refunded'])
    expect(isTransitionAllowed('delivered', 'refunded')).toBe(true)
    expect(isTransitionAllowed('delivered', 'shipped')).toBe(false)
  })

  it('terminal statuses have no outgoing transitions', () => {
    expect(allowedNextStatuses('cancelled')).toEqual([])
    expect(allowedNextStatuses('refunded')).toEqual([])
    expect(isTransitionAllowed('cancelled', 'awaiting_fulfilment')).toBe(false)
    expect(isTransitionAllowed('refunded', 'delivered')).toBe(false)
  })

  it('unknown from status', () => {
    expect(allowedNextStatuses('unknown')).toEqual([])
    expect(isTransitionAllowed('unknown', 'cancelled')).toBe(false)
  })
})
