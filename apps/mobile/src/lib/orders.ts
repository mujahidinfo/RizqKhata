import type { Order, OrderItem, OrderStatus } from '@/api/types';

/** What can still be refunded: the total less what was already given back. */
export function refundableOf(order: Pick<Order, 'total' | 'refunds'>) {
  const refunded = order.refunds.reduce((s, r) => s + r.amount, 0);
  return Math.max(0, Math.round((order.total - refunded) * 100) / 100);
}

/** Where an order can move next. A sale rung up at the counter is already completed. */
export const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ['PROCESSING', 'FULFILLED', 'CANCELED'],
  PROCESSING: ['FULFILLED', 'CANCELED'],
};

/**
 * Money can go back on a completed order, and again after a partial refund
 * (the API marks the order REFUNDED on the first one), until nothing is left.
 */
export function canRefund(order: Pick<Order, 'status' | 'total' | 'refunds'>) {
  return (order.status === 'FULFILLED' || order.status === 'REFUNDED') && refundableOf(order) > 0;
}

/** Lines that can still go back on the shelf: stocked products with units not yet returned. */
export function returnableLines(order: Pick<Order, 'items'>): OrderItem[] {
  return order.items.filter(
    (i) => i.product?.kind !== 'SERVICE' && !!i.variant && i.quantity - (i.returnedQty ?? 0) > 0,
  );
}

/**
 * What the returned units were really paid: each unit's share of the order
 * total, so an order-level discount or tax is refunded in proportion.
 */
export function returnValue(order: Pick<Order, 'items' | 'subtotal' | 'total'>, back: Record<string, number>) {
  const factor = order.subtotal > 0 ? order.total / order.subtotal : 1;
  const sum = order.items.reduce((s, i) => s + i.price * (back[i.id] ?? 0), 0);
  return Math.round(sum * factor * 100) / 100;
}
