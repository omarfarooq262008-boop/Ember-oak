import { Seo } from '@/components/seo/Seo'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { store } from '@/config/store'
import { formatPKR } from '@/lib/format'

const faqs = [
  {
    id: 'currency',
    question: 'What currency do you charge in?',
    answer: `All prices and checkout totals are in ${store.currency.code} (Pakistani Rupees). Amounts display as "${store.currency.code} 4,500" style with thousands separators — no hidden USD conversion.`,
  },
  {
    id: 'cod',
    question: 'Do you offer cash on delivery (COD)?',
    answer: `Yes. ${store.payments.labels.cod} is available across Pakistan. Pay the courier in cash when your parcel arrives. Please keep change handy; repeated refused COD deliveries may require prepaid shipping on future orders.`,
  },
  {
    id: 'delivery-time',
    question: 'How long does delivery take?',
    answer: `After dispatch from our Karachi studio, nationwide delivery usually takes ${store.delivery.workingDaysMin}–${store.delivery.workingDaysMax} working days. Orders placed before 2pm PKT on working days typically ship the next working day.`,
  },
  {
    id: 'free-shipping',
    question: 'When is delivery free?',
    answer: `Delivery is free on orders at or above ${formatPKR(store.delivery.freeAbovePKR)}. Below that threshold, shipping is a flat ${formatPKR(store.delivery.flatFeePKR)} with no zone surcharges.`,
  },
  {
    id: 'bank-transfer',
    question: 'How does bank transfer work?',
    answer: `${store.payments.bankTransfer.instructions} Bank: ${store.payments.bankTransfer.bankName}, account title ${store.payments.bankTransfer.accountTitle}.`,
  },
  {
    id: 'track',
    question: 'How can I track my order without an account?',
    answer:
      'Use Track order on our site with your order number (e.g. EO-123456) and the email from checkout. Guest checkout means you do not need to sign in.',
  },
  {
    id: 'returns',
    question: 'Can I return a candle or diffuser?',
    answer:
      'Unopened items in original packaging may be returned within 7 days for credit or exchange. Opened fragrance products cannot be returned for hygiene reasons. Damaged goods should be reported within 48 hours with photos.',
  },
] as const

export function FaqPage() {
  return (
    <>
      <Seo
        title="FAQ"
        description={`Frequently asked questions about ${store.name} — ${store.delivery.summary}`}
        url={`${store.seo.siteUrl}/faq`}
      />

      <div className="section-pad container-eo mx-auto max-w-2xl">
        <h1 className="text-3xl">Frequently asked questions</h1>
        <p className="mt-2 text-sm text-muted">
          Quick answers about payments, delivery, and returns. Still stuck?{' '}
          <a href={`mailto:${store.support.email}`} className="text-text hover:text-accent">
            {store.support.email}
          </a>
          .
        </p>

        <Accordion type="single" collapsible className="mt-10 w-full">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </>
  )
}
