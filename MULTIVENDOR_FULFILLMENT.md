# Multi-Vendor Fulfillment System - Implementation Guide

> **⚠️ SECURITY WARNING - AUTHENTICATION**  
> This document contains DEPRECATED API examples showing `x-vendor-id` headers.  
> **FORBIDDEN IN PRODUCTION** - This pattern was removed during security hardening.  
> **REQUIRED**: All vendor APIs use session-based authentication via `requireVendor()`.  
> See [PRODUCTION_HARDENING_COMPLETE.md](PRODUCTION_HARDENING_COMPLETE.md) for current implementation.

## Overview

This system converts the single Order model into a **database-driven, SLA-based, auditable, multi-vendor fulfillment system**.

**Key Principle**: Database is the system of record. Email is notification only.

---

## Database Schema

### New Models Added

#### VendorOrder
Represents each vendor's fulfillment responsibility within a customer's order.

```sql
CREATE TABLE "VendorOrder" (
  id              TEXT PRIMARY KEY,
  orderId         TEXT NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  vendorId        TEXT NOT NULL REFERENCES "Vendor"(id) ON DELETE CASCADE,
  
  status          VendorOrderStatus DEFAULT 'PENDING_ACCEPTANCE',
  acceptBy        TIMESTAMP NOT NULL,
  acceptedAt      TIMESTAMP,
  rejectedAt      TIMESTAMP,
  fulfilledAt     TIMESTAMP,
  cancelledAt     TIMESTAMP,
  
  notesToVendor   TEXT,
  notesInternal   TEXT,
  
  createdAt       TIMESTAMP DEFAULT NOW(),
  updatedAt       TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(orderId, vendorId),
  INDEX ON vendorId,
  INDEX ON status,
  INDEX ON acceptBy
);
```

#### VendorOrderItem
Maps order items to their vendor order.

```sql
CREATE TABLE "VendorOrderItem" (
  id            TEXT PRIMARY KEY,
  vendorOrderId TEXT NOT NULL REFERENCES "VendorOrder"(id) ON DELETE CASCADE,
  orderItemId   TEXT NOT NULL REFERENCES "OrderItem"(id) ON DELETE CASCADE,
  
  UNIQUE(vendorOrderId, orderItemId),
  INDEX ON vendorOrderId,
  INDEX ON orderItemId
);
```

#### OrderEvent
Complete audit trail of all state changes.

```sql
CREATE TABLE "OrderEvent" (
  id            TEXT PRIMARY KEY,
  orderId       TEXT REFERENCES "Order"(id) ON DELETE CASCADE,
  vendorOrderId TEXT REFERENCES "VendorOrder"(id) ON DELETE CASCADE,
  
  actorType     ActorType (SYSTEM|USER|VENDOR|ADMIN),
  actorId       TEXT,
  eventType     TEXT NOT NULL,
  data          JSON,
  
  createdAt     TIMESTAMP DEFAULT NOW(),
  
  INDEX ON orderId,
  INDEX ON vendorOrderId,
  INDEX ON eventType,
  INDEX ON createdAt
);
```

#### Enums

```typescript
enum VendorOrderStatus {
  PENDING_ACCEPTANCE  // Waiting for vendor decision
  ACCEPTED           // Vendor accepted
  REJECTED           // Vendor rejected
  PREPARING          // Being prepared
  OUT_FOR_DELIVERY   // On the way
  DELIVERED          // Delivered
  CANCELLED          // Auto-cancelled by SLA
  FAILED             // Failed to deliver
}

enum ActorType {
  SYSTEM             // Cron/automatic action
  USER               // Customer action
  VENDOR             // Vendor action
  ADMIN              // Admin action
}
```

---

## Workflow

### 1. Payment Confirmation → Vendor Order Creation

**Trigger**: Stripe webhook `checkout.session.completed`

**Steps**:
1. Webhook confirms payment
2. Order status → `PAID`
3. **NEW**: Group OrderItems by vendor
4. **NEW**: For each vendor:
   - Create VendorOrder with status = `PENDING_ACCEPTANCE`
   - Set `acceptBy = now() + 15 minutes`
   - Attach OrderItems via VendorOrderItem
   - Log event: `VENDOR_ORDER_CREATED`
5. Update Order status → `FULFILLING`
6. Log event: `ORDER_STATUS_CHANGED` (PAID → FULFILLING)

**Code**: `/app/api/stripe/webhook/route.ts`

### 2. Vendor Acceptance (Time-Bounded)

**Endpoint**: `POST /api/vendor/orders/[id]/accept`

**Validation**:
- Vendor owns this order
- Status = `PENDING_ACCEPTANCE`
- Current time < `acceptBy`

**Actions**:
- Set status = `ACCEPTED`
- Set `acceptedAt = now()`
- Log event: `VENDOR_ACCEPTED`

**Failure**: If past `acceptBy`, request rejected with error

**Code**: `/app/api/vendor/orders/[id]/accept/route.ts`

### 3. Vendor Rejection (Triggers Partial Refund)

**Endpoint**: `POST /api/vendor/orders/[id]/reject`

**Required**: `rejectionReason` (text)

**Validation**:
- Vendor owns this order
- Status = `PENDING_ACCEPTANCE` or `ACCEPTED`

**Actions**:
- Set status = `REJECTED`
- Set `rejectedAt = now()`
- Calculate refund = sum of OrderItem.lineTotalFils
- Call Stripe refund API
- Log event: `VENDOR_REJECTED`
- Log event: `PARTIAL_REFUND`

**Idempotency**: Can reject if already accepted (vendor changes mind)

**Code**: `/app/api/vendor/orders/[id]/reject/route.ts`

### 4. SLA Enforcement (Auto-Cancellation)

**Trigger**: Cron job every 1–5 minutes OR manual API call

**Query**: Find VendorOrders where:
- Status = `PENDING_ACCEPTANCE`
- `acceptBy < now()`

**For Each Expired Order**:
1. Set status = `CANCELLED`
2. Set `cancelledAt = now()`
3. Calculate refund amount
4. Process Stripe refund
5. Log events:
   - `VENDOR_SLA_EXPIRED`
   - `PARTIAL_REFUND`
6. Check if all vendors have responded
   - If all cancelled → Order status = `CANCELLED` + log `ORDER_CANCELLED_ALL_VENDORS_SLA`

**Idempotency**: Safe to run multiple times; checks status before updating

**Code**: `/lib/fulfillment/sla-enforcement.ts`

**API**: `POST /api/admin/sla/enforce` (also callable from cron)

### 5. Fulfillment Status Updates

**Endpoint**: `POST /api/vendor/orders/[id]/update-status`

**Request Body**:
```json
{
  "newStatus": "PREPARING|OUT_FOR_DELIVERY|DELIVERED"
}
```

**Valid Transitions**:
```
ACCEPTED → PREPARING
PREPARING → OUT_FOR_DELIVERY
OUT_FOR_DELIVERY → DELIVERED
```

**Actions**:
- Validate transition
- Update status
- If `DELIVERED`: set `fulfilledAt = now()`
- Log event: `VENDOR_STATUS_CHANGED`
- Check if all vendor orders are fulfilled → update parent Order

**Code**: `/app/api/vendor/orders/[id]/update-status/route.ts`

### 6. Parent Order Status Resolution

**Trigger**: When last vendor order transitions to terminal state

**Logic**:
```
If all VendorOrders are in terminal state (DELIVERED, REJECTED, CANCELLED):
  - If all DELIVERED → Order = FULFILLED
  - If some DELIVERED, some REJECTED → Order = PARTIALLY_FULFILLED
  - If all REJECTED/CANCELLED → Order = CANCELLED
```

**Code**: `lib/fulfillment/vendor-orders.ts` (checkAndUpdateParentOrderStatus)

---

## API Reference

### Vendor APIs

#### List Vendor Orders
```
GET /api/vendor/orders?status=PENDING_ACCEPTANCE&limit=50&offset=0

❌ DEPRECATED: x-vendor-id header (security vulnerability)
✅ CURRENT: Session-based authentication via requireVendor()
Headers:
  Cookie: next-auth.session-token=... (automatic)

Response:
{
  success: true,
  data: [
    {
      id: "vo_...",
      orderId: "ord_...",
      status: "PENDING_ACCEPTANCE",
      createdAt: "2026-02-02T10:00:00Z",
      acceptBy: "2026-02-02T10:15:00Z",
      isExpired: false,
      minutesRemaining: 5,
      customer: {
        name: "Ahmed Al-Mansouri",
        phone: "+971 50 123 4567",
        address: "123 Main St, Dubai"
      },
      amount: {
        fils: 50000,
        aed: "500.00"
      },
      items: [
        {
          id: "oi_...",
          productName: "Vitamin D 1000 IU",
          quantity: 2,
          lineTotalFils: 50000,
          lineAED: "500.00"
        }
      ],
      notes: {
        toVendor: "Please accept or reject...",
        internal: null
      }
    }
  ],
  pagination: {
    total: 150,
    limit: 50,
    offset: 0,
    count: 50,
    hasMore: true
  }
}
```

#### Get Vendor Order Details
```
GET /api/vendor/orders/[id]/details

❌ DEPRECATED: x-vendor-id header (security vulnerability)
✅ CURRENT: Session-based authentication via requireVendor()
Headers:
  Cookie: next-auth.session-token=... (automatic)

Response:
{
  success: true,
  vendorOrder: {
    id: "vo_...",
    status: "PENDING_ACCEPTANCE",
    createdAt: "2026-02-02T10:00:00Z",
    acceptBy: "2026-02-02T10:15:00Z",
    acceptedAt: null,
    rejectedAt: null,
    fulfilledAt: null,
    cancelledAt: null,
    isExpired: false,
    minutesRemaining: 5,
    notes: {...},
    order: {...},
    items: [...],
    itemCount: 1
  },
  eventHistory: [
    {
      id: "evt_...",
      eventType: "VENDOR_ORDER_CREATED",
      actorType: "SYSTEM",
      actorId: null,
      data: {
        vendorName: "Vendor Name",
        itemCount: 1,
        acceptByTime: "2026-02-02T10:15:00Z"
      },
      createdAt: "2026-02-02T10:00:00Z"
    }
  ]
}
```

#### Accept Vendor Order
```
POST /api/vendor/orders/[id]/accept

❌ DEPRECATED: x-vendor-id header (security vulnerability)
✅ CURRENT: Session-based authentication via requireVendor()
Headers:
  Cookie: next-auth.session-token=... (automatic)

Request Body: {} (no body needed)

Response:
{
  success: true,
  vendorOrder: {
    id: "vo_...",
    status: "ACCEPTED",
    acceptedAt: "2026-02-02T10:05:00Z",
    itemCount: 1
  }
}
```

#### Reject Vendor Order
```
POST /api/vendor/orders/[id]/reject

❌ DEPRECATED: x-vendor-id header (security vulnerability)
✅ CURRENT: Session-based authentication via requireVendor()
Headers:
  Cookie: next-auth.session-token=... (automatic)

Request Body:
{
  "rejectionReason": "Out of stock for vitamin D variant"
}

Response:
{
  success: true,
  message: "Order rejected and partial refund initiated",
  vendorOrder: {
    id: "vo_...",
    status: "REJECTED",
    rejectedAt: "2026-02-02T10:05:00Z",
    rejectionReason: "Out of stock...",
    itemCount: 1
  }
}
```

#### Update Fulfillment Status
```
POST /api/vendor/orders/[id]/update-status

❌ DEPRECATED: x-vendor-id header (security vulnerability)
✅ CURRENT: Session-based authentication via requireVendor()
Headers:
  Cookie: next-auth.session-token=... (automatic)

Request Body:
{
  "newStatus": "PREPARING"
}

Response:
{
  success: true,
  vendorOrder: {
    id: "vo_...",
    status: "PREPARING",
    updatedAt: "2026-02-02T10:10:00Z",
    fulfilledAt: null,
    itemCount: 1
  }
}
```

### Admin APIs

#### Get SLA Status
```
GET /api/admin/sla/status

Headers:
  x-admin-role: true

Response:
{
  success: true,
  data: [
    {
      vendorOrderId: "vo_...",
      orderId: "ord_...",
      vendorName: "Vendor Name",
      customerName: "Ahmed Al-Mansouri",
      acceptBy: "2026-02-02T10:15:00Z",
      isExpired: false,
      minutesRemaining: 5,
      amountAED: "500.00"
    }
  ],
  timestamp: "2026-02-02T10:10:00Z"
}
```

#### Enforce SLA
```
POST /api/admin/sla/enforce

Headers:
  x-admin-role: true
  OR
  x-cron-secret: <CRON_SECRET from env>

Request Body: {} (no body needed)

Response:
{
  success: true,
  result: {
    expiredOrderIds: ["vo_...", "vo_..."],
    cancelledCount: 2,
    refundCount: 2,
    errors: []
  },
  timestamp: "2026-02-02T10:10:00Z"
}
```

---

## Event Logging

Every state change is logged to `OrderEvent`. This provides a complete audit trail.

### Event Types

| Event Type | Actor | Trigger | Data |
|------------|-------|---------|------|
| `VENDOR_ORDER_CREATED` | SYSTEM | Payment confirmed | vendorName, itemCount, acceptByTime |
| `VENDOR_ACCEPTED` | VENDOR | Vendor accepts | vendorName, itemCount, acceptedAt |
| `VENDOR_REJECTED` | VENDOR | Vendor rejects | vendorName, itemCount, reason, rejectedAt |
| `VENDOR_SLA_EXPIRED` | SYSTEM | SLA enforcement | vendorName, acceptByTime, expiredAt, minutesOverdue |
| `VENDOR_STATUS_CHANGED` | VENDOR | Status update | from, to, vendorName |
| `PARTIAL_REFUND` | (varies) | Refund initiated | amountFils, amountAED, reason, stripeRefundId |
| `PAYMENT_CONFIRMED` | SYSTEM | Stripe webhook | stripeSessionId, stripePaymentIntentId |
| `ORDER_STATUS_CHANGED` | SYSTEM | Parent order update | from, to, reason |
| `VENDOR_ORDER_CREATION_FAILED` | SYSTEM | Error during creation | error message |
| `REFUND_FAILED` | SYSTEM | Stripe refund failed | amountFils, stripeError |
| `ORDER_CANCELLED_ALL_VENDORS_SLA` | SYSTEM | All vendors expired | reason |

### Query Events

```typescript
// Get all events for an order
const events = await getOrderEventHistory(orderId);

// Get all events for a vendor order
const events = await getVendorOrderEventHistory(vendorOrderId);

// Example: Get all rejections
const rejections = events.filter(e => e.eventType === 'VENDOR_REJECTED');
```

---

## Refund Processing

### Automatic Refunds

Refunds are initiated automatically when:
1. Vendor rejects order
2. Vendor SLA expires (not accepted in time)

### Refund Amount Calculation

```
refundAmount = sum of (OrderItem.lineTotalFils) for all items in rejected vendor order
```

### Stripe Integration

```typescript
stripe.refunds.create({
  payment_intent: order.stripePaymentIntentId,
  amount: refundAmount,  // In fils (1 AED = 100 fils)
  reason: 'requested_by_customer',
  metadata: {
    orderId,
    vendorOrderId,
    reason: 'Vendor rejected: ...'
  }
})
```

### Partial Refunds

Multiple refunds on the same order are supported:
- Order 1: Customer gets 3 items from 2 vendors
- Vendor A rejects → Refund 50% of order
- Vendor B fulfills → Keep 50% of order
- Order status = `PARTIALLY_FULFILLED`

---

## Cron Job Setup (SLA Enforcement)

### Option A: External Cron (Recommended)

Use a service like:
- AWS EventBridge
- Google Cloud Scheduler
- Vercel Cron Functions

**Example (Vercel)**: `/api/admin/sla/enforce`

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/admin/sla/enforce",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Headers**:
```
x-cron-secret: <CRON_SECRET env var>
```

### Option B: Node.js Cron (In-Process)

```typescript
import cron from 'node-cron';
import { enforceSLA } from '@/lib/fulfillment/sla-enforcement';

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running SLA enforcement...');
  const result = await enforceSLA();
  console.log('SLA enforcement complete:', result);
});
```

---

## Error Handling & Idempotency

### Webhook Idempotency

Stripe may send the same webhook twice. The webhook handler checks:
```typescript
if (order.status === 'PAID' || order.status === 'FULFILLING') {
  return { alreadyProcessed: true };
}
```

### SLA Enforcement Idempotency

Safe to run multiple times:
1. Finds VendorOrders with `status = PENDING_ACCEPTANCE`
2. Only updates those with `acceptBy < now()`
3. Each run is independent

### Refund Idempotency

Stripe prevents double-refunds on the same payment intent. If a refund is attempted twice, Stripe returns an error (caught and logged).

---

## Database Constraints

**Uniqueness Constraints**:
- `VendorOrder[orderId, vendorId]` — Only one vendor order per vendor per order
- `VendorOrderItem[vendorOrderId, orderItemId]` — Each item linked once

**Foreign Keys**:
- VendorOrder → Order (CASCADE delete)
- VendorOrder → Vendor (CASCADE delete)
- VendorOrderItem → VendorOrder (CASCADE delete)
- VendorOrderItem → OrderItem (CASCADE delete)
- OrderEvent → Order (CASCADE delete)
- OrderEvent → VendorOrder (CASCADE delete)

---

## Migration

Run Prisma migration:

```bash
npx prisma migrate dev --name add_multi_vendor_fulfillment
```

This will:
1. Create VendorOrder table
2. Create VendorOrderItem table
3. Create OrderEvent table
4. Add enums: VendorOrderStatus, ActorType
5. Update Order, OrderItem, Vendor models with relationships

---

## Testing Checklist

- [ ] Webhook creates VendorOrders after payment
- [ ] Vendor accepts order within SLA
- [ ] Vendor rejects order → Stripe refund issued
- [ ] SLA enforcement cancels expired orders
- [ ] Partial refunds work correctly
- [ ] Parent Order status updates when all vendors complete
- [ ] Event logging captures all transitions
- [ ] Multiple vendors in same order handled correctly
- [ ] All OrderEvents are auditable
- [ ] Email notifications (not implemented, external system)

---

## Summary: System of Record

✅ **Database**: VendorOrder status is source of truth
✅ **No Email Clicks**: Email is notification only; API endpoints handle state changes
✅ **Audit Trail**: Every change logged to OrderEvent
✅ **SLA Enforcement**: Automatic, time-based, idempotent
✅ **Partial Refunds**: Supported for multi-vendor orders
✅ **Scalable**: Indexes on hot queries (status, acceptBy, vendorId)
✅ **Backward Compatible**: Existing Order/OrderItem models unchanged
