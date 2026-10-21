/**
 * health — lightweight DB connectivity check for uptime monitors.
 * verify_jwt = false. Does not expose secrets, versions, or table names.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, json } from '../_shared/cors.ts'
import {
  enforceRateLimit,
  getClientIp,
  rateLimitResponse,
} from '../_shared/rateLimit.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ status: 'error' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ status: 'error', time: new Date().toISOString() }, 503)
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const ip = getClientIp(req)
  const limited = await enforceRateLimit(admin, 'health', ip)
  if (!limited.allowed) {
    return rateLimitResponse(limited.retryAfterSeconds)
  }

  try {
    // Tiny read — any reachable relation proves DB connectivity.
    const { error } = await admin.from('settings').select('key').limit(1)
    if (error) {
      return json({ status: 'error', time: new Date().toISOString() }, 503)
    }
    return json({ status: 'ok', time: new Date().toISOString() })
  } catch {
    return json({ status: 'error', time: new Date().toISOString() }, 503)
  }
})
