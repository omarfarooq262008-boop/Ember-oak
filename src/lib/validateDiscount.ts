/**
 * Discount validation for the cart UI.
 * - With Supabase: calls validate-discount Edge Function (service role on server).
 * - Offline demo only: private local check — never queries public.discount_codes.
 * Never returns a list of codes.
 */
import { discountCodes as localDiscountCodes } from '@/data/catalog'
import { evaluateDiscountCode } from '@/lib/pricing'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type DiscountCheckResult =
  | { valid: true; code: string; discountAmount: number }
  | { valid: false; message: string }

function validateLocally(code: string, subtotal: number): DiscountCheckResult {
  return evaluateDiscountCode(code, subtotal, localDiscountCodes)
}

export async function checkDiscountCode(
  code: string,
  subtotal: number,
): Promise<DiscountCheckResult> {
  if (!isSupabaseConfigured || !supabase) {
    return validateLocally(code, subtotal)
  }

  const { data, error } = await supabase.functions.invoke('validate-discount', {
    body: { code: code.trim(), subtotal },
  })

  if (error) {
    return {
      valid: false,
      message: 'Could not validate this code. Please try again.',
    }
  }

  const payload = data as DiscountCheckResult | null
  if (!payload || typeof payload !== 'object') {
    return { valid: false, message: 'Could not validate this code.' }
  }
  if (!payload.valid) {
    return {
      valid: false,
      message: 'message' in payload ? payload.message : 'This code is not valid.',
    }
  }
  if (
    typeof payload.discountAmount !== 'number' ||
    typeof payload.code !== 'string'
  ) {
    return { valid: false, message: 'Could not validate this code.' }
  }

  return {
    valid: true,
    code: payload.code,
    discountAmount: payload.discountAmount,
  }
}
