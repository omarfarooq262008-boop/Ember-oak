/**
 * health — public DB connectivity check for uptime monitors and /status.
 * Accepts GET, HEAD, POST; answers OPTIONS for CORS.
 * verify_jwt = false — no Authorization or apikey required.
 * Does not expose secrets, versions, or table names.
 * Includes paymentProvider (name only) so the storefront can gate /mock-checkout.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from '../_shared/cors.ts'
import { getPaymentProviderName } from '../_shared/payments.ts'
import {
  enforceRateLimit,
  getClientIp,
  rateLimitResponse,
} from '../_shared/rateLimit.ts'

const CACHE_CONTROL = 'no-store'

type HealthBody = {
  status: 'ok' | 'degraded'
  time: string
  /** Harmless public flag — mirrors PAYMENT_PROVIDER name only. */
  paymentProvider: string
}

function healthJson(
  body: HealthBody | null,
  status: number,
  method: string,
): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    'Cache-Control': CACHE_CONTROL,
  }
  if (method === 'HEAD' || body == null) {
    return new Response(null, { status, headers })
  }
  headers['Content-Type'] = 'application/json'
  return new Response(JSON.stringify(body), { status, headers })
}

Deno.serve(async (req) => {
  const method = req.method.toUpperCase()

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Cache-Control': CACHE_CONTROL,
      },
    })
  }

  if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') {
    return healthJson(null, 405, method)
  }

  const time = new Date().toISOString()
  const paymentProvider = getPaymentProviderName()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return healthJson({ status: 'degraded', time, paymentProvider }, 503, method)
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const ip = getClientIp(req)
  const limited = await enforceRateLimit(admin, 'health', ip)
  if (!limited.allowed) {
    const res = rateLimitResponse(limited.retryAfterSeconds)
    // Preserve rate-limit headers; still forbid caching.
    const headers = new Headers(res.headers)
    headers.set('Cache-Control', CACHE_CONTROL)
    return new Response(method === 'HEAD' ? null : res.body, {
      status: res.status,
      headers,
    })
  }

  try {
    // Tiny read — proves DB connectivity without naming tables in the response.
    const { error } = await admin.from('settings').select('key').limit(1)
    if (error) {
      return healthJson({ status: 'degraded', time, paymentProvider }, 503, method)
    }
    return healthJson({ status: 'ok', time, paymentProvider }, 200, method)
  } catch {
    return healthJson({ status: 'degraded', time, paymentProvider }, 503, method)
  }
})
