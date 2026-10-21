import { describe, expect, it } from 'vitest'

import { scrubEvent, scrubString, scrubUrl, scrubValue } from './scrub'

describe('sentry scrubber', () => {
  it('removes emails from strings', () => {
    expect(scrubString('Contact ada@emberandoak.pk please')).toBe(
      'Contact [Filtered] please',
    )
  })

  it('removes phone numbers from strings', () => {
    expect(scrubString('Call +92 300 1234567 today')).toContain('[Filtered]')
    expect(scrubString('Call +92 300 1234567 today')).not.toContain('300 1234567')
  })

  it('scrubs token query strings from URLs', () => {
    const scrubbed = scrubUrl(
      'https://emberandoak.pk/track-order?token=super-secret-tracking-token&x=1',
    )
    expect(scrubbed).toContain('token=%5BFiltered%5D')
    expect(scrubbed).not.toContain('super-secret-tracking-token')
  })

  it('redacts sensitive object keys including discount codes and bodies', () => {
    const scrubbed = scrubValue({
      email: 'a@b.co',
      phone: '03001234567',
      discountCode: 'WELCOME10',
      tracking_token: 'tok_abc',
      shipping_address: 'House 1',
      name: 'Ada Khan',
      body: { email: 'hidden@x.com' },
      note: 'ok',
    }) as Record<string, unknown>

    expect(scrubbed.email).toBe('[Filtered]')
    expect(scrubbed.phone).toBe('[Filtered]')
    expect(scrubbed.discountCode).toBe('[Filtered]')
    expect(scrubbed.tracking_token).toBe('[Filtered]')
    expect(scrubbed.shipping_address).toBe('[Filtered]')
    expect(scrubbed.name).toBe('[Filtered]')
    expect(scrubbed.body).toBe('[Filtered]')
    expect(scrubbed.note).toBe('ok')
  })

  it('scrubs emails, phones and tokens on a full event', () => {
    const event = scrubEvent({
      message: 'Failed for user@example.com phone 0300 1112233',
      request: {
        url: 'https://emberandoak.pk/order?token=abc123',
        data: { email: 'x@y.z', items: [] },
      },
      user: { email: 'x@y.z', id: 'u1' },
      breadcrumbs: [
        {
          message: 'POST body for ada@test.com',
          data: { url: '/api?token=t1', body: '{"a":1}' },
        },
      ],
    })

    expect(event.message).not.toContain('user@example.com')
    expect(event.message).not.toContain('0300 1112233')
    expect(event.request?.url).not.toContain('abc123')
    expect(event.request?.data).toBe('[Filtered]')
    expect(event.user?.email).toBeUndefined()
    expect(event.breadcrumbs?.[0]?.message).not.toContain('ada@test.com')
    expect(event.breadcrumbs?.[0]?.data?.body).toBe('[Filtered]')
    expect(String(event.breadcrumbs?.[0]?.data?.url)).not.toContain('t1')
  })
})
