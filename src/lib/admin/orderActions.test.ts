import { describe, expect, it } from 'vitest'

import { getOrderActionStates } from './orderActions'

describe('getOrderActionStates', () => {
  it('enables COD paid only for unpaid COD orders', () => {
    const states = getOrderActionStates({
      status: 'awaiting_fulfilment',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
    })
    expect(states.find((s) => s.id === 'mark_cod_paid')?.enabled).toBe(true)
    expect(states.find((s) => s.id === 'mark_bank_paid')?.enabled).toBe(false)
    expect(states.find((s) => s.id === 'ship')?.enabled).toBe(true)
  })

  it('enables bank paid only while awaiting payment', () => {
    const open = getOrderActionStates({
      status: 'awaiting_payment',
      paymentMethod: 'bank_transfer',
      paymentStatus: 'pending',
    })
    expect(open.find((s) => s.id === 'mark_bank_paid')?.enabled).toBe(true)

    const paid = getOrderActionStates({
      status: 'awaiting_fulfilment',
      paymentMethod: 'bank_transfer',
      paymentStatus: 'paid',
    })
    expect(paid.find((s) => s.id === 'mark_bank_paid')?.enabled).toBe(false)
  })

  it('enables card refund only after paid', () => {
    const unpaid = getOrderActionStates({
      status: 'pending_payment',
      paymentMethod: 'card',
      paymentStatus: 'pending',
    })
    expect(unpaid.find((s) => s.id === 'refund')?.enabled).toBe(false)
    expect(unpaid.find((s) => s.id === 'refund')?.disabledReason).toMatch(/after the card payment/)

    const paid = getOrderActionStates({
      status: 'awaiting_fulfilment',
      paymentMethod: 'card',
      paymentStatus: 'paid',
    })
    expect(paid.find((s) => s.id === 'refund')?.enabled).toBe(true)
  })

  it('explains why delivered is disabled before ship', () => {
    const states = getOrderActionStates({
      status: 'awaiting_fulfilment',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
    })
    const delivered = states.find((s) => s.id === 'mark_delivered')
    expect(delivered?.enabled).toBe(false)
    expect(delivered?.disabledReason).toMatch(/after the order is shipped/)
  })
})
