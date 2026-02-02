/**
 * Order Status Terminal State Helpers
 *
 * Defines which Order statuses are "terminal" (no more refunds/changes allowed)
 * vs "non-terminal" (refunds and state changes allowed).
 */

export const TERMINAL_ORDER_STATUSES = new Set([
  'FULFILLED',
  'PARTIALLY_FULFILLED',
  'CANCELLED',
  'REFUNDED',
]);

export const NON_TERMINAL_ORDER_STATUSES = new Set([
  'PENDING_PAYMENT',
  'PAID',
  'FULFILLING',
]);

/**
 * Check if an Order status is terminal (no more state changes allowed).
 */
export function isTerminalOrderStatus(status: string): boolean {
  return TERMINAL_ORDER_STATUSES.has(status);
}

/**
 * Check if an Order status allows refunds.
 * Refunds are only allowed while order is non-terminal.
 */
export function canRefundOrderStatus(status: string): boolean {
  return NON_TERMINAL_ORDER_STATUSES.has(status);
}
