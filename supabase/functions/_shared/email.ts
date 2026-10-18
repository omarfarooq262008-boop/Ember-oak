/**
 * Transactional email via Resend. Never expose RESEND_API_KEY to the browser.
 * Failed sends must not throw to callers that care about order success —
 * use sendTransactionalEmail which logs and returns { ok: false }.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export type EmailTemplateId =
  | 'order_confirmation'
  | 'payment_received'
  | 'payment_failed'
  | 'order_shipped'
  | 'order_cancelled'
  | 'order_refunded'
  | 'contact_notification'

export type EmailModel = {
  preheader: string
  heading: string
  bodyHtml: string
  bodyText: string
  buttonLabel?: string
  buttonUrl?: string
  footerNote?: string
}

function appUrl(): string {
  return (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Bold flat sans-serif table layout, inline CSS, mobile-friendly. */
export function renderEmailHtml(model: EmailModel): string {
  const button =
    model.buttonLabel && model.buttonUrl
      ? `<tr><td style="padding:24px 0 8px;">
          <a href="${escapeHtml(model.buttonUrl)}"
             style="display:inline-block;background:#1c1917;color:#f7f3ee;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:8px;">
            ${escapeHtml(model.buttonLabel)}
          </a>
        </td></tr>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(model.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f3ee;">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
${escapeHtml(model.preheader)}
</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ee;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e0d8;border-radius:12px;">
        <tr>
          <td style="padding:28px 24px 8px;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#a68a5b;">Ember &amp; Oak</p>
            <h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:800;color:#1c1917;">${escapeHtml(model.heading)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 24px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#44403c;">
            ${model.bodyHtml}
            <table role="presentation" cellspacing="0" cellpadding="0">${button}</table>
            <p style="margin:28px 0 0;font-size:12px;line-height:1.45;color:#78716c;">
              ${escapeHtml(model.footerNote ?? 'Questions? Reply to this email or visit our contact page.')}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

export function renderEmailText(model: EmailModel): string {
  const lines = [
    model.heading,
    '',
    model.bodyText,
  ]
  if (model.buttonLabel && model.buttonUrl) {
    lines.push('', `${model.buttonLabel}: ${model.buttonUrl}`)
  }
  lines.push('', model.footerNote ?? 'Questions? Visit our contact page.')
  return lines.join('\n')
}

export function buildOrderEmail(
  template: EmailTemplateId,
  data: {
    orderNumber: string
    customerName?: string
    total?: string
    trackingNumber?: string
    paymentReference?: string
    contactName?: string
    contactMessage?: string
    /** When true, card payment succeeded — use “Order confirmed” wording */
    paid?: boolean
    retryUrl?: string
  },
): { subject: string; model: EmailModel } {
  const base = appUrl()
  const trackUrl = `${base}/track-order`
  const orderLabel = escapeHtml(data.orderNumber)
  const received = !data.paid

  switch (template) {
    case 'order_confirmation':
      return {
        subject: received
          ? `Order received — ${data.orderNumber}`
          : `Order confirmed — ${data.orderNumber}`,
        model: {
          preheader: received
            ? `We've received order ${data.orderNumber}`
            : `Order ${data.orderNumber} is confirmed`,
          heading: received ? 'Order received' : 'Order confirmed',
          bodyHtml: `<p style="margin:0 0 12px;">Thanks${data.customerName ? `, ${escapeHtml(data.customerName)}` : ''}. We've ${received ? 'received' : 'confirmed'} <strong>${orderLabel}</strong>${data.total ? ` for <strong>${escapeHtml(data.total)}</strong>` : ''}.</p>
            ${data.paymentReference ? `<p style="margin:0 0 12px;">Bank transfer reference: <strong>${escapeHtml(data.paymentReference)}</strong></p>` : ''}
            <p style="margin:0;">${received ? "We'll email you again when payment is confirmed or your order ships." : 'Your order is now being prepared.'}</p>`,
          bodyText: `Thanks. We've ${received ? 'received' : 'confirmed'} order ${data.orderNumber}${data.total ? ` for ${data.total}` : ''}.${data.paymentReference ? ` Bank reference: ${data.paymentReference}.` : ''}`,
          buttonLabel: 'Track order',
          buttonUrl: trackUrl,
        },
      }
    case 'payment_received':
      return {
        subject: `Payment received — ${data.orderNumber}`,
        model: {
          preheader: `Payment confirmed for ${data.orderNumber}`,
          heading: 'Payment received',
          bodyHtml: `<p style="margin:0;">We've confirmed payment for <strong>${orderLabel}</strong>. Your order is now being prepared.</p>`,
          bodyText: `We've confirmed payment for ${data.orderNumber}. Your order is now being prepared.`,
          buttonLabel: 'Track order',
          buttonUrl: trackUrl,
        },
      }
    case 'payment_failed': {
      const retry =
        data.retryUrl ??
        `${base}/mock-checkout?order=${encodeURIComponent(data.orderNumber)}`
      return {
        subject: `Payment didn't go through — ${data.orderNumber}`,
        model: {
          preheader: `Payment for ${data.orderNumber} did not complete`,
          heading: "Payment didn't go through",
          bodyHtml: `<p style="margin:0 0 12px;">We couldn't confirm payment for <strong>${orderLabel}</strong>.</p>
            <p style="margin:0;">You can try again using the button below. Your items stay reserved for a short time.</p>`,
          bodyText: `Payment for ${data.orderNumber} did not go through. Retry: ${retry}`,
          buttonLabel: 'Retry payment',
          buttonUrl: retry,
        },
      }
    }
    case 'order_shipped':
      return {
        subject: `Shipped — ${data.orderNumber}`,
        model: {
          preheader: `Order ${data.orderNumber} is on its way`,
          heading: 'Your order has shipped',
          bodyHtml: `<p style="margin:0 0 12px;"><strong>${orderLabel}</strong> is on its way.</p>
            ${data.trackingNumber ? `<p style="margin:0;">Tracking number: <strong>${escapeHtml(data.trackingNumber)}</strong></p>` : ''}`,
          bodyText: `Order ${data.orderNumber} has shipped.${data.trackingNumber ? ` Tracking: ${data.trackingNumber}` : ''}`,
          buttonLabel: 'Track order',
          buttonUrl: trackUrl,
        },
      }
    case 'order_cancelled':
      return {
        subject: `Cancelled — ${data.orderNumber}`,
        model: {
          preheader: `Order ${data.orderNumber} was cancelled`,
          heading: 'Order cancelled',
          bodyHtml: `<p style="margin:0;">Order <strong>${orderLabel}</strong> has been cancelled. If you paid, a refund will follow according to your payment method.</p>`,
          bodyText: `Order ${data.orderNumber} has been cancelled.`,
          buttonLabel: 'Visit store',
          buttonUrl: base,
        },
      }
    case 'order_refunded':
      return {
        subject: `Refunded — ${data.orderNumber}`,
        model: {
          preheader: `Refund processed for ${data.orderNumber}`,
          heading: 'Refund processed',
          bodyHtml: `<p style="margin:0;">A refund for order <strong>${orderLabel}</strong> has been processed. It may take a few business days to appear on your statement.</p>`,
          bodyText: `A refund for order ${data.orderNumber} has been processed.`,
          buttonLabel: 'Visit store',
          buttonUrl: base,
        },
      }
    case 'contact_notification':
      return {
        subject: `New contact message from ${data.contactName ?? 'customer'}`,
        model: {
          preheader: 'New storefront contact message',
          heading: 'New contact message',
          bodyHtml: `<p style="margin:0 0 12px;"><strong>${escapeHtml(data.contactName ?? 'Someone')}</strong> sent a message:</p>
            <p style="margin:0;padding:12px;background:#f7f3ee;border-radius:8px;">${escapeHtml(data.contactMessage ?? '')}</p>`,
          bodyText: `${data.contactName ?? 'Someone'}: ${data.contactMessage ?? ''}`,
          buttonLabel: 'Open admin',
          buttonUrl: `${base}/admin/messages`,
        },
      }
  }
}

async function sendViaResend(opts: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<{ id: string } | { error: string }> {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return { error: 'RESEND_API_KEY not set' }
  const from = Deno.env.get('EMAIL_FROM') ?? 'Ember & Oak <onboarding@resend.dev>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { error: typeof body?.message === 'string' ? body.message : `Resend HTTP ${res.status}` }
  }
  return { id: String(body.id ?? 'unknown') }
}

export async function sendTransactionalEmail(
  admin: SupabaseClient,
  opts: {
    idempotencyKey: string
    template: EmailTemplateId
    to: string
    data: Parameters<typeof buildOrderEmail>[1]
  },
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  try {
    const built = buildOrderEmail(opts.template, opts.data)
    const html = renderEmailHtml(built.model)
    const text = renderEmailText(built.model)

    const { data: claim, error: claimErr } = await admin.rpc('claim_email_outbox', {
      p_idempotency_key: opts.idempotencyKey,
      p_template: opts.template,
      p_to_email: opts.to,
      p_subject: built.subject,
      p_payload: opts.data,
    })
    if (claimErr) {
      await admin.from('app_events').insert({
        event_type: 'email_claim_failed',
        payload: { key: opts.idempotencyKey, error: claimErr.message },
      })
      return { ok: false, error: claimErr.message }
    }

    const shouldSend = Boolean((claim as { should_send?: boolean })?.should_send)
    const outboxId = (claim as { id?: string })?.id
    if (!shouldSend) return { ok: true, skipped: true }

    const result = await sendViaResend({
      to: opts.to,
      subject: built.subject,
      html,
      text,
    })

    if ('error' in result) {
      if (outboxId) {
        await admin.rpc('mark_email_outbox_failed', {
          p_id: outboxId,
          p_error: result.error,
        })
      }
      await admin.from('app_events').insert({
        event_type: 'email_send_failed',
        payload: {
          key: opts.idempotencyKey,
          template: opts.template,
          to: opts.to,
          outboxId: outboxId ?? null,
          error: result.error,
        },
      })
      return { ok: false, error: result.error }
    }

    if (outboxId) {
      await admin.rpc('mark_email_outbox_sent', {
        p_id: outboxId,
        p_provider_message_id: result.id,
      })
    }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'email error'
    await admin.from('app_events').insert({
      event_type: 'email_send_failed',
      payload: {
        key: opts.idempotencyKey,
        template: opts.template,
        to: opts.to,
        error: message,
      },
    })
    return { ok: false, error: message }
  }
}

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase env missing')
  return createClient(url, key)
}
