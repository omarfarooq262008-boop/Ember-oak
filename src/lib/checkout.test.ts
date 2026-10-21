import { describe, expect, it } from 'vitest'

import { getCitiesForProvince, getProvinceBySlug } from '@/lib/pakistan'
import { validateForm, type FormState } from './checkoutValidation'

const validBaseForm: FormState = {
  email: 'customer@example.pk',
  phone: '0300 1234567',
  shippingName: 'Usman Khan',
  shippingAddress: 'House 42, Street 5, Phase 6, DHA',
  shippingProvince: 'Sindh',
  shippingCity: 'Karachi',
  shippingPostal: '75500',
  paymentMethod: 'cod',
  cardName: '',
  cardNumber: '',
  cardExpiry: '',
  cardCvc: '',
}

describe('checkout validation', () => {
  it('passes with valid customer and Pakistani address info', () => {
    const errors = validateForm(validBaseForm)
    expect(errors).toEqual({})
  })

  describe('Pakistani phone validation', () => {
    it('requires a phone number', () => {
      const errors = validateForm({ ...validBaseForm, phone: '' })
      expect(errors.phone).toBe('Phone number is required.')
    })

    it('rejects phone numbers with fewer than 10 digits', () => {
      const errors = validateForm({ ...validBaseForm, phone: '0300 123' })
      expect(errors.phone).toBe('Enter a valid phone number.')
    })

    it('accepts valid 10-11 digit Pakistani mobile / landline formats', () => {
      expect(validateForm({ ...validBaseForm, phone: '03001234567' }).phone).toBeUndefined()
      expect(validateForm({ ...validBaseForm, phone: '+92 300 1234567' }).phone).toBeUndefined()
      expect(validateForm({ ...validBaseForm, phone: '021 35812345' }).phone).toBeUndefined()
      expect(validateForm({ ...validBaseForm, phone: '042-35789012' }).phone).toBeUndefined()
    })
  })

  describe('Pakistani address validation', () => {
    it('requires a shipping name and address', () => {
      const errors = validateForm({
        ...validBaseForm,
        shippingName: '   ',
        shippingAddress: '   ',
      })
      expect(errors.shippingName).toBe('Full name is required.')
      expect(errors.shippingAddress).toBe('Address is required.')
    })

    it('requires province and city selection', () => {
      const errors = validateForm({
        ...validBaseForm,
        shippingProvince: '',
        shippingCity: '',
      })
      expect(errors.shippingProvince).toBe('Select a province.')
      expect(errors.shippingCity).toBe('Select a city.')
    })

    it('matches cities with provinces from Pakistan provinces data', () => {
      const sindhCities = getCitiesForProvince('Sindh')
      expect(sindhCities).toContain('Karachi')
      expect(sindhCities).toContain('Hyderabad')

      const punjabCities = getCitiesForProvince('Punjab')
      expect(punjabCities).toContain('Lahore')
      expect(punjabCities).toContain('Faisalabad')

      const kpkCities = getCitiesForProvince('KPK')
      expect(kpkCities).toContain('Peshawar')

      const ictProvince = getProvinceBySlug('islamabad-capital-territory')
      expect(ictProvince?.cities).toContain('Islamabad')
    })
  })

  describe('card payment validation', () => {
    it('requires card fields only when paymentMethod is card', () => {
      const codErrors = validateForm({ ...validBaseForm, paymentMethod: 'cod' })
      expect(codErrors.cardNumber).toBeUndefined()

      const cardErrors = validateForm({ ...validBaseForm, paymentMethod: 'card' })
      expect(cardErrors.cardName).toBe('Name on card is required.')
      expect(cardErrors.cardNumber).toBe('Enter a valid card number.')
      expect(cardErrors.cardExpiry).toBe('Use MM/YY format.')
      expect(cardErrors.cardCvc).toBe('Enter a valid CVC.')
    })
  })
})
