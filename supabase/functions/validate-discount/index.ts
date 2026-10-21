/**
 * validate-discount — reason-coded outcomes + plain messages.
 * Never returns a list of codes. not_found and inactive share one message.
 * Secrets only from Deno.env.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts'
import { corsHeaders, json } from '../_shared/cors.ts'
import {
  enforceRateLimit,
  getClientIp,
  rateLimitResponse,
} from '../_shared/rateLimit.ts'
import { RATE_LIMIT_MESSAGE } from '../_shared/rateLimitConfig.ts'

const BodySchema = z.object({
  code: z.string().min(1).max(64),
  subtotal: z.number().min(0).max(10_000_000),
})

function formatPkr(n: number): string {
  return `PKR ${Math.round(n).toLocaleString('en-PK')}`
}

function ruleSummary(dc: {
  type: string
  value: number
  min_spend: number | null
}): string {
  const offer =
    dc.type === 'percent'
      ? `${dc.value}% off`
      : `${formatPkr(Number(dc.value))} off`
  const min = dc.min_spend != null ? Number(dc.min_spend) : 0
  if (min > 0) return `${offer} orders over ${formatPkr(min)}`
  return offer
}

const INVALID_LOOKUP =
  "We couldn't find that code. Check the spelling and try again."

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json(
      { valid: false, reason: 'not_found', message: 'Method not allowed' },
      405,
    )
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return json(
      { valid: false, reason: 'not_found', message: 'Invalid request.' },
      400,
    )
  }

  const normalized = parsed.data.code.trim().toUpperCase()
  const subtotal = parsed.data.subtotal

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const ip = getClientIp(req)
  const limited = await enforceRateLimit(admin, 'validate-discount', ip)
  if (!limited.allowed) {
    return rateLimitResponse(limited.retryAfterSeconds, RATE_LIMIT_MESSAGE)
  }

  // Look up without is_active filter so inactive can be distinguished (same public msg)
  const { data: dc } = await admin
    .from('discount_codes')
    .select(
      'code, type, value, min_spend, max_uses, used_count, starts_at, ends_at, is_active',
    )
    .eq('code', normalized)
    .maybeSingle()

  if (!dc) {
    return json({
      valid: false,
      reason: 'not_found',
      message: INVALID_LOOKUP,
    })
  }

  if (!dc.is_active) {
    return json({
      valid: false,
      reason: 'inactive',
      message: INVALID_LOOKUP,
    })
  }

  const summary = ruleSummary(dc)
  const now = Date.now()

  if (dc.starts_at && new Date(dc.starts_at).getTime() > now) {
    return json({
      valid: false,
      reason: 'not_started',
      code: dc.code,
      ruleSummary: summary,
      message: 'This code is not active yet.',
    })
  }
  if (dc.ends_at && new Date(dc.ends_at).getTime() < now) {
    return json({
      valid: false,
      reason: 'expired',
      code: dc.code,
      ruleSummary: summary,
      message: 'This code has expired.',
    })
  }
  if (dc.max_uses != null && dc.used_count >= dc.max_uses) {
    return json({
      valid: false,
      reason: 'usage_limit_reached',
      code: dc.code,
      ruleSummary: summary,
      message: 'This code has reached its usage limit.',
    })
  }

  const minSpend = dc.min_spend != null ? Number(dc.min_spend) : null
  if (minSpend != null && subtotal < minSpend) {
    const shortfall = minSpend - subtotal
    return json({
      valid: false,
      reason: 'min_spend_not_met',
      code: dc.code,
      minSpend,
      shortfall,
      ruleSummary: summary,
      message: `${dc.code} needs a minimum spend of ${formatPkr(minSpend)}. Add ${formatPkr(shortfall)} more to use it.`,
    })
  }

  let discountAmount = 0
  if (dc.type === 'percent') {
    discountAmount = Math.floor((subtotal * Number(dc.value)) / 100)
  } else {
    discountAmount = Math.min(Number(dc.value), subtotal)
  }

  if (discountAmount <= 0) {
    return json({
      valid: false,
      reason: 'not_applicable',
      code: dc.code,
      ruleSummary: summary,
      message: 'This code cannot be applied to your cart.',
    })
  }

  return json({
    valid: true,
    reason: 'valid',
    code: dc.code,
    discountAmount,
    ruleSummary: summary,
    message: `${dc.code} applied: you save ${formatPkr(discountAmount)}.`,
  })
})
