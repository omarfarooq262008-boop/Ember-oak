import type { OrderStatus } from '@/types'

export const ORDER_STATUSES: OrderStatus[] = [
  'pending_payment',
  'awaiting_payment',
  'awaiting_fulfilment',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Payment pending',
  awaiting_payment: 'Awaiting payment',
  awaiting_fulfilment: 'Awaiting fulfilment',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

const ALLOWED: Record<string, OrderStatus[]> = {
  pending_payment: ['awaiting_payment', 'awaiting_fulfilment', 'cancelled'],
  awaiting_payment: ['awaiting_fulfilment', 'cancelled', 'refunded'],
  awaiting_fulfilment: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
}

export function allowedNextStatuses(from: string): OrderStatus[] {
  return ALLOWED[from] ?? []
}

export function isTransitionAllowed(from: string, to: string): boolean {
  if (from === to) return false
  return allowedNextStatuses(from).includes(to as OrderStatus)
}
