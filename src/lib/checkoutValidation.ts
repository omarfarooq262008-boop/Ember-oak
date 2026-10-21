import type { PaymentMethod } from '@/types'

export interface FormState {
  email: string
  phone: string
  shippingName: string
  shippingAddress: string
  shippingProvince: string
  shippingCity: string
  shippingPostal: string
  paymentMethod: PaymentMethod
  cardName: string
  cardNumber: string
  cardExpiry: string
  cardCvc: string
}

export interface FormErrors {
  email?: string
  phone?: string
  shippingName?: string
  shippingAddress?: string
  shippingProvince?: string
  shippingCity?: string
  paymentMethod?: string
  cardName?: string
  cardNumber?: string
  cardExpiry?: string
  cardCvc?: string
}

export function validateForm(values: FormState): FormErrors {
  const errors: FormErrors = {}
  const email = values.email.trim()
  if (!email) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  const phone = values.phone.trim()
  if (!phone) errors.phone = 'Phone number is required.'
  else if (phone.replace(/\D/g, '').length < 10) {
    errors.phone = 'Enter a valid phone number.'
  }

  if (!values.shippingName.trim()) errors.shippingName = 'Full name is required.'
  if (!values.shippingAddress.trim()) errors.shippingAddress = 'Address is required.'
  if (!values.shippingProvince) errors.shippingProvince = 'Select a province.'
  if (!values.shippingCity) errors.shippingCity = 'Select a city.'

  if (values.paymentMethod === 'card') {
    if (!values.cardName.trim()) errors.cardName = 'Name on card is required.'
    if (values.cardNumber.replace(/\s/g, '').length < 12) {
      errors.cardNumber = 'Enter a valid card number.'
    }
    if (!/^\d{2}\/\d{2}$/.test(values.cardExpiry.trim())) {
      errors.cardExpiry = 'Use MM/YY format.'
    }
    if (!/^\d{3,4}$/.test(values.cardCvc.trim())) {
      errors.cardCvc = 'Enter a valid CVC.'
    }
  }

  return errors
}
