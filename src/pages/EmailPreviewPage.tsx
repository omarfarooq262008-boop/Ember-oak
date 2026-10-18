import { useMemo, useState } from 'react'

import { Seo } from '@/components/seo/Seo'
import {
  EMAIL_PREVIEW_SAMPLES,
  buildOrderEmail,
  renderEmailHtml,
  renderEmailText,
  type EmailTemplateId,
} from '@/lib/email/templates'

const TEMPLATES: EmailTemplateId[] = [
  'order_confirmation',
  'payment_received',
  'order_shipped',
  'order_cancelled',
  'order_refunded',
  'contact_notification',
]

export function EmailPreviewPage() {
  const [active, setActive] = useState<EmailTemplateId>('order_confirmation')
  const [showText, setShowText] = useState(false)

  const built = useMemo(() => {
    const sample = EMAIL_PREVIEW_SAMPLES[active]
    return buildOrderEmail(active, sample)
  }, [active])

  const html = useMemo(() => renderEmailHtml(built.model), [built])
  const text = useMemo(() => renderEmailText(built.model), [built])

  return (
    <>
      <Seo title="Email preview" description="Transactional email previews with sample data." />
      <div className="min-h-screen bg-[#f7f3ee]">
        <div className="border-b border-[#e7e0d8] bg-white px-4 py-4">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#a68a5b]">
                Dev preview
              </p>
              <h1 className="text-xl font-extrabold text-[#1c1917]">Transactional emails</h1>
              <p className="text-sm text-[#78716c]">Sample data · escaped user text · table layout</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#44403c]">
              <input
                type="checkbox"
                checked={showText}
                onChange={(e) => setShowText(e.target.checked)}
              />
              Plain text
            </label>
          </div>
          <div className="mx-auto mt-4 flex max-w-5xl flex-wrap gap-2">
            {TEMPLATES.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  active === id
                    ? 'bg-[#1c1917] text-[#f7f3ee]'
                    : 'border border-[#e7e0d8] bg-white text-[#1c1917]'
                }`}
              >
                {id}
              </button>
            ))}
          </div>
          <p className="mx-auto mt-3 max-w-5xl text-sm text-[#78716c]">
            Subject: <span className="font-medium text-[#1c1917]">{built.subject}</span>
          </p>
        </div>

        <div className="mx-auto max-w-5xl p-4">
          {showText ? (
            <pre className="whitespace-pre-wrap rounded-xl border border-[#e7e0d8] bg-white p-6 text-sm text-[#44403c]">
              {text}
            </pre>
          ) : (
            <iframe
              title={built.subject}
              srcDoc={html}
              className="h-[720px] w-full rounded-xl border border-[#e7e0d8] bg-white"
            />
          )}
        </div>
      </div>
    </>
  )
}
