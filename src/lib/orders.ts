/**
 * Orders are created via the create-order Edge Function / create_order_atomic.
 * Cart remains in localStorage; order history is not stored in the browser.
 */

export type ConfirmationSnapshot = {
  orderNumber: string
  status: string
  total: number
  trackingToken: string
  email: string
  paymentMethod: string
}
