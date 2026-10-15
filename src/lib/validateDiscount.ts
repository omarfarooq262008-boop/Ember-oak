/**
 * Discount validation for the cart UI.
 * - With Supabase: calls validate-discount Edge Function (service role on server).
 * - Offline demo only: private local check — never queries public.discount_codes.
 * Never returns a list of codes.
 */
import { discountCodes as localDiscountCodes } from '@/data/catalog'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type DiscountCheckResult =
  | { valid: true; code: string; discountAmount: number }
  | { valid: false; message: string }

function validateLocally(code: string, subtotal: number): DiscountCheckResult {
  const normalized = code.trim().toUpperCase()
  if (!normalized) {
    return { valid: false, message: 'Enter a discount code.' }
  }

  const match = localDiscountCodes.find(
    (dc) => dc.is_active && dc.code.toUpperCase() === normalized,
  )
  if (!match) {
    return { valid: false, message: 'This code is not valid.' }
  }

  const now = Date.now()
  if (match.starts_at && new Date(match.starts_at).getTime() > now) {
    return { valid: false, message: 'This code is not active yet.' }
  }
  if (match.ends_at && new Date(match.ends_at).getTime() < now) {
    return { valid: false, message: 'This code has expired.' }
  }
  if (match.max_uses != null && match.used_count >= match.max_uses) {
    return { valid: false, message: 'This code has reached its usage limit.' }
  }
  if (match.min_spend != null && subtotal < match.min_spend) {
    return {
      valid: false,
      message: `Minimum spend is PKR ${match.min_spend.toLocaleString('en-PK')}.`,
    }
  }

  const discountAmount =
    match.type === 'percent'
      ? Math.floor((subtotal * match.value) / 100)
      : Math.min(match.value, subtotal)

  if (discountAmount <= 0) {
    return {
      valid: false,
      message: 'This code cannot be applied to your cart.',
    }
  }

  return { valid: true, code: match.code, discountAmount }
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
