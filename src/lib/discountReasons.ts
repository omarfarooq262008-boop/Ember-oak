/**
 * Discount validation outcomes + plain-language messages.
 * Shared by the storefront and mirrored in validate-discount Edge Function.
 * Never returns a list of codes.
 */
import {
  computeDiscountAmount,
  type DiscountRule,
} from '@/lib/pricingCore'

export type DiscountReason =
  | 'valid'
  | 'not_found'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'usage_limit_reached'
  | 'min_spend_not_met'
  | 'not_applicable'

export type DiscountOutcome =
  | {
      valid: true
      reason: 'valid'
      code: string
      discountAmount: number
      ruleSummary: string
      message: string
    }
  | {
      valid: false
      reason: Exclude<DiscountReason, 'valid'>
      code?: string
      message: string
      minSpend?: number
      shortfall?: number
      ruleSummary?: string
    }

function formatPkr(n: number): string {
  return `PKR ${Math.round(n).toLocaleString('en-PK')}`
}

export function buildDiscountRuleSummary(rule: {
  type: 'percent' | 'fixed'
  value: number
  min_spend: number | null
}): string {
  const offer =
    rule.type === 'percent'
      ? `${rule.value}% off`
      : `${formatPkr(rule.value)} off`
  if (rule.min_spend != null && rule.min_spend > 0) {
    return `${offer} orders over ${formatPkr(rule.min_spend)}`
  }
  return offer
}

export function messageForDiscountReason(
  reason: DiscountReason,
  opts: {
    code?: string
    discountAmount?: number
    minSpend?: number
    shortfall?: number
  } = {},
): string {
  switch (reason) {
    case 'valid':
      return `${opts.code ?? 'Code'} applied: you save ${formatPkr(opts.discountAmount ?? 0)}.`
    case 'not_found':
    case 'inactive':
      return "We couldn't find that code. Check the spelling and try again."
    case 'not_started':
      return 'This code is not active yet.'
    case 'expired':
      return 'This code has expired.'
    case 'usage_limit_reached':
      return 'This code has reached its usage limit.'
    case 'min_spend_not_met': {
      const code = opts.code ?? 'This code'
      const min = opts.minSpend ?? 0
      const short = opts.shortfall ?? 0
      return `${code} needs a minimum spend of ${formatPkr(min)}. Add ${formatPkr(short)} more to use it.`
    }
    case 'not_applicable':
      return 'This code cannot be applied to your cart.'
    default:
      return "We couldn't apply that code."
  }
}

/**
 * Evaluate a single known discount row (already looked up by code).
 * Pass `found: null` when no row exists (not_found).
 */
export function evaluateDiscountRow(
  found: DiscountRule | null,
  subtotal: number,
  now: Date = new Date(),
): DiscountOutcome {
  if (!found) {
    return {
      valid: false,
      reason: 'not_found',
      message: messageForDiscountReason('not_found'),
    }
  }

  const code = found.code.toUpperCase()
  const ruleSummary = buildDiscountRuleSummary(found)

  if (!found.is_active) {
    return {
      valid: false,
      reason: 'inactive',
      // Same public message as not_found — do not confirm the code exists
      message: messageForDiscountReason('inactive'),
    }
  }

  const t = now.getTime()
  if (found.starts_at && new Date(found.starts_at).getTime() > t) {
    return {
      valid: false,
      reason: 'not_started',
      code,
      ruleSummary,
      message: messageForDiscountReason('not_started'),
    }
  }
  if (found.ends_at && new Date(found.ends_at).getTime() < t) {
    return {
      valid: false,
      reason: 'expired',
      code,
      ruleSummary,
      message: messageForDiscountReason('expired'),
    }
  }
  if (found.max_uses != null && found.used_count >= found.max_uses) {
    return {
      valid: false,
      reason: 'usage_limit_reached',
      code,
      ruleSummary,
      message: messageForDiscountReason('usage_limit_reached'),
    }
  }
  if (found.min_spend != null && subtotal < found.min_spend) {
    const shortfall = found.min_spend - subtotal
    return {
      valid: false,
      reason: 'min_spend_not_met',
      code,
      minSpend: found.min_spend,
      shortfall,
      ruleSummary,
      message: messageForDiscountReason('min_spend_not_met', {
        code,
        minSpend: found.min_spend,
        shortfall,
      }),
    }
  }

  const discountAmount = computeDiscountAmount(subtotal, found.type, found.value)
  if (discountAmount <= 0) {
    return {
      valid: false,
      reason: 'not_applicable',
      code,
      ruleSummary,
      message: messageForDiscountReason('not_applicable'),
    }
  }

  return {
    valid: true,
    reason: 'valid',
    code: found.code,
    discountAmount,
    ruleSummary,
    message: messageForDiscountReason('valid', { code: found.code, discountAmount }),
  }
}

export function evaluateDiscountAgainstRules(
  code: string,
  subtotal: number,
  rules: DiscountRule[],
  now: Date = new Date(),
): DiscountOutcome {
  const normalized = code.trim().toUpperCase()
  if (!normalized) {
    return {
      valid: false,
      reason: 'not_found',
      message: 'Enter a discount code.',
    }
  }

  const match =
    rules.find((dc) => dc.code.toUpperCase() === normalized) ?? null
  return evaluateDiscountRow(match, subtotal, now)
}
