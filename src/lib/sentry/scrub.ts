/**
 * Privacy scrubbing for Sentry events — never send personal data.
 */

const EMAIL_RE =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
/** Pakistani / international phone-like sequences */
const PHONE_RE = /(?:\+?\d[\d\s\-().]{6,}\d)/g

const SENSITIVE_KEY_RE =
  /^(email|e-?mail|phone|tel|mobile|address|addr|name|full[_-]?name|first[_-]?name|last[_-]?name|shipping[_-]?name|shipping[_-]?phone|shipping[_-]?address|shipping[_-]?city|shipping[_-]?province|shipping[_-]?postal|customer[_-]?name|contact[_-]?name|token|tracking[_-]?token|discount[_-]?code|discount|code|password|secret|authorization|apikey|api[_-]?key|body|payload|request[_-]?body)$/i

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'tracking_token',
  'trackingToken',
  'email',
  'phone',
  'code',
  'discount',
  'discount_code',
  'discountCode',
  'name',
  'address',
])

const REDACTED = '[Filtered]'

export function scrubString(value: string): string {
  return value.replace(EMAIL_RE, REDACTED).replace(PHONE_RE, REDACTED)
}

export function scrubUrl(url: string): string {
  try {
    const parsed = new URL(url, 'https://example.invalid')
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key) || SENSITIVE_KEY_RE.test(key)) {
        parsed.searchParams.set(key, REDACTED)
      } else {
        const current = parsed.searchParams.get(key)
        if (current) parsed.searchParams.set(key, scrubString(current))
      }
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return scrubString(parsed.toString())
    }
    return scrubString(`${parsed.pathname}${parsed.search}${parsed.hash}`)
  } catch {
    return scrubString(url)
  }
}

export function scrubValue(value: unknown, keyHint = ''): unknown {
  if (value == null) return value
  if (typeof value === 'string') {
    if (keyHint && SENSITIVE_KEY_RE.test(keyHint)) return REDACTED
    if (keyHint.toLowerCase().includes('url')) return scrubUrl(value)
    return scrubString(value)
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    if (keyHint && SENSITIVE_KEY_RE.test(keyHint)) return REDACTED
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, keyHint))
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = REDACTED
      } else {
        out[k] = scrubValue(v, k)
      }
    }
    return out
  }
  return value
}

function scrubQueryString(
  query: string | Record<string, string> | [string, string][] | null | undefined,
): typeof query {
  if (query == null) return query
  if (typeof query === 'string') {
    return (
      scrubUrl(`https://x.invalid/?${query}`).split('?')[1] ?? REDACTED
    )
  }
  if (Array.isArray(query)) {
    return query.map(([k, v]) =>
      SENSITIVE_KEY_RE.test(k) || SENSITIVE_QUERY_KEYS.has(k)
        ? ([k, REDACTED] as [string, string])
        : ([k, scrubString(v)] as [string, string]),
    )
  }
  return scrubValue(query) as Record<string, string>
}

/** Scrub a Sentry error/message event in place-friendly cloned shape. */
export function scrubEvent<T extends Record<string, unknown>>(event: T): T {
  const next = { ...event } as Record<string, unknown>

  if (typeof next.message === 'string') {
    next.message = scrubString(next.message)
  }
  if (typeof next.transaction === 'string') {
    next.transaction = scrubUrl(next.transaction)
  }

  if (next.user && typeof next.user === 'object') {
    const user = next.user as Record<string, unknown>
    next.user = {
      id: user.id != null ? REDACTED : undefined,
    }
  }

  if (next.request && typeof next.request === 'object') {
    const req = { ...(next.request as Record<string, unknown>) }
    if (typeof req.url === 'string') req.url = scrubUrl(req.url)
    if (req.query_string !== undefined) {
      req.query_string = scrubQueryString(
        req.query_string as
          | string
          | Record<string, string>
          | [string, string][]
          | null,
      )
    }
    if (req.data !== undefined) req.data = REDACTED
    if (req.headers && typeof req.headers === 'object') {
      const headers = scrubValue(req.headers) as Record<string, string>
      for (const h of Object.keys(headers)) {
        if (/authorization|cookie|x-api-key/i.test(h)) {
          headers[h] = REDACTED
        }
      }
      req.headers = headers
    }
    if (req.cookies !== undefined) req.cookies = REDACTED
    next.request = req
  }

  if (next.extra) next.extra = scrubValue(next.extra)
  if (next.contexts) next.contexts = scrubValue(next.contexts)
  if (next.tags) next.tags = scrubValue(next.tags)

  if (Array.isArray(next.breadcrumbs)) {
    next.breadcrumbs = next.breadcrumbs.map((b) =>
      scrubBreadcrumb(b as Record<string, unknown>),
    )
  }

  if (next.exception && typeof next.exception === 'object') {
    const exception = { ...(next.exception as Record<string, unknown>) }
    if (Array.isArray(exception.values)) {
      exception.values = exception.values.map((v) => {
        if (!v || typeof v !== 'object') return v
        const row = { ...(v as Record<string, unknown>) }
        if (typeof row.value === 'string') row.value = scrubString(row.value)
        return row
      })
    }
    next.exception = exception
  }

  return next as T
}

export function scrubBreadcrumb<T extends Record<string, unknown>>(
  breadcrumb: T,
): T {
  const next = { ...breadcrumb } as Record<string, unknown>
  if (typeof next.message === 'string') {
    next.message = scrubString(next.message)
  }
  if (next.data && typeof next.data === 'object') {
    const data = { ...(next.data as Record<string, unknown>) }
    for (const [k, v] of Object.entries(data)) {
      if (SENSITIVE_KEY_RE.test(k) || k === 'body' || k === 'request_body') {
        data[k] = REDACTED
      } else if (
        typeof v === 'string' &&
        (k === 'url' || k === 'from' || k === 'to')
      ) {
        data[k] = scrubUrl(v)
      } else {
        data[k] = scrubValue(v, k)
      }
    }
    next.data = data
  }
  return next as T
}
