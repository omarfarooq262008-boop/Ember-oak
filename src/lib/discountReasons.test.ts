import { describe, expect, it } from 'vitest'

import {
  buildDiscountRuleSummary,
  evaluateDiscountAgainstRules,
  messageForDiscountReason,
} from './discountReasons'
import type { DiscountRule } from './pricingCore'

const base: DiscountRule = {
  code: 'WELCOME10',
  type: 'percent',
  value: 10,
  min_spend: 3000,
  max_uses: 1000,
  used_count: 0,
  starts_at: '2026-01-01T00:00:00Z',
  ends_at: '2027-12-31T23:59:59Z',
  is_active: true,
}

const now = new Date('2026-06-01T12:00:00Z')

describe('messageForDiscountReason', () => {
  it('formats valid', () => {
    expect(
      messageForDiscountReason('valid', {
        code: 'WELCOME10',
        discountAmount: 450,
      }),
    ).toBe('WELCOME10 applied: you save PKR 450.')
  })

  it('formats min_spend_not_met with shortfall', () => {
    expect(
      messageForDiscountReason('min_spend_not_met', {
        code: 'WELCOME10',
        minSpend: 3000,
        shortfall: 1200,
      }),
    ).toBe(
      'WELCOME10 needs a minimum spend of PKR 3,000. Add PKR 1,200 more to use it.',
    )
  })

  it('uses one message for not_found and inactive', () => {
    const a = messageForDiscountReason('not_found')
    const b = messageForDiscountReason('inactive')
    expect(a).toBe(b)
    expect(a).toMatch(/couldn't find that code/i)
  })

  it('formats expired and usage_limit', () => {
    expect(messageForDiscountReason('expired')).toBe('This code has expired.')
    expect(messageForDiscountReason('usage_limit_reached')).toBe(
      'This code has reached its usage limit.',
    )
  })
})

describe('buildDiscountRuleSummary', () => {
  it('describes percent with minimum', () => {
    expect(
      buildDiscountRuleSummary({
        type: 'percent',
        value: 10,
        min_spend: 3000,
      }),
    ).toBe('10% off orders over PKR 3,000')
  })

  it('describes fixed without minimum', () => {
    expect(
      buildDiscountRuleSummary({
        type: 'fixed',
        value: 250,
        min_spend: 0,
      }),
    ).toBe('PKR 250 off')
  })
})

describe('evaluateDiscountAgainstRules — every reason', () => {
  it('valid', () => {
    const r = evaluateDiscountAgainstRules('welcome10', 4500, [base], now)
    expect(r.valid).toBe(true)
    if (r.valid) {
      expect(r.reason).toBe('valid')
      expect(r.discountAmount).toBe(450)
      expect(r.message).toContain('WELCOME10 applied')
      expect(r.ruleSummary).toContain('10% off')
    }
  })

  it('not_found', () => {
    const r = evaluateDiscountAgainstRules('NOPE', 9000, [base], now)
    expect(r).toMatchObject({ valid: false, reason: 'not_found' })
  })

  it('inactive shares not_found message', () => {
    const r = evaluateDiscountAgainstRules(
      'WELCOME10',
      9000,
      [{ ...base, is_active: false }],
      now,
    )
    expect(r.reason).toBe('inactive')
    expect(r.valid).toBe(false)
    expect(r.message).toBe(messageForDiscountReason('not_found'))
  })

  it('not_started', () => {
    const r = evaluateDiscountAgainstRules(
      'WELCOME10',
      9000,
      [{ ...base, starts_at: '2026-12-01T00:00:00Z' }],
      now,
    )
    expect(r.reason).toBe('not_started')
  })

  it('expired', () => {
    const r = evaluateDiscountAgainstRules(
      'WELCOME10',
      9000,
      [{ ...base, ends_at: '2026-01-02T00:00:00Z' }],
      now,
    )
    expect(r.reason).toBe('expired')
    expect(r.message).toBe('This code has expired.')
  })

  it('usage_limit_reached', () => {
    const r = evaluateDiscountAgainstRules(
      'WELCOME10',
      9000,
      [{ ...base, max_uses: 5, used_count: 5 }],
      now,
    )
    expect(r.reason).toBe('usage_limit_reached')
  })

  it('min_spend_not_met includes shortfall', () => {
    const r = evaluateDiscountAgainstRules('WELCOME10', 1800, [base], now)
    expect(r.reason).toBe('min_spend_not_met')
    if (!r.valid && r.reason === 'min_spend_not_met') {
      expect(r.minSpend).toBe(3000)
      expect(r.shortfall).toBe(1200)
      expect(r.message).toContain('Add PKR 1,200 more')
    }
  })

  it('not_applicable when discount would be zero', () => {
    const r = evaluateDiscountAgainstRules(
      'ZERO',
      5000,
      [
        {
          ...base,
          code: 'ZERO',
          type: 'fixed',
          value: 0,
          min_spend: 0,
        },
      ],
      now,
    )
    expect(r.reason).toBe('not_applicable')
  })
})
