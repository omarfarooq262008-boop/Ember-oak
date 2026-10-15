import type { OrderStatus, PaymentMethod } from '@/types'

const STORAGE_KEY = 'eo-orders-v1'

export interface LocalOrderItem {
  product_id: string | null
  variant_id: string | null
  product_name: string
  variant_label: string
  sku: string
  unit_price: number
  quantity: number
  line_total: number
}

export interface LocalOrder {
  id: string
  order_number: string
  token: string
  email: string
  status: OrderStatus
  payment_method: PaymentMethod
  subtotal: number
  discount: number
  delivery_fee: number
  total: number
  discount_code: string | null
  shipping_name: string
  shipping_phone: string
  shipping_address: string
  shipping_city: string
  shipping_province: string
  shipping_postal: string | null
  created_at: string
  items: LocalOrderItem[]
}

function readOrders(): LocalOrder[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as LocalOrder[]) : []
  } catch {
    return []
  }
}

function writeOrders(orders: LocalOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  } catch {
    /* quota or private mode */
  }
}

export function generateOrderNumber(): string {
  const num = Math.floor(100000 + Math.random() * 900000)
  return `EO-${num}`
}

export function generateOrderToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `tok_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export function saveOrder(order: LocalOrder): void {
  const orders = readOrders()
  orders.unshift(order)
  writeOrders(orders)
}

export function getOrderByNumberAndEmail(
  orderNumber: string,
  email: string,
): LocalOrder | undefined {
  const normalizedNumber = orderNumber.trim().toUpperCase()
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedNumber || !normalizedEmail) return undefined

  return readOrders().find(
    (o) =>
      o.order_number.toUpperCase() === normalizedNumber &&
      o.email.trim().toLowerCase() === normalizedEmail,
  )
}

export function getOrderByToken(token: string): LocalOrder | undefined {
  const trimmed = token.trim()
  if (!trimmed) return undefined
  return readOrders().find((o) => o.token === trimmed)
}
