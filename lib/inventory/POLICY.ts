/**
 * INVENTORY POLICY - PRODUCTION HARDENING
 *
 * MVP POLICY: Inventory is Advisory Only
 *
 * This means:
 * 1. Product.inStock and Product.inventoryStatus are for display/filtering ONLY
 * 2. Checkout does NOT check inventory levels or block orders based on stock
 * 3. Vendor ACCEPTANCE is the sole gate - if vendor cannot fulfill, they reject the order
 * 4. No partial order fulfillment based on partial inventory
 * 5. No reservation/locking of inventory at order time
 *
 * RATIONALE:
 * - Inventory data may be stale or synced from external systems
 * - Vendor knows their actual stock when fulfilling
 * - Rejection + automatic refund is cleaner than partial fulfillment
 * - Single source of truth: VendorOrder status (not inventory tables)
 *
 * FUTURE ENHANCEMENTS (Not MVP):
 * - Real-time inventory sync from vendor systems
 * - Reservation tables to lock stock at checkout
 * - Partial order fulfillment with split shipments
 * - Inventory forecasting based on pending acceptance
 *
 * ENFORCEMENT:
 * Do not add inventory checks in:
 * - /app/api/checkout/route.ts
 * - /lib/cart/calculateCart.ts
 * - /lib/orders/createOrder.ts
 *
 * If future devs want to implement inventory management, create:
 * - lib/inventory/reserve.ts (lock stock at checkout)
 * - lib/inventory/release.ts (unlock on vendor reject)
 * - MUST use transactions and unique constraints to prevent double-sells
 */

export const INVENTORY_POLICY = {
  name: 'ADVISORY_ONLY',
  enforceAtCheckout: false,
  enforceAtAcceptance: false,
  reserveAtCheckout: false,
  releaseOnReject: false,
  description:
    'Inventory is informational. Vendor acceptance/rejection is sole gate. Refund on reject.',
} as const;
