/**
 * Single source of truth for Edge Function rate limits.
 * windowSeconds is the rolling window length.
 */
export const RATE_LIMITS = {
  /** Guest checkout — 10 per 10 minutes per IP */
  'create-order': { limit: 10, windowSeconds: 600 },
  /** Discount checks — 20 per 10 minutes per IP */
  'validate-discount': { limit: 20, windowSeconds: 600 },
  /** Contact form — 5 per hour per IP */
  'submit-contact': { limit: 5, windowSeconds: 3600 },
  /** Newsletter — 5 per hour per IP */
  'subscribe-newsletter': { limit: 5, windowSeconds: 3600 },
  /** Order tracking — 20 per 10 minutes per IP */
  'track-order': { limit: 20, windowSeconds: 600 },
  /** Admin-authenticated functions — 60 per minute per admin user */
  admin: { limit: 60, windowSeconds: 60 },
  /** Payment provider webhooks — 60 per minute per IP */
  'payment-webhook': { limit: 60, windowSeconds: 60 },
  /** Mock checkout signer — 20 per 10 minutes per IP */
  'mock-sign-payment': { limit: 20, windowSeconds: 600 },
} as const

export type RateLimitKey = keyof typeof RATE_LIMITS

/** Minimum time (ms) a contact/newsletter form must be open before submit. */
export const MIN_FORM_TIME_MS = 3000

export const RATE_LIMIT_MESSAGE =
  "You're sending requests too quickly. Please wait a moment and try again."
