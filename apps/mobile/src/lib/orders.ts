import type { Order, OrderStatus } from '@/api/types';

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
