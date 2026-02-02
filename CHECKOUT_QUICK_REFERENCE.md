# Quick Reference: Database Models & Relationships

## Entity Relationship Diagram (Simplified)

```
┌─────────────┐
│    USER     │
├─────────────┤
│ id (PK)     │
│ email       │ ──┐
│ name        │   │
│ role        │   │
└─────────────┘   │
    │             │
    │ 1:N         │
    ├──→ ORDER    │
    ├──→ CART     │
    └──→ ADDRESS  │
                  │
            ┌─────┴──────────────┐
            │                    │
        ┌─────────────┐    ┌──────────────┐
        │   ORDER     │    │ CART         │
        ├─────────────┤    ├──────────────┤
        │ id          │    │ id           │
        │ userId(FK)  │    │ userId(FK)   │
        │ status      │    │ status       │
        │ totalFils   │    │ locationId   │
        │ stripe*     │    └──────────────┘
        └─────────────┘         │
            │                   │ 1:N
            │ 1:N               │
            │                   ├──→ CART_ITEM
        ┌───┴──────────┐        └──→ (productId, variantId)
        │              │
    ┌────────────┐ ┌──────────────┐
    │ ORDER_ITEM │ │  PRODUCT     │
    ├────────────┤ ├──────────────┤
    │ orderId(FK)│ │ id           │
    │ productId  │ │ vendorId(FK) │
    │ vendorId   │ │ name         │
    │ variantId  │ │ priceFils    │
    │ qty        │ │ inStock      │
    │ snapshot*  │ └──────────────┘
    └────────────┘      │
                        │ 1:N
                        │
                    ┌──────────────┐
                    │ VENDOR       │
                    ├──────────────┤
                    │ id           │
                    │ name         │
                    │ verified     │
                    │ radiusKm     │
                    └──────────────┘

* snapshot = frozen product/vendor state at purchase time
* stripe = stripeCheckoutSessionId, stripePaymentIntentId
```

---

## Database Schema: Key Tables

### ORDER
| Column | Type | Notes |
|--------|------|-------|
| id | String (PK) | Auto-generated CUID |
| userId | String (FK) | Owner of order |
| status | String | PENDING_PAYMENT, PAID, FULFILLING, FULFILLED, CANCELLED, REFUNDED |
| subtotalFils | Int | Total before delivery/tax |
| deliveryFils | Int | Delivery fee |
| totalFils | Int | Final total |
| stripeCheckoutSessionId | String (UNIQUE) | Links to Stripe session |
| stripePaymentIntentId | String | Links to Stripe payment |
| shippingName | String | Recipient name |
| shippingPhone | String | Recipient phone (UAE format) |
| shippingAddressLine1 | String | Main address |
| shippingAddressLine2 | String (nullable) | Apt/floor/building |
| shippingNotes | String (nullable) | Delivery instructions |
| ageConfirmed | Boolean | Must be true |
| acceptedTerms | Boolean | Must be true |
| acceptedDisclaimer | Boolean | Must be true |
| createdAt | DateTime | Timestamp |
| updatedAt | DateTime | Auto-updated |

### ORDER_ITEM
| Column | Type | Notes |
|--------|------|-------|
| id | String (PK) | Auto-generated |
| orderId | String (FK) | Parent order |
| productId | String (FK) | Product reference |
| vendorId | String (FK) | Vendor reference |
| variantId | String (FK, nullable) | Specific variant if exists |
| quantity | Int | Qty ordered |
| unitPriceFils | Int | Price per unit at time of order |
| lineTotalFils | Int | qty × unitPrice |
| **SNAPSHOT FIELDS** | | Frozen at purchase time |
| productName | String | Product.name snapshot |
| productSlug | String | Product.slug snapshot |
| vendorName | String | Vendor.name snapshot |
| variantSku | String | Variant SKU snapshot |
| variantStrength | String | Variant strength snapshot |
| fulfilled | Boolean | Item completion status |
| fulfilledAt | DateTime | When item was fulfilled |

### CART
| Column | Type | Notes |
|--------|------|-------|
| id | String (PK) | Auto-generated |
| userId | String (UNIQUE FK) | Only 1 cart per user |
| locationId | String (FK, nullable) | Delivery location |
| status | String | ACTIVE or ORDERED (ORDERED after checkout) |
| createdAt | DateTime | When cart created |
| updatedAt | DateTime | When last modified |

### CART_ITEM
| Column | Type | Notes |
|--------|------|-------|
| id | String (PK) | Auto-generated |
| cartId | String (FK) | Parent cart |
| productId | String (FK) | Product in cart |
| variantId | String (FK, nullable) | Selected variant |
| quantity | Int | How many |
| unitPriceFils | Int | Price when added |
| **UNIQUE** | | [cartId, productId, variantId] - prevents duplicates |
| createdAt | DateTime | When added |
| updatedAt | DateTime | When quantity changed |

### PRODUCT
| Column | Type | Notes |
|--------|------|-------|
| id | String (PK) | Auto-generated |
| vendorId | String (FK) | Product owner |
| name | String | Product name |
| slug | String (UNIQUE) | URL-friendly name |
| description | String (nullable) | Product details |
| category | String | Product category |
| priceFils | Int | Price in fils |
| imageUrl | String (nullable) | Product image |
| inStock | Boolean | Stock status |
| inventoryStatus | String | in_stock, low, out |
| active | Boolean | Is product live |
| published | Boolean | Editorial control |
| isGlobal | Boolean | If true: available everywhere |
| tags | String[] | Search tags |

### PRODUCT_VARIANT
| Column | Type | Notes |
|--------|------|-------|
| id | String (PK) | Auto-generated |
| productId | String (FK) | Parent product |
| sku | String (UNIQUE) | Unique code |
| strength | String | Variant type (e.g., "1000 IU") |
| unitSize | String (nullable) | Size variant |
| priceFils | Int | Variant price |
| inStock | Boolean | Stock status |
| active | Boolean | Is available |

### VENDOR
| Column | Type | Notes |
|--------|------|-------|
| id | String (PK) | Auto-generated |
| name | String | Vendor/brand name |
| slug | String (UNIQUE) | URL-friendly |
| verified | Boolean | Compliance verified |
| baseLat, baseLng | Float | Vendor location |
| serviceRadiusKm | Int | Delivery range (default 25km) |
| enforceServiceRadius | Boolean | Check radius on checkout |
| rating | Float | Star rating |

### ADDRESS
| Column | Type | Notes |
|--------|------|-------|
| id | String (PK) | Auto-generated |
| userId | String (FK) | Owner |
| label | String | "Home", "Work", etc. |
| formattedAddress | String | Full address text |
| placeId | String | Google Places ID |
| lat, lng | Float | Coordinates |
| normalizedHash | String (UNIQUE per user) | Deduplication |

---

## Checkout Flow: Step-by-Step

### 1️⃣ User Adds to Cart
```
User clicks "Add to Cart" on product page
→ Frontend: useCartStore.addItem(productId, quantity, variantId?)
→ Server: POST /api/cart/route.ts
→ DB: INSERT INTO CartItem ... OR UPDATE quantity
→ Frontend: Show toast "Added to cart"
```

### 2️⃣ User Navigates to Checkout
```
Click "Checkout" button in cart page
→ Check: sessionStatus === "authenticated"? → else redirect to login
→ Check: items.length > 0? → else redirect to /cart
→ Check: locationId selected? → else redirect to home
→ Fetch saved addresses: GET /api/account/addresses
→ Display CheckoutForm component
```

### 3️⃣ User Fills Checkout Form
```
Form Fields:
├─ Full Name (required, 2+ chars)
├─ Phone (required, UAE format regex)
├─ Address Selection
│  ├─ Use Saved Address (select from dropdown)
│  └─ Enter New Address (line1, line2 optional)
├─ Delivery Notes (optional, max 500 chars)
└─ Confirmations
   ├─ Age 21+ (required checkbox)
   ├─ Terms & Conditions (required checkbox)
   └─ Product Disclaimer (required checkbox)
```

### 4️⃣ Form Validation
```javascript
// Client-side validation:
validateForm() {
  - Name: required, 2+ chars
  - Phone: required, UAE format (/^(?:\+971|0)(?:50|51|52|54|55|56|2|3|4|6|7|9)\d{7}$/)
  - Address: if newAddress, line1 required
  - Checkboxes: all must be true
}
```

### 5️⃣ Submit to `/api/checkout`
```typescript
POST /api/checkout {
  locationId: "loc_abc123",
  addressId: "addr_xyz789",  // OR placeId for one-time address
  shippingName: "Ahmed Al-Mansouri",
  shippingPhone: "+971 50 123 4567",
  shippingAddressLine1: "123 Main St, Dubai",
  shippingAddressLine2: "Apt 4B",
  shippingNotes: "Ring buzzer twice",
  ageConfirmed: true,
  acceptedTerms: true,
  acceptedDisclaimer: true
}
```

### 6️⃣ Server-Side Processing
```
Step A: Authentication
  └─ Get session from NextAuth
  └─ Query User by email

Step B: Resolve Address
  ├─ If addressId: Fetch Address, verify user owns it, extract lat/lng
  └─ If placeId: Call /api/geo/resolve-place, get lat/lng

Step C: Geofencing
  ├─ For each cart item:
  │  └─ Get product → vendor
  │  └─ Call assertAddressInVendorRadius(lat, lng, vendor)
  │  └─ Check: distance <= vendor.serviceRadiusKm
  └─ If any out of radius: return 400 error

Step D: Validate Cart
  ├─ Check cart not empty
  ├─ For each item:
  │  ├─ Product exists and active?
  │  ├─ If has variants, variantId provided?
  │  ├─ Variant in stock?
  │  └─ Variant active?
  └─ All valid? Continue

Step E: Create Order
  ├─ INSERT Order {
  │    userId, status: "PENDING_PAYMENT", totalFils, ...shipping
  │  }
  ├─ For each CartItem:
  │    INSERT OrderItem {
  │      orderId, productId, vendorId, variantId,
  │      quantity, unitPriceFils, lineTotalFils,
  │      [SNAPSHOTS: productName, vendorName, etc]
  │    }
  └─ UPDATE Cart { status: "ORDERED" }

Step F: Create Stripe Session
  ├─ Build line items from cart items
  ├─ Set currency: "aed"
  ├─ Set success URL: /checkout/success?session_id={CHECKOUT_SESSION_ID}
  ├─ Set cancel URL: /checkout/cancel
  ├─ Call stripe.checkout.sessions.create({...})
  ├─ UPDATE Order { stripeCheckoutSessionId: session.id }
  └─ RETURN { url: "https://checkout.stripe.com/..." }

Step G: Frontend Redirects
  └─ window.location.href = data.url
  └─ User redirected to Stripe hosted checkout page
```

### 7️⃣ User Completes Payment on Stripe
```
User enters card details on Stripe's secure page
→ Stripe processes payment
→ If successful: Stripe sends webhook
→ If cancelled: Redirects to /checkout/cancel
```

### 8️⃣ Stripe Webhook: `checkout.session.completed`
```
Event: checkout.session.completed
  ├─ POST /api/stripe/webhook
  ├─ Verify signature with STRIPE_WEBHOOK_SECRET
  ├─ Query Order by stripeCheckoutSessionId
  ├─ Check if already PAID (idempotency)
  ├─ UPDATE Order {
  │    status: "PAID",
  │    stripePaymentIntentId: session.payment_intent
  │  }
  └─ Log: "Order marked as PAID"
```

### 9️⃣ User Redirected to Success Page
```
Stripe redirects to /checkout/success?session_id={SESSION_ID}
  ├─ Page displays: ✅ Order Confirmed!
  ├─ Shows: Order number, status timeline
  ├─ Offers: View Orders, Continue Shopping
  └─ Can be bookmarked/reopened anytime
```

### 🔟 Order Fulfillment
```
Admin or fulfillment system:
  ├─ View pending orders in admin panel
  ├─ Update order status: PAID → FULFILLING
  ├─ Process items for delivery
  ├─ Mark items as FULFILLED (OrderItem.fulfilled = true)
  └─ Update order status: FULFILLING → FULFILLED

User tracking:
  └─ Visits /orders
  └─ Clicks order to view [/orders/{orderId}]
  └─ Sees timeline: PENDING_PAYMENT ✓ → PAID ✓ → FULFILLING → FULFILLED
```

---

## Key Constraints & Validations

### Database Constraints
- `User.email` → UNIQUE (no duplicate accounts)
- `Cart.userId` → UNIQUE (only 1 cart per user)
- `CartItem.[cartId, productId, variantId]` → UNIQUE (no duplicate line items)
- `Address.[userId, normalizedHash]` → UNIQUE (no duplicate addresses per user)
- `Product.slug` → UNIQUE (no duplicate slugs)
- `ProductVariant.sku` → UNIQUE (no duplicate SKUs)
- `Vendor.slug` → UNIQUE (no duplicate vendor slugs)
- `Order.stripeCheckoutSessionId` → UNIQUE (each Stripe session = 1 order)

### Validation Checks
- ✅ User authenticated (NextAuth session)
- ✅ Cart not empty
- ✅ Location selected
- ✅ All products active and in stock
- ✅ Variants selected if product has variants
- ✅ Address within vendor service radius
- ✅ Age 21+ confirmed
- ✅ Terms accepted
- ✅ Disclaimer accepted
- ✅ Phone format valid (UAE)
- ✅ Shipping name 2+ characters

---

## Pricing & Currency

- **Currency:** AED (United Arab Emirates Dirham)
- **Storage:** All prices in **fils** (1 AED = 100 fils)
- **Reason:** Integer storage prevents floating-point errors
- **Display:** Convert to AED for UI using `formatPriceAED(fils)` utility

**Examples:**
```
Product price in DB: 5000 fils
Display to user: "50 AED"

Order total: 247500 fils
Display: "2,475 AED"
```

---

## Status Progression

### Order Status Machine
```
PENDING_PAYMENT
  ├─ Awaiting Stripe webhook
  ├─ No timeout (user can retry anytime)
  └─ Webhook updates to PAID

PAID
  ├─ Payment received
  ├─ Admin can now fulfill
  └─ Can transition to FULFILLING

FULFILLING
  ├─ Being prepared for delivery
  └─ Can transition to FULFILLED

FULFILLED
  ├─ Delivered to customer
  └─ Order complete

CANCELLED (terminal state)
  ├─ User or admin cancelled
  └─ Cannot transition

REFUNDED (terminal state)
  ├─ Money returned to card
  └─ Cannot transition
```

### OrderItem.fulfilled
- Tracks which items have been delivered
- Each OrderItem can be marked fulfilled independently
- Allows partial fulfillments for split orders

---

## Important Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema definition |
| `lib/cart.ts` | Server-side cart operations |
| `lib/store/cart-store.ts` | Client-side Zustand cart state |
| `app/checkout/page.tsx` | Main checkout form page |
| `app/api/checkout/route.ts` | Create Stripe session API |
| `app/api/stripe/webhook/route.ts` | Payment confirmation webhook |
| `components/checkout/CheckoutForm.tsx` | Form component with validation |
| `components/checkout/CheckoutSummary.tsx` | Order summary side panel |
| `app/orders/page.tsx` | Order list view |
| `app/orders/[orderId]/page.tsx` | Order details with tracking |
