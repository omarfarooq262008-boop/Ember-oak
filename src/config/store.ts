/**
 * Ember & Oak — single source of truth for store configuration.
 * Edit values here; they are used across the entire site.
 */

export const store = {
  name: 'Ember & Oak',
  tagline: 'Fragrance & form for considered homes',
  description:
    'Premium home fragrance and homeware — candles, diffusers, ceramics, and throws — for design-conscious shoppers across Pakistan.',
  whatWeSell:
    'premium home fragrance and homeware (candles, diffusers, ceramics, throws)',
  audience: 'design-conscious shoppers in Pakistan, mostly on mobile',

  currency: {
    code: 'PKR' as const,
    locale: 'en-PK',
    /** Format helper lives in lib/format.ts — display as "PKR 4,500" */
  },

  delivery: {
    nationwide: true,
    workingDaysMin: 3,
    workingDaysMax: 5,
    freeAbovePKR: 8000,
    flatFeePKR: 250,
    summary:
      'Nationwide delivery in 3–5 working days. Free above PKR 8,000; flat PKR 250 below.',
  },

  payments: {
    methods: ['cod', 'bank_transfer', 'card'] as const,
    labels: {
      cod: 'Cash on delivery',
      bank_transfer: 'Bank transfer',
      card: 'Card payment',
    },
    bankTransfer: {
      bankName: 'HBL — Placeholder Bank',
      accountTitle: 'Ember & Oak (Pvt) Ltd',
      accountNumber: '01234567890123',
      iban: 'PK00HABB0000000000000000',
      instructions:
        'Transfer the exact order total and WhatsApp your receipt with your order number. Orders ship after payment confirmation (usually within 1 working day).',
    },
    cardNote: 'Card checkout uses a mock payment provider for demo purposes.',
  },

  support: {
    whatsapp: '+92 300 0000000',
    whatsappUrl: 'https://wa.me/923000000000',
    email: 'hello@emberandoak.pk',
    phone: '+92 21 0000 0000',
    address: {
      line1: 'Suite 12, Design District',
      line2: 'Clifton Block 5',
      city: 'Karachi',
      province: 'Sindh',
      postalCode: '75600',
      country: 'Pakistan',
    },
    hours: 'Mon–Sat, 10:00–18:00 PKT',
  },

  brand: {
    traits: [
      'editorial typography',
      'warm cinematic product photography',
      'generous whitespace',
    ] as const,
  },

  announcement: {
    text: 'Free nationwide delivery on orders above PKR 8,000',
    dismissible: true,
    storageKey: 'eo-announce-dismissed',
  },

  whyUs: [
    {
      title: 'Pakistan-wide delivery in 3–5 working days',
      detail:
        'We ship to every major city and town. Orders placed before 2pm PKT typically leave our Karachi studio the next working day.',
    },
    {
      title: 'Free delivery above PKR 8,000',
      detail:
        'Below that threshold, delivery is a flat PKR 250 — no zone surcharges, no surprise fees at checkout.',
    },
    {
      title: 'Pay your way: COD, bank transfer, or card',
      detail:
        'Cash on delivery across Pakistan, bank transfer with clear instructions, or card via our checkout (mock provider in this demo).',
    },
  ] as const,

  social: {
    instagram: 'https://instagram.com/emberandoak',
    facebook: 'https://facebook.com/emberandoak',
    pinterest: 'https://pinterest.com/emberandoak',
  },

  seo: {
    siteUrl: 'https://emberandoak.pk',
    defaultOgImage:
      'https://images.unsplash.com/photo-1603006905004-abe479046317?w=1200&h=630&fit=crop&q=80',
  },

  navigation: {
    main: [
      { label: 'Shop', href: '/shop' },
      { label: 'Collections', href: '/collections' },
      { label: 'New Arrivals', href: '/shop?sort=newest' },
      { label: 'About', href: '/about' },
    ],
  },

  legal: {
    companyName: 'Ember & Oak (placeholder — register your legal entity)',
    needsLegalReview: true,
    notice:
      'This copy is a working draft for the storefront demo and needs legal review before publication.',
  },
} as const

export type StoreConfig = typeof store
export type PaymentMethod = (typeof store.payments.methods)[number]
