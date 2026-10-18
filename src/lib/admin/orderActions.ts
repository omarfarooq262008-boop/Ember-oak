import { isTransitionAllowed } from '@/lib/admin/orderStatus'
import type { OrderStatus, PaymentMethod } from '@/types'

export type OrderActionId =
  | 'mark_cod_paid'
  | 'mark_bank_paid'
  | 'ship'
  | 'mark_delivered'
  | 'cancel'
  | 'refund'

export type OrderActionState = {
  id: OrderActionId
  label: string
  enabled: boolean
  disabledReason: string | null
}

export type OrderActionInput = {
  status: OrderStatus | string
  paymentMethod: PaymentMethod | string
  paymentStatus?: string | null
}

export function getOrderActionStates(order: OrderActionInput): OrderActionState[] {
  const status = order.status
  const method = order.paymentMethod
  const pay = (order.paymentStatus ?? 'pending').toLowerCase()
  const closed = status === 'cancelled' || status === 'refunded'
  const alreadyPaid = pay === 'paid' || pay === 'refunded'

  const codEnabled =
    method === 'cod' && !closed && !alreadyPaid
  const bankEnabled =
    method === 'bank_transfer' && status === 'awaiting_payment' && !alreadyPaid
  const shipEnabled = isTransitionAllowed(status, 'shipped')
  const deliveredEnabled = isTransitionAllowed(status, 'delivered')
  const cancelEnabled = isTransitionAllowed(status, 'cancelled')
  const refundEnabled =
    method === 'card' &&
    pay === 'paid' &&
    isTransitionAllowed(status, 'refunded')

  return [
    {
      id: 'mark_cod_paid',
      label: 'Mark COD paid',
      enabled: codEnabled,
      disabledReason: codEnabled
        ? null
        : method !== 'cod'
          ? 'Only available for cash-on-delivery orders.'
          : closed
            ? 'Order is already closed.'
            : alreadyPaid
              ? 'Payment is already marked paid.'
              : 'Not available for this order.',
    },
    {
      id: 'mark_bank_paid',
      label: 'Mark bank transfer paid',
      enabled: bankEnabled,
      disabledReason: bankEnabled
        ? null
        : method !== 'bank_transfer'
          ? 'Only available for bank transfer orders.'
          : alreadyPaid
            ? 'Payment is already marked paid.'
            : status !== 'awaiting_payment'
              ? `Requires status “Awaiting payment” (currently “${status}”).`
              : 'Not available for this order.',
    },
    {
      id: 'ship',
      label: 'Ship',
      enabled: shipEnabled,
      disabledReason: shipEnabled
        ? null
        : closed
          ? 'Order is already closed.'
          : status !== 'awaiting_fulfilment'
            ? 'Ship is only allowed from “Awaiting fulfilment”.'
            : 'Not available for this status.',
    },
    {
      id: 'mark_delivered',
      label: 'Mark delivered',
      enabled: deliveredEnabled,
      disabledReason: deliveredEnabled
        ? null
        : status !== 'shipped'
          ? 'Mark delivered is only allowed after the order is shipped.'
          : 'Not available for this status.',
    },
    {
      id: 'cancel',
      label: 'Cancel',
      enabled: cancelEnabled,
      disabledReason: cancelEnabled
        ? null
        : closed
          ? 'Order is already closed.'
          : 'Cancel is not allowed from the current status.',
    },
    {
      id: 'refund',
      label: 'Refund',
      enabled: refundEnabled,
      disabledReason: refundEnabled
        ? null
        : method !== 'card'
          ? 'Refund via provider is only for card orders.'
          : pay !== 'paid'
            ? 'Refund is only available after the card payment succeeds.'
            : !isTransitionAllowed(status, 'refunded')
              ? 'Refund is not allowed from the current status.'
              : 'Not available for this order.',
    },
  ]
}
