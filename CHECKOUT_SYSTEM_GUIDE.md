# Checkout System Architecture Overview

## System Components

### 1. Database Schema (Prisma PostgreSQL)

#### Core Models

**User**
- `id`: Unique identifier
- `email`: Unique email for authentication
- `passwordHash`: Optional for future OAuth support
- `name`, `image`: Profile info
- `role`: USER or ADMIN
- `defaultLocationId`: User's preferred delivery location
- Relations: orders, carts, addresses, accounts (NextAuth)

**Address** (Saved Delivery Addresses)
- One-to-many relationship with User
- Stores: formatted address, lat/lng coordinates, place ID
- `normalizedHash`: Prevents duplicate address storage
- Unique constraint: `[userId, normalizedHash]`

**Location** (Service Areas)
- Examples: Dubai, Abu Dhabi, Sharjah
- Represents geographic service zones
- Controls product availability per location
- Users select their location at start of shopping

**Product** (Catalog Items)
- Core properties: name, description, category, price (in fils)
- Stock control: `inStock`, `inventoryStatus` (in_stock, low, out)
- Publishing: `active`, `published` (separate controls)
- `isGlobal`: If true, available everywhere; if false, check ProductLocation
- Relations: vendor, variants, orders, carts

**ProductVariant** (SKU/Strength Variants)
- Examples: "Vitamin D 1000 IU", "Vitamin D 5000 IU"
- Separate pricing and stock per variant
- Unique `sku` field

**ProductLocation** (Inventory per Location)
- Junction table: `[productId, locationId]`
- Controls which products are available in which service areas

**Vendor** (Sellers/Brands)
- `name`, `slug`: Vendor identity
- Compliance fields: `verified`, `complianceAccepted`
- Geo enforcement: `baseLat`, `baseLng`, `serviceRadiusKm`, `enforceServiceRadius`
- Ratings and tags

**Cart** & **CartItem** (Shopping Cart)
- One cart per user: `@@unique([userId])`
- Cart status: ACTIVE or ORDERED
- CartItems link products to carts
- `unitPriceFils`: Price captured at time of add-to-cart
- Constraint: `@@unique([cartId, productId, variantId])` - prevents duplicates

**Order** & **OrderItem** (Purchase Records)
- Order status flow: PENDING_PAYMENT → PAID → FULFILLING → FULFILLED
- Order stores: user, shipping address, phone, notes, totals
- Stripe integration fields:
  - `stripeCheckoutSessionId`: Session ID from Stripe
  - `stripePaymentIntentId`: Payment intent after successful payment
- Compliance: `ageConfirmed`, `acceptedTerms`, `acceptedDisclaimer`
- OrderItems are snapshots at time of purchase:
  - `productName`, `productSlug`: Frozen product state
  - `vendorName`: Frozen vendor name
  - `unitPriceFils`, `lineTotalFils`: Actual prices charged
  - `fulfilled`, `fulfilledAt`: Fulfillment tracking per item

---

## Checkout Flow

### Frontend (Client-Side)

**1. Cart Page** (`/cart`)
- Uses Zustand store: `useCartStore`
- Client-side cart state with localStorage persistence
- "Add to Cart" → updates local state
- "Proceed to Checkout" → validates items and auth

**2. Checkout Page** (`/checkout`)
- **Guards:**
  - Redirect if not authenticated → `/login?next=/checkout`
  - Redirect if cart empty → `/cart`
  - Redirect if location not selected → `/?selectLocation=true`
  
- **Form Sections:**
  - Delivery Information (name, phone)
  - Address Selection (saved addresses or enter new)
  - Delivery Notes (optional instructions)
  - Compliance Confirmations (age 21+, terms, disclaimer)

- **New Components:**
  - `CheckoutProgress`: Shows step progress (cart → shipping → payment → confirmation)
  - `CheckoutForm`: Form with validation
  - `CheckoutSummary`: Side panel with order breakdown

**3. Payment Processing**
- Submit form to `POST /api/checkout`
- Redirects to Stripe Checkout hosted page
- User completes payment on Stripe
- Returns to `/checkout/success` or `/checkout/cancel`

**4. Success/Cancel Pages**
- Success: Shows order confirmation with order number
- Cancel: Allows retry or return to cart

---

### Backend (Server-Side)

#### API: `POST /api/checkout`

**Request Validation:**
```
{
  locationId: string (location UUID),
  addressId: string (saved address ID) OR placeId: string (one-time),
  shippingName: string,
  shippingPhone: string,
  shippingAddressLine1: string,
  shippingAddressLine2?: string,
  shippingNotes?: string,
  ageConfirmed: boolean,
  acceptedTerms: boolean,
  acceptedDisclaimer: boolean
}
```

**Execution Steps:**

1. **Authentication Check**
   - Verify NextAuth session
   - Fetch user from database

2. **Validation**
   - Verify all required fields present
   - Check compliance flags (age, terms, disclaimer)

3. **Address Resolution**
   - If `addressId` provided: Verify user owns the saved address
   - If `placeId` provided: Call `/api/geo/resolve-place` to get coordinates
   - Extract delivery coordinates: `lat`, `lng`

4. **Geofencing Check**
   - Get cart with products
   - For each product, verify delivery address is within vendor's service radius
   - Query: `assertAddressInVendorRadius(lat, lng)` (Haversine distance)

5. **Cart & Inventory Validation**
   - Check cart is not empty
   - For each item:
     - Verify product exists and is active
     - If product has variants, ensure variant is selected
     - Check variant is in stock and active

6. **Create Order in Database**
   - Insert `Order` with status = `PENDING_PAYMENT`
   - Copy cart items to `OrderItem` (snapshot values)
   - Clear user's cart (set status to ORDERED)

7. **Create Stripe Checkout Session**
   - Build line items from cart
   - Set currency: AED
   - Include success/cancel URLs
   - Store `stripeCheckoutSessionId` on order

8. **Response**
   - Return `{ url: "https://checkout.stripe.com/..." }`
   - Frontend redirects user to Stripe

---

#### Stripe Webhook: `POST /api/stripe/webhook`

**Events Handled:**

1. **`checkout.session.completed`** (Payment Successful)
   - Received when Stripe checkout is completed
   - Find order by `stripeCheckoutSessionId`
   - Update order status: `PENDING_PAYMENT` → `PAID`
   - Store `stripePaymentIntentId`
   - Idempotency: Check if already PAID before updating

2. **`payment_intent.payment_failed`**
   - Logs payment failure
   - Keeps order in `PENDING_PAYMENT` status (allows retry)

3. **`charge.refunded`**
   - Updates order status to `REFUNDED`
   - Triggered by manual refunds or failed/disputed charges

---

## Cart System (`lib/cart.ts`)

**Server-Side Cart Functions:**

```typescript
// Get or create user's cart
getOrCreateCart(userId: string): Promise<Cart>

// Add item to cart (creates or updates quantity)
addToCart(userId: string, productId: string, quantity: number, variantId?: string)

// Update item quantity (delete if qty=0)
updateCartItemQuantity(cartItemId: string, quantity: number)

// Remove item from cart
removeFromCart(cartItemId: string)

// Get cart with product details and totals
getCartWithProducts(userId: string): Promise<CartWithTotals>
```

**Cart Calculation Logic:**
- Fetches all items with product details
- Calculates subtotal in fils (1 AED = 100 fils)
- Can add delivery fees, taxes, discounts
- Returns `{ items, subtotalFils, totalFils }`

---

## Key Design Decisions

### 1. **Dual Cart System**
- **Client-side** (Zustand + localStorage): For UX speed
- **Server-side** (Prisma database): For persistence and checkout

### 2. **Price in Fils**
- All prices stored in integer fils (no decimals)
- 1 AED = 100 fils
- Prevents floating-point errors

### 3. **Snapshot Fields in OrderItem**
- Preserves product state at time of purchase
- If product name/price changes, order keeps original values
- Historical accuracy for accounting

### 4. **Address Deduplication**
- `normalizedHash` prevents storing same address multiple times
- Saves storage, improves data quality

### 5. **Geofencing Enforcement**
- Vendor can set service radius (default 25km)
- Every order validates delivery address is within radius
- Prevents out-of-service deliveries

### 6. **Status Flow**
```
Order: PENDING_PAYMENT → PAID → FULFILLING → FULFILLED
       ↓                  ↓
    CANCELLED          REFUNDED
```

---

## Data Flow Diagram

```
USER SELECTS LOCATION
    ↓
BROWSE PRODUCTS (ProductLocation filters by location)
    ↓
ADD TO CART (CartItem created in DB)
    ↓
CHECKOUT PAGE
    ├─ Load saved addresses (/api/account/addresses)
    ├─ User fills shipping form
    └─ Submit POST /api/checkout
         ├─ Validate address within vendor radius
         ├─ Create Order (PENDING_PAYMENT)
         ├─ Create OrderItems (from cart items)
         ├─ Clear cart
         └─ Create Stripe session → redirect to Stripe
                ↓
USER COMPLETES PAYMENT ON STRIPE
                ↓
STRIPE WEBHOOK POST /api/stripe/webhook
    └─ checkout.session.completed event
         ├─ Find Order by stripeCheckoutSessionId
         └─ Update Order status: PAID
                ↓
REDIRECT TO /checkout/success
    ├─ Show order number
    ├─ Display order status timeline
    └─ Link to order tracking (/orders/[orderId])
```

---

## Environment Variables Needed

```
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=https://...
NEXTAUTH_SECRET=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## Files Structure

```
app/
├── checkout/
│   ├── page.tsx (main checkout form)
│   ├── success/page.tsx (payment success)
│   └── cancel/page.tsx (payment cancelled)
├── orders/
│   ├── page.tsx (order list)
│   └── [orderId]/page.tsx (order details with tracking)
├── cart/
│   └── page.tsx (shopping cart)
└── api/
    ├── checkout/route.ts (create Stripe session)
    ├── stripe/webhook/route.ts (payment webhook)
    └── account/addresses (saved addresses API)

components/
└── checkout/
    ├── CheckoutForm.tsx (form with validation)
    ├── CheckoutSummary.tsx (price breakdown)
    └── CheckoutProgress.tsx (step indicator)

lib/
├── cart.ts (cart operations)
└── store/
    └── cart-store.ts (Zustand client store)

prisma/
└── schema.prisma (database schema)
```

---

## Security & Compliance

✅ **Authentication:** NextAuth with session validation
✅ **Payment:** Stripe handles card data (PCI-DSS compliant)
✅ **Compliance Checks:** Age confirmation, terms acceptance, disclaimer
✅ **Idempotency:** Webhook handlers check for duplicate processing
✅ **Geofencing:** Validates delivery within service area
✅ **Address Validation:** Uses Google Places API for accuracy
✅ **HTTPS:** All payments over secure connection
