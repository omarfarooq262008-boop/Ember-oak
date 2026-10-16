/**
 * Discount validation for the cart UI.
 * - With Supabase: calls validate-discount Edge Function.
 * - Offline demo: local catalog rules only.
 * Never returns a list of codes.
 */
import { discountCodes as localDiscountCodes } from '@/data/catalog'
import {
  evaluateDiscountAgainstRules,
  type DiscountOutcome,
} from '@/lib/discountReasons'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type DiscountCheckResult = DiscountOutcome

function validateLocally(code: string, subtotal: number): DiscountCheckResult {
  return evaluateDiscountAgainstRules(code, subtotal, localDiscountCodes)
}

export async function checkDiscountCode(
  code: string,
  subtotal: number,
): Promise<DiscountCheckResult> {
  const normalized = code.trim()
  if (!normalized) {
    return {
      valid: false,
      reason: 'not_found',
      message: 'Enter a discount code.',
    }
  }

  if (!isSupabaseConfigured || !supabase) {
    return validateLocally(normalized, subtotal)
  }

  const { data, error } = await supabase.functions.invoke('validate-discount', {
    body: { code: normalized, subtotal },
  })

  if (error) {
    return {
      valid: false,
      reason: 'not_applicable',
      message: 'Could not validate this code. Please try again.',
    }
  }

  const payload = data as DiscountOutcome | null
  if (!payload || typeof payload !== 'object' || !('reason' in payload)) {
    // Backward compat if an old function is still deployed
    if (payload && typeof payload === 'object' && 'valid' in payload) {
      const legacy = payload as {
        valid: boolean
        code?: string
        discountAmount?: number
        message?: string
      }
      if (
        legacy.valid &&
        typeof legacy.code === 'string' &&
        typeof legacy.discountAmount === 'number'
      ) {
        return {
          valid: true,
          reason: 'valid',
          code: legacy.code,
          discountAmount: legacy.discountAmount,
          ruleSummary: '',
          message:
            legacy.message ??
            `${legacy.code} applied: you save PKR ${legacy.discountAmount.toLocaleString('en-PK')}.`,
        }
      }
      return {
        valid: false,
        reason: 'not_found',
        message:
          legacy.message ??
          "We couldn't find that code. Check the spelling and try again.",
      }
    }
    return {
      valid: false,
      reason: 'not_applicable',
      message: 'Could not validate this code.',
    }
  }

  return payload
}
