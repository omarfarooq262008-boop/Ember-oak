import { describe, expect, it } from 'vitest'

import {
  buildOrderEmail,
  escapeHtml,
  renderEmailHtml,
  renderEmailText,
} from './templates'

describe('email templates', () => {
  it('escapes user text in HTML', () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).not.toContain('<script>')
    const { model } = buildOrderEmail('contact_notification', {
      orderNumber: 'n/a',
      contactName: 'A <b>B</b>',
      contactMessage: '<img src=x onerror=alert(1)>',
    })
    const html = renderEmailHtml(model)
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img')
  })

  it('includes preheader, button, and plain-text version', () => {
    const { subject, model } = buildOrderEmail('order_shipped', {
      orderNumber: 'EO-1',
      trackingNumber: 'TRACK-1',
    })
    expect(subject).toContain('EO-1')
    const html = renderEmailHtml(model)
    expect(html).toContain(model.preheader)
    expect(html).toContain('TRACK-1')
    expect(html).toContain('Track order')
    const text = renderEmailText(model)
    expect(text).toContain('TRACK-1')
    expect(text).toContain('Track order:')
  })

  it('uses Order received vs Order confirmed based on paid flag', () => {
    const received = buildOrderEmail('order_confirmation', {
      orderNumber: 'EO-1',
      paid: false,
    })
    expect(received.model.heading).toBe('Order received')
    const confirmed = buildOrderEmail('order_confirmation', {
      orderNumber: 'EO-1',
      paid: true,
    })
    expect(confirmed.model.heading).toBe('Order confirmed')
  })

  it('payment_failed includes retry link', () => {
    const { model } = buildOrderEmail('payment_failed', {
      orderNumber: 'EO-1',
      retryUrl: 'http://localhost:5173/mock-checkout?order=EO-1',
    })
    expect(model.heading).toBe("Payment didn't go through")
    expect(model.buttonUrl).toContain('mock-checkout')
  })
})
