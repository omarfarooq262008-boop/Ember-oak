import { describe, expect, it } from 'vitest'

import {
  computeDeliveryFee,
  computeDiscountAmount,
  computeOrderTotal,
  computeSubtotal,
  evaluateDiscountCode,
  FREE_DELIVERY_ABOVE_PKR,
  FLAT_DELIVERY_FEE_PKR,
  type DiscountRule,
} from './pricing'

const sampleRules: DiscountRule[] = [
  {
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    min_spend: 3000,
    max_uses: 1000,
    used_count: 0,
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2027-12-31T23:59:59Z',
    is_active: true,
  },
  {
    code: 'EMBER500',
    type: 'fixed',
    value: 500,
    min_spend: 5000,
    max_uses: 500,
    used_count: 0,
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2027-12-31T23:59:59Z',
    is_active: true,
  },
]

describe('computeSubtotal', () => {
  it('sums line totals from unit prices', () => {
    expect(
      computeSubtotal([
        { unitPrice: 4500, quantity: 2 },
        { unitPrice: 1000, quantity: 1 },
      ]),
    ).toBe(10000)
  })
})

describe('computeDiscountAmount', () => {
  it('applies percent as floor', () => {
    expect(computeDiscountAmount(4550, 'percent', 10)).toBe(455)
  })

  it('caps fixed discount at subtotal', () => {
    expect(computeDiscountAmount(300, 'fixed', 500)).toBe(300)
  })
})

describe('computeDeliveryFee / computeOrderTotal', () => {
  it('charges flat fee below free threshold', () => {
    expect(computeDeliveryFee(FREE_DELIVERY_ABOVE_PKR - 1)).toBe(
      FLAT_DELIVERY_FEE_PKR,
    )
  })

  it('is free at and above threshold', () => {
    expect(computeDeliveryFee(FREE_DELIVERY_ABOVE_PKR)).toBe(0)
  })

  it('ignores a manipulated browser discount larger than subtotal', () => {
    const { total, afterDiscount, deliveryFee } = computeOrderTotal(4000, 99999)
    expect(afterDiscount).toBe(0)
    expect(deliveryFee).toBe(FLAT_DELIVERY_FEE_PKR)
    expect(total).toBe(FLAT_DELIVERY_FEE_PKR)
  })
})

describe('evaluateDiscountCode', () => {
  it('rejects below min spend', () => {
    const result = evaluateDiscountCode('WELCOME10', 2000, sampleRules)
    expect(result.valid).toBe(false)
  })

  it('returns amount for valid percent code', () => {
    const result = evaluateDiscountCode('welcome10', 5000, sampleRules)
    expect(result).toEqual({
      valid: true,
      code: 'WELCOME10',
      discountAmount: 500,
    })
  })

  it('rejects unknown codes without leaking others', () => {
    const result = evaluateDiscountCode('SECRET99', 9000, sampleRules)
    expect(result).toEqual({
      valid: false,
      message: 'This code is not valid.',
    })
  })
})
