/**
 * Shared email template builders for browser preview.
 * Edge Functions use supabase/functions/_shared/email.ts (same layout).
 */

export type EmailTemplateId =
  | 'order_confirmation'
  | 'payment_received'
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

const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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
  const lines = [model.heading, '', model.bodyText]
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
  },
): { subject: string; model: EmailModel } {
  const base = APP_URL
  const trackUrl = `${base}/track-order`
  const orderLabel = escapeHtml(data.orderNumber)

  switch (template) {
    case 'order_confirmation':
      return {
        subject: `Order confirmed — ${data.orderNumber}`,
        model: {
          preheader: `We've received order ${data.orderNumber}`,
          heading: 'Order confirmed',
          bodyHtml: `<p style="margin:0 0 12px;">Thanks${data.customerName ? `, ${escapeHtml(data.customerName)}` : ''}. We've received <strong>${orderLabel}</strong>${data.total ? ` for <strong>${escapeHtml(data.total)}</strong>` : ''}.</p>
            ${data.paymentReference ? `<p style="margin:0 0 12px;">Bank transfer reference: <strong>${escapeHtml(data.paymentReference)}</strong></p>` : ''}
            <p style="margin:0;">We'll email you again when payment is confirmed or your order ships.</p>`,
          bodyText: `Thanks. We've received order ${data.orderNumber}${data.total ? ` for ${data.total}` : ''}.${data.paymentReference ? ` Bank reference: ${data.paymentReference}.` : ''}`,
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

export const EMAIL_PREVIEW_SAMPLES: Record<
  EmailTemplateId,
  Parameters<typeof buildOrderEmail>[1]
> = {
  order_confirmation: {
    orderNumber: 'EO-SAMPLE123',
    customerName: 'Ayesha Khan',
    total: 'PKR 12,500',
    paymentReference: 'BT-SAMPLE123',
  },
  payment_received: {
    orderNumber: 'EO-SAMPLE123',
    customerName: 'Ayesha Khan',
  },
  order_shipped: {
    orderNumber: 'EO-SAMPLE123',
    trackingNumber: 'TCS-99887766',
  },
  order_cancelled: {
    orderNumber: 'EO-SAMPLE123',
  },
  order_refunded: {
    orderNumber: 'EO-SAMPLE123',
  },
  contact_notification: {
    orderNumber: 'n/a',
    contactName: 'Bilal Ahmed',
    contactMessage: 'Hi — when will the oak desk restock? <script>alert(1)</script>',
  },
}
