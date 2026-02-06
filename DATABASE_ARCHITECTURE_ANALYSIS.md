# DATABASE ARCHITECTURE ANALYSIS
## InstaHealth Marketplace - Current State & Readiness for Real Vendors/Products

**Date:** 6 February 2026  
**Status:** READ-ONLY ANALYSIS (No code changes made)  
**Analyst:** Backend Architecture Review

---

## EXECUTIVE SUMMARY

**The system is ARCHITECTURALLY READY for real vendors and products.**

The schema is well-designed for a multi-vendor marketplace with proper:
- Vendor isolation (vendorId tracked at CartItem, OrderItem, and VendorOrder level)
- Price snapshots (prices stored at order time, not linked to live product data)
- Fulfillment separation (VendorOrders created per vendor per order)
- Role-based access (User, Vendor, Admin roles defined)

**However, there are DATA QUALITY and OPERATIONAL CONCERNS:**
1. Stripe is tightly coupled to order creation (required for payments)
2. Some nullable fields that shouldn't be (vendorId in CartItem should never be null)
3. VendorApplication workflow exists but Vendor manual entry also possible (dual path)
4. No audit trail on price changes
5. No real vendor setup beyond schema definitions

---

## SECTION 1: SCHEMA INSPECTION

### Complete Model Inventory

#### **User Model** (Account Holder)
```
User {
  id: String (PK)                    // CUID
  email: String (UNIQUE)             // Primary identifier
  passwordHash: String? (nullable)   // Optional, for future OAuth
  name: String?
  phone: String?                     // E.164 format
  countryCode: String?               // e.g. "+971"
  image: String?                     // NextAuth required
  emailVerified: DateTime?           // NextAuth required
  role: Role (enum)                  // USER | VENDOR | ADMIN
  defaultLocationId: String?         // FK to Location
  defaultLocation: Location?         // Relation
  heightCm: Int?
  weightKg: Int?
  consentShareBodyMetrics: Boolean   // Preference
  marketingPushOptIn: Boolean        // Preference
  marketingEmailOptIn: Boolean       // Preference
  createdAt: DateTime
  updatedAt: DateTime
  
  Relations:
  - orders: Order[] (1:M)
  - carts: Cart[] (1:M)
  - accounts: Account[] (1:M)        // NextAuth adapter
  - sessions: Session[] (1:M)        // NextAuth adapter
  - addresses: Address[] (1:M)
  - defaultLocation: Location? (M:1)
}

Constraints:
  @@index([email])                   // Email lookup
  @@index([role])                    // Role filtering
  @@index([defaultLocationId])       // Location preference
```

**Ownership:** User (self)  
**Real-Life:** Customer account  
**Facing:** User-facing, Vendor-facing (if role=VENDOR), Admin-facing

---

#### **Vendor Model** (Marketplace Partner)
```
Vendor {
  id: String (PK)                    // CUID
  name: String (required)            // e.g. "ArabiaPharm"
  slug: String (UNIQUE)              // URL-friendly: arabia-pharm
  email: String? (UNIQUE)            // Vendor contact
  userId: String? (UNIQUE)           // FK to User (portal access)
  status: String                     // "active" (default)
  verified: Boolean                  // Compliance verification status
  legalEntityName: String?           // Trading legal name
  country: String?
  licenseNumber: String?
  complianceAccepted: Boolean        // Terms acceptance flag
  complianceAcceptedAt: DateTime?
  logoUrl: String?
  tagline: String?
  rating: Float?
  ratingCount: Int?
  isHouseBrand: Boolean              // Platform-owned vendor
  
  Geo/Service:
  basePlaceId: String?               // Google Place ID
  baseAddressFormatted: String?
  baseLat: Float?
  baseLng: Float?
  serviceRadiusKm: Int               // Default 25km
  enforceServiceRadius: Boolean      // Delivery restriction
  allowOutOfRadiusOverride: Boolean  // Exception handling
  
  createdAt: DateTime
  updatedAt: DateTime
  
  Relations:
  - approvedApplications: VendorApplication[] (1:M)
  - products: Product[] (1:M)
  - orderItems: OrderItem[] (1:M)
  - vendorOrders: VendorOrder[] (1:M)
  - vendorPayouts: VendorPayout[] (1:M)
  - cartItems: CartItem[] (1:M)
}

Constraints:
  @@index([slug])                    // URL lookup
  @@index([userId])                  // User association
  @@index([status])                  // Status filtering
  @@index([verified])                // Compliance filtering
```

**Ownership:** System (managed by Admin or via VendorApplication)  
**Real-Life:** Company/brand selling products  
**Facing:** Vendor-facing (dashboard), Admin-facing, Customer-facing (in product lists)

---

#### **Product Model** (Catalog Item)
```
Product {
  id: String (PK)                    // CUID
  vendorId: String (FK, required)    // Who owns this product
  vendor: Vendor                     // Relation
  
  name: String (required)            // "IV Drip - Vitamin C"
  slug: String (UNIQUE)              // iv-drip-vitamin-c
  description: String?               // Long-form
  category: String                   // "IV Drips", "Supplements"
  priceFils: Int                     // Base price in fils (100 fils = 1 AED)
  imageUrl: String?
  
  inStock: Boolean                   // Legacy (use inventoryStatus)
  inventoryStatus: String            // "in_stock" | "low" | "out"
  active: Boolean                    // Can be purchased
  published: Boolean                 // Editorial control (different from active)
  isGlobal: Boolean                  // Available in all locations (or check ProductLocation)
  tags: String[]                     // Search/filter tags
  
  createdAt: DateTime
  updatedAt: DateTime
  
  Relations:
  - vendor: Vendor (M:1)
  - locations: ProductLocation[] (1:M)
  - orderItems: OrderItem[] (1:M)
  - variants: ProductVariant[] (1:M)
  - cartItems: CartItem[] (1:M)
}

Constraints:
  @@unique([slug])                   // Product URL
  @@index([vendorId])                // Vendor products
  @@index([active])                  // Active products
  @@index([published])               // Published products
  @@index([isGlobal])                // Global availability
  @@index([category])                // Category filtering
```

**Ownership:** Vendor (vendorId required)  
**Real-Life:** Product listing (IV drip, supplement, test kit)  
**Facing:** Customer-facing, Vendor-facing (inventory), Admin-facing

---

#### **ProductVariant Model** (SKU/Option)
```
ProductVariant {
  id: String (PK)                    // CUID
  productId: String (FK, required)
  product: Product                   // Relation
  
  sku: String (UNIQUE)               // "IV-VIT-C-100ML"
  strength: String (required)        // "100ml", "Vitamin C 500mg"
  unitSize: String?                  // "100ml", "500 tablets"
  priceFils: Int                     // Can override product.priceFils
  
  inStock: Boolean                   // Inventory status
  active: Boolean                    // Can be purchased
  
  createdAt: DateTime
  updatedAt: DateTime
  
  Relations:
  - product: Product (M:1)
  - orderItems: OrderItem[] (1:M)
  - cartItems: CartItem[] (1:M)
}

Constraints:
  @@unique([sku])                    // SKU unique
  @@index([productId])               // Product variants
```

**Ownership:** Vendor (through Product.vendorId)  
**Real-Life:** Product option (different strength, size, etc.)  
**Facing:** Customer-facing (on product page), Vendor-facing (inventory)

---

#### **Cart Model** (Shopping Session)
```
Cart {
  id: String (PK)                    // CUID
  userId: String? (UNIQUE)           // Nullable for potential guest carts
  user: User?                        // Relation
  locationId: String?                // User's selected location
  location: Location?
  status: String                     // "ACTIVE" | "ORDERED"
  createdAt: DateTime
  updatedAt: DateTime
  
  Relations:
  - items: CartItem[] (1:M)
  - user: User? (M:1)
  - location: Location? (M:1)
}

Constraints:
  @@unique([userId])                 // ONE cart per user
  @@index([userId])
  @@index([status])
```

**Ownership:** User (userId required in practice)  
**Real-Life:** Shopping basket  
**Facing:** Customer-facing, User-facing, System (session management)

---

#### **CartItem Model** (Item in Cart)
```
CartItem {
  id: String (PK)                    // CUID
  cartId: String (FK, required)      // Which cart
  productId: String (FK, required)   // Which product
  vendorId: String (FK, required)    // CRITICAL: Vendor ownership
  variantId: String? (FK)            // Optional variant
  
  quantity: Int                      // How many
  unitPriceFils: Int                 // Price snapshot at add time
  
  createdAt: DateTime
  updatedAt: DateTime
  
  Relations:
  - cart: Cart (M:1)
  - product: Product (M:1)
  - vendor: Vendor (M:1)
  - variant: ProductVariant? (M:1)
}

Constraints:
  @@unique([cartId, productId, variantId])  // No duplicates in one cart
  @@index([cartId])
  @@index([productId])
  @@index([vendorId])
```

**Ownership:** Vendor → Product → CartItem (vendorId required)  
**Real-Life:** Individual item in shopping basket  
**Facing:** Customer-facing, System

---

#### **Order Model** (Customer Purchase)
```
Order {
  id: String (PK)                    // CUID
  userId: String? (FK)               // Nullable (potential guest checkout)
  user: User?
  addressId: String? (FK)            // Delivery address
  address: Address?
  locationId: String?                // Order location
  
  status: String                     // "PENDING_PAYMENT" → "PAID" → "FULFILLING" → "FULFILLED"
  
  Financial:
  subtotalFils: Int                  // Items total (without delivery)
  deliveryFils: Int                  // Shipping cost (default 0)
  totalFils: Int                     // Total to pay
  currency: String                   // "AED" (default)
  
  Stripe:
  stripeCheckoutSessionId: String? (UNIQUE)  // Stripe session ID
  stripePaymentIntentId: String?    // Stripe payment intent ID
  
  Compliance/Shipping:
  acceptedTerms: Boolean
  acceptedDisclaimer: Boolean
  ageConfirmed: Boolean
  shippingName: String?
  shippingPhone: String?
  shippingAddressLine1: String?
  shippingAddressLine2: String?
  shippingArea: String?
  shippingEmirate: String?
  shippingNotes: String?
  
  createdAt: DateTime
  updatedAt: DateTime
  
  Relations:
  - items: OrderItem[] (1:M)         // Line items
  - vendorOrders: VendorOrder[] (1:M)  // Per-vendor orders
  - events: OrderEvent[] (1:M)       // Audit trail
  - refunds: Refund[] (1:M)          // Refund records
  - user: User? (M:1)
  - address: Address? (M:1)
}

Constraints:
  @@unique([stripeCheckoutSessionId])
  @@index([userId])
  @@index([addressId])
  @@index([status])
  @@index([createdAt])
```

**Ownership:** User (userId) + System (status transitions)  
**Real-Life:** Confirmed purchase / transaction  
**Facing:** Customer-facing, Vendor-facing (their VendorOrders), Admin-facing

---

#### **OrderItem Model** (Line Item in Order)
```
OrderItem {
  id: String (PK)                    // CUID
  orderId: String (FK, required)
  productId: String (FK, required)
  vendorId: String (FK, required)    // CRITICAL: Vendor tracking
  variantId: String? (FK)
  
  Quantity & Pricing (SNAPSHOTS at order time):
  quantity: Int
  unitPriceFils: Int                 // Price when ordered
  lineTotalFils: Int                 // quantity × unitPriceFils
  
  Product Snapshot (immutable):
  productName: String                // "IV Drip - Vitamin C"
  productSlug: String?               // "iv-drip-vitamin-c"
  vendorName: String                 // "ArabiaPharm"
  variantSku: String?
  variantStrength: String?
  variantUnitSize: String?
  variantPriceFils: Int?
  
  Fulfillment:
  fulfilled: Boolean                 // Vendor confirmed delivery
  fulfilledAt: DateTime?
  
  Relations:
  - order: Order (M:1)
  - product: Product (M:1)           // Link to current product (may have changed)
  - vendor: Vendor (M:1)             // Link to vendor
  - variant: ProductVariant? (M:1)
  - vendorOrderItems: VendorOrderItem[] (1:M)  // Links to VendorOrder
}

Constraints:
  @@index([orderId])
  @@index([productId])
  @@index([vendorId])
  @@index([vendorId, fulfilled])     // Vendor's unfulfilled items
```

**Ownership:** Vendor (through OrderItem.vendorId)  
**Real-Life:** One line item of an order  
**Facing:** Vendor-facing (fulfillment), Customer-facing (order history), Admin-facing

---

#### **VendorOrder Model** (Multi-Vendor Fulfillment)
```
VendorOrder {
  id: String (PK)                    // CUID
  orderId: String (FK, required)
  vendorId: String (FK, required)
  
  Status State Machine:
  status: VendorOrderStatus          // NEW → READY_FOR_FULFILLMENT → ACCEPTED → IN_PROGRESS → COMPLETED
                                     // OR → REJECTED → CANCELLED → FAILED
  
  Financial:
  subtotalFils: Int                  // Vendor's portion
  totalFils: Int                     // Usually = subtotalFils
  
  SLA/Lifecycle:
  acceptBy: DateTime                 // Deadline to accept (15 min)
  acceptedAt: DateTime?
  rejectedAt: DateTime?
  fulfilledAt: DateTime?
  cancelledAt: DateTime?
  
  Communication:
  notesToVendor: String?             // "Please accept or reject within 15 min"
  notesInternal: String?             // Admin notes
  terminalReason: String?            // Why did it end
  resolutionNotes: String?           // Context on resolution
  
  createdAt: DateTime
  updatedAt: DateTime
  
  Relations:
  - order: Order (M:1)
  - vendor: Vendor (M:1)
  - items: VendorOrderItem[] (1:M)   // OrderItems assigned to this vendor
  - events: OrderEvent[] (1:M)       // State transition audit
  - refund: Refund? (1:1)            // If refunded
}

Constraints:
  @@unique([orderId, vendorId])      // One VendorOrder per vendor per order
  @@index([vendorId])
  @@index([status])
  @@index([acceptBy])
```

**Ownership:** System (created at payment), managed by Vendor (accept/reject)  
**Real-Life:** Vendor's portion of a customer's order requiring fulfillment  
**Facing:** Vendor-facing (primary dashboard), Admin-facing, System-facing

---

#### **VendorOrderItem Model** (Junction)
```
VendorOrderItem {
  id: String (PK)                    // CUID
  vendorOrderId: String (FK, required)
  orderItemId: String (FK, required)
  
  Relations:
  - vendorOrder: VendorOrder (M:1)
  - orderItem: OrderItem (M:1)
}

Constraints:
  @@unique([vendorOrderId, orderItemId])
  @@index([vendorOrderId])
  @@index([orderItemId])
```

**Ownership:** System (created at order creation)  
**Real-Life:** Link between OrderItem and which vendor's fulfillment responsibility  
**Facing:** System internal

---

#### **Address Model** (Delivery Location)
```
Address {
  id: String (PK)                    // CUID
  userId: String (FK, required)
  user: User
  
  label: String                      // "Home", "Work", "Emirates Clinic"
  phone: String?                     // Optional delivery contact
  
  Location Data:
  line1: String                      // Apartment/villa + building
  line2: String?
  area: String?                      // Neighborhood
  city: String?
  emirate: String?                   // UAE emirate (Dxb, Abu Dhabi, etc.)
  country: String                    // "United Arab Emirates" (default)
  instructions: String?              // "Ring apartment 5B buzzer"
  postalCode: String?
  
  Geo:
  lat: Float                         // Latitude
  lng: Float                         // Longitude
  placeId: String                    // Google Places ID
  formattedAddress: String           // Full formatted from Google
  
  Status:
  isDefault: Boolean                 // Primary address
  
  createdAt: DateTime
  updatedAt: DateTime
  normalizedHash: String             // MD5 of "lat,lng" for dedup
  
  Relations:
  - user: User (M:1)
  - orders: Order[] (1:M)
}

Constraints:
  @@unique([userId, normalizedHash])  // No duplicate addresses per user
  @@index([userId])
  @@index([userId, isDefault])
```

**Ownership:** User (self-managed)  
**Real-Life:** Home/work/business address for delivery  
**Facing:** User-facing, Checkout flow

---

#### **Location Model** (Marketplace Region/Zone)
```
Location {
  id: String (PK)                    // CUID
  name: String (UNIQUE)              // "Dubai", "Abu Dhabi", "Sharjah"
  slug: String (UNIQUE)              // "dubai", "abu-dhabi"
  isActive: Boolean                  // Marketplace enabled in this location
  createdAt: DateTime
  updatedAt: DateTime
  
  Relations:
  - products: ProductLocation[] (1:M)  // Products available here
  - users: User[] (1:M)              // Users' default location
  - carts: Cart[] (1:M)              // Carts in this location
}

Constraints:
  @@unique([name])
  @@unique([slug])
  @@index([isActive])
```

**Ownership:** System (Admin configures)  
**Real-Life:** Geographic service region  
**Facing:** Admin, Operational (product availability rules)

---

#### **ProductLocation Model** (Availability Map)
```
ProductLocation {
  productId: String (PK part 1)
  locationId: String (PK part 2)
  
  product: Product
  location: Location
}

Constraints:
  @@id([productId, locationId])      // Composite primary key
```

**Ownership:** Vendor (through Product) or Admin  
**Real-Life:** Controls where a product can be sold  
**Facing:** System (fulfillment), Admin (product setup)

---

#### **VendorPayout Model** (Financial Settlement)
```
VendorPayout {
  id: String (PK)                    // CUID
  vendorId: String (FK, required)
  vendor: Vendor
  
  amountFils: Int                    // Amount owed/paid
  status: String                     // "PENDING" | "PAID"
  reference: String?                 // Bank reference
  paidAt: DateTime?
  
  Period:
  periodStart: DateTime?
  periodEnd: DateTime?
  
  createdAt: DateTime
  updatedAt: DateTime
  
  Relations:
  - vendor: Vendor (M:1)
}

Constraints:
  @@index([vendorId])
  @@index([status])
```

**Ownership:** System (financial record)  
**Real-Life:** Accounting entry for vendor earnings  
**Facing:** Admin, Vendor (dashboard), Finance

---

#### **Refund Model** (Payment Reversal)
```
Refund {
  id: String (PK)                    // CUID
  orderId: String (FK, required)
  vendorOrderId: String (FK, UNIQUE) // One refund per VendorOrder
  
  stripeRefundId: String?            // Stripe refund ID
  amountFils: Int                    // Amount refunded
  reason: String                     // "Vendor rejected" / "Item unavailable"
  status: RefundStatus               // "PENDING" | "SUCCEEDED" | "FAILED"
  
  createdAt: DateTime
  updatedAt: DateTime
  
  Relations:
  - order: Order (M:1)
  - vendorOrder: VendorOrder (M:1)
}

Constraints:
  @@unique([vendorOrderId])
  @@index([orderId])
  @@index([status])
```

**Ownership:** System (created on vendor rejection)  
**Real-Life:** Money returned to customer  
**Facing:** Admin, Accounting, Vendor

---

#### **OrderEvent Model** (Audit Trail)
```
OrderEvent {
  id: String (PK)                    // CUID
  orderId: String? (FK)
  vendorOrderId: String? (FK)
  
  Actor:
  actorType: ActorType               // "SYSTEM" | "USER" | "VENDOR" | "ADMIN"
  actorId: String?                   // User/Vendor ID of actor
  
  Event:
  eventType: String                  // "VENDOR_ORDER_CREATED", "VENDOR_ACCEPTED", "VENDOR_SLA_EXPIRED", etc.
  data: Json?                        // Event-specific metadata
  
  createdAt: DateTime
  
  Relations:
  - order: Order? (M:1)
  - vendorOrder: VendorOrder? (M:1)
}

Constraints:
  @@index([orderId])
  @@index([vendorOrderId])
  @@index([eventType])
  @@index([createdAt])
```

**Ownership:** System (immutable log)  
**Real-Life:** Complete audit trail of order state changes  
**Facing:** Admin, Finance (compliance), Debugging

---

#### **VendorApplication Model** (Vendor Onboarding)
```
VendorApplication {
  id: String (PK)                    // CUID
  status: String                     // "PENDING" | "APPROVED" | "REJECTED"
  
  Business Identity:
  legalBusinessName: String          // Official registered name
  tradingName: String?               // Operating name
  country: String
  city: String
  businessRegNumber: String          // License/registry number
  taxVatNumber: String?
  website: String?
  businessCategory: String           // "Pharmacy", "IV Clinic", etc.
  businessDescription: String
  
  Contact Person:
  contactFullName: String
  contactRole: String                // "Owner", "Manager", etc.
  contactEmail: String
  contactPhone: String
  contactWhatsApp: String?
  preferredContactMethod: String
  
  Operations:
  operationRegion: String            // Service area
  fulfillmentType: String            // "Delivery", "Pickup", etc.
  deliveryTimeframe: String          // "Same day", "24h", etc.
  hasProductImages: Boolean
  complianceDocs: String[]           // Doc URLs
  
  Products:
  productDescription: String
  skuCount: Int?                     // Expected # of products
  hasPricing: Boolean
  
  Agreements:
  informationAccuracy: Boolean
  agreeContact: Boolean
  
  Metadata:
  createdAt: DateTime
  updatedAt: DateTime
  approvedAt: DateTime?
  approvedBy: String?                // Admin user ID
  notes: String?                     // Admin review notes
  ipAddress: String?
  userAgent: String?
  
  Vendor Link:
  approvedVendorId: String? (UNIQUE) // FK to Vendor (if approved)
  approvedVendor: Vendor?
  
  Relations:
  - approvedVendor: Vendor? (1:1)
  - inviteTokens: InviteToken[] (1:M)
}

Constraints:
  @@index([status])
  @@index([createdAt])
  @@index([contactEmail])
```

**Ownership:** Applicant (submits) + Admin (approves)  
**Real-Life:** Application to become a vendor  
**Facing:** Admin (review portal), Vendor (application form)

---

#### **InviteToken Model** (Vendor Onboarding Link)**
```
InviteToken {
  id: String (PK)                    // CUID
  vendorApplicationId: String (FK)
  vendorApplication: VendorApplication
  
  tokenHash: String (UNIQUE)         // Hashed token
  email: String                      // Invitee email
  
  expiresAt: DateTime                // Token expiration
  usedAt: DateTime?                  // When link was clicked
  createdVendorId: String?           // Vendor created from this token
  
  createdAt: DateTime
  
  Relations:
  - vendorApplication: VendorApplication (M:1)
}

Constraints:
  @@unique([tokenHash])
  @@index([email])
  @@index([expiresAt])
```

**Ownership:** System (generated)  
**Real-Life:** Email invite link for vendor registration  
**Facing:** Vendor (via email), System (validation)

---

#### **NextAuth Models** (Authentication)
```
Account {
  id, userId, type, provider, providerAccountId
  refresh_token, access_token, expires_at, token_type, scope, id_token, session_state
  Relations: user: User
  @@unique([provider, providerAccountId])
}

Session {
  id, sessionToken, userId, expires
  Relations: user: User
  @@unique([sessionToken])
}

VerificationToken {
  identifier, token, expires
  @@unique([identifier, token])
}
```

**Ownership:** NextAuth / Authentication system  
**Real-Life:** OAuth integration, email verification  
**Facing:** System internal

---

## SECTION 2: DATA OWNERSHIP MAP

| Model | Owner | Represents | User-Facing | Vendor-Facing | Admin-Facing | System | Notes |
|-------|-------|-----------|-------------|---------------|--------------|--------|-------|
| User | Self | Customer account | ✅ | ✅ (if role=VENDOR) | ✅ | ✅ | |
| Vendor | System/Admin | Marketplace partner | ✅ | ✅ | ✅ | | Created via VendorApplication or manual Admin entry |
| Product | Vendor | Catalog item | ✅ | ✅ | ✅ | | Owned by vendorId |
| ProductVariant | Vendor | SKU option | ✅ | ✅ | ✅ | | Through Product |
| Location | Admin | Geographic region | | | ✅ | ✅ | System-wide operational |
| ProductLocation | Vendor/Admin | Availability rule | | ✅ | ✅ | ✅ | Enforces where products can sell |
| Cart | User | Shopping session | ✅ | | | ✅ | One per user |
| CartItem | User | Basket item | ✅ | | | ✅ | Tracks vendorId for checkout |
| Order | User/System | Confirmed purchase | ✅ | | ✅ | ✅ | Status: PENDING_PAYMENT → PAID → FULFILLING → FULFILLED |
| OrderItem | Vendor/System | Line item | ✅ | ✅ | ✅ | ✅ | Snapshot + vendor ownership |
| VendorOrder | System/Vendor | Vendor fulfillment | | ✅ | ✅ | ✅ | Vendor must accept/reject |
| VendorOrderItem | System | Junction | | | ✅ | ✅ | Internal linking |
| Address | User | Delivery location | ✅ | | | ✅ | Belongs to user, used in orders |
| VendorPayout | System | Financial settlement | | ✅ | ✅ | ✅ | Earned from completed orders |
| Refund | System | Payment reversal | ✅ | | ✅ | ✅ | Created when vendor rejects |
| OrderEvent | System | Audit trail | | | ✅ | ✅ | Immutable log |
| VendorApplication | Applicant/Admin | Onboarding request | | ✅ | ✅ | | Evaluated by admin |
| InviteToken | System | Registration link | | ✅ | ✅ | | Email-based vendor signup |

---

## SECTION 3: PRODUCT + VENDOR FLOW

### 3.1 Vendor Creation Flow

**Path A: VendorApplication (Formal Onboarding)**
```
1. Applicant fills VendorApplication form
   ├─ legalBusinessName, businessRegNumber, contactEmail, etc.
   └─ status = "PENDING"

2. Admin reviews in admin panel
   ├─ Approves → status = "APPROVED", approvedAt = now()
   └─ Generates InviteToken (email link)

3. Vendor clicks email link (uses InviteToken)
   ├─ Creates User account (role = "VENDOR")
   ├─ Creates Vendor record
   └─ Links: VendorApplication.approvedVendorId → Vendor.id

4. Vendor now ready to create products
   └─ Has User account with role="VENDOR"
```

**Path B: Manual Vendor Creation (Admin Direct Entry)**
```
1. Admin directly creates Vendor record via API/admin panel
   ├─ name, slug, email, legalEntityName, etc.
   └─ No corresponding VendorApplication required

2. Optional: Create User account linked to Vendor.userId

3. Vendor ready to create products immediately
   └─ No application workflow
```

**⚠️ OBSERVATION:** Both paths are possible. VendorApplication exists but is optional.

---

### 3.2 Product Creation Flow

```
Vendor (with User role="VENDOR") creates Product:

POST /api/products (or admin panel)
├─ Vendor submits:
│  ├─ name, description, category
│  ├─ priceFils (AED × 100)
│  ├─ imageUrl
│  ├─ tags, description
│  └─ variants (optional)
│
├─ System creates:
│  ├─ Product {
│  │    vendorId: from session.vendorId,
│  │    slug: auto-generated from name,
│  │    priceFils: from input,
│  │    active: true,
│  │    published: true
│  │  }
│  └─ ProductVariant (if submitted) {
│       productId: new product,
│       sku: unique,
│       strength: from input,
│       priceFils: from input
│     }
│
└─ Optional: Add ProductLocation entries to control availability
   └─ Link: Product → Location (M:M via ProductLocation)
```

**Price Tracking:**
- **Product.priceFils** = Base price in fils
- **ProductVariant.priceFils** = Variant-specific price (overrides base)
- **CartItem.unitPriceFils** = Snapshot of price at cart-add time (immutable)
- **OrderItem.unitPriceFils** = Snapshot of price at order-create time (immutable)

✅ **Correct:** Snapshots ensure old orders don't break when prices change.

---

### 3.3 Add to Cart Flow

```
Customer adds Product to Cart:

POST /api/cart {productId, variantId?, quantity}

├─ Validate product exists
├─ Validate variant exists (if variantId provided)
├─ Get current vendor price:
│  └─ variant?.priceFils || product.priceFils
│
├─ Find or create Cart {userId}
│
├─ Create CartItem {
│    cartId,
│    productId,
│    vendorId: product.vendorId,  ← CRITICAL: Vendor tracked here
│    variantId,
│    quantity,
│    unitPriceFils: current_price   ← Price snapshot
│  }
│
└─ Return CartItem (customer sees item in basket)
```

**Key:** `vendorId` captured at add-to-cart time.

---

### 3.4 Checkout Flow

```
Customer initiates checkout:

POST /api/checkout/create {address, shippingName, ...}

├─ Get Cart with all items
│
├─ For each CartItem:
│  ├─ Validate product still exists
│  ├─ Validate cart item vendor matches product vendor
│  ├─ Use CartItem.unitPriceFils (not current product price)
│  └─ Create OrderItem {
│       orderId,
│       productId,
│       vendorId: cartItem.vendorId,  ← Still from cart
│       variantId,
│       quantity,
│       unitPriceFils: cartItem.unitPriceFils,  ← Snapshot preserved
│       productName: snapshot (immutable)
│       vendorName: snapshot (immutable)
│     }
│
├─ Create Order {
│    userId,
│    addressId,
│    status: "PENDING_PAYMENT",
│    subtotalFils: sum(OrderItem.lineTotalFils),
│    totalFils: subtotalFils + deliveryFils,
│    items: [...]
│  }
│
├─ Create VendorOrders (one per unique vendor):
│  └─ For each vendor in order:
│     ├─ Group OrderItems by vendor
│     └─ Create VendorOrder {
│          orderId,
│          vendorId,
│          status: "NEW",
│          acceptBy: now + 15 minutes,
│          items: [VendorOrderItem linking to OrderItems]
│        }
│
└─ Return orderId (customer redirected to payment)
```

**Critical Invariant:** 
- One Order per customer purchase
- One VendorOrder per vendor in that order
- One OrderItem per product line
- One VendorOrderItem per OrderItem (links to vendor responsibility)

---

### 3.5 Payment & Fulfillment Flow

```
Stripe Webhook (charge.captured or payment_intent.succeeded):

├─ Find Order by stripePaymentIntentId
├─ Update Order.status = "PAID"
│
├─ Update all VendorOrders.status = "READY_FOR_FULFILLMENT"
│
├─ Send notification to each vendor:
│  └─ Vendor has 15 minutes to accept/reject
│
└─ Vendor receives VendorOrder notification:
   ├─ Views items, price, shipping address
   ├─ Decision:
   │  ├─ Accept → status = "ACCEPTED" → in-app fulfillment tracking
   │  └─ Reject → status = "REJECTED" → Issue refund
   └─ If all vendors accept:
      └─ Order becomes "FULFILLING"
```

**Vendor SLA:** 15 minutes to accept/reject (acceptBy timestamp).

---

## SECTION 4: STRIPE DEPENDENCY CHECK

### Where Stripe is Used

| Area | Stripe Integration | Coupled? | Risk |
|------|-------------------|----------|------|
| **Payment Processing** | `stripeCheckoutSessionId`, `stripePaymentIntentId` in Order | Required | HIGH (can't checkout without Stripe) |
| **Webhook Handler** | `/api/stripe/webhook` processes charge.captured → creates VendorOrders | Required | HIGH (fulfillment blocked without payment webhook) |
| **Refunds** | `issueVendorOrderRefund` calls `stripe.refunds.create()` when vendor rejects | Required | HIGH (vendor rejection triggers Stripe refund) |
| **Payment Status** | Order.status transitions tied to Stripe events | Required | HIGH (order state machine depends on Stripe) |
| **Product Pricing** | Product.priceFils used only in product catalog, NOT coupled to Stripe | ✅ Clean | LOW (Stripe only processes, doesn't dictate pricing) |
| **Vendor Payouts** | VendorPayout records created, but no Stripe payouts logic visible | Loose | MEDIUM (no automatic vendor payment processing) |

### Assessment

**Stripe is tightly coupled to the payment and fulfillment flow:**

✅ **GOOD:**
- Used only for payments (not product logic)
- Separated into `/api/stripe/webhook`
- Order state machine clearly defined
- Price snapshots prevent Stripe from affecting product catalog

❌ **PROBLEMATIC:**
- **Cannot create orders without Stripe secret key configured**
- **Webhook must fire for VendorOrders to move beyond "NEW"** (no manual override for testing)
- **Refunds hardcoded to Stripe** (can't issue test refunds without Stripe)
- **No mock/test payment mode** for development

### Stripe in Schema

```prisma
// In Order model:
stripeCheckoutSessionId: String? @unique
stripePaymentIntentId: String?

// That's it. No vendor-facing Stripe fields.
// Refund.stripeRefundId is only informational.
```

**Verdict:** Stripe dependency is appropriate for a real marketplace, but it blocks local development and testing without a live Stripe key.

---

## SECTION 5: DATA QUALITY RISKS

### 🔴 CRITICAL ISSUES

| Issue | Location | Severity | Impact |
|-------|----------|----------|--------|
| **vendorId in CartItem nullable in code but required in business logic** | CartItem.vendorId (declared required but code assumes always set) | CRITICAL | Cart checkout fails if vendorId missing |
| **No cascade delete on Product → Variant** | ProductVariant.product FK onDelete: Cascade | MEDIUM | Variant deleted if product deleted (expected) |
| **Order requires payment before fulfillment starts** | Order.status must be "PAID" before VendorOrders leave "NEW" | CRITICAL | Stripe webhook required to unblock vendors |
| **Vendor.userId optional but should be required for portal access** | Vendor.userId String? UNIQUE | MEDIUM | Vendor can exist without user account (no portal) |
| **ProductVariant.strength required but Product.priceFils optional** | Inconsistent nullable patterns | LOW | Can have products with no price |

---

### 🟡 MEDIUM CONCERNS

| Concern | Location | Risk |
|---------|----------|------|
| **No unique constraint on Vendor name** | Vendor.name (no @unique) | Two vendors could have same name |
| **Cart.userId nullable but treated as required** | Cart.userId String? but code assumes always set | Guest cart support unclear |
| **Address.normalizedHash based on lat/lng, not address content** | Hash = MD5(lat,lng) | Two different addresses at same location are considered duplicates |
| **No inventory management** | ProductVariant has inStock Boolean but no quantity field | Can't track stock levels, only available/unavailable |
| **ProductLocation doesn't enforce isGlobal conflict** | isGlobal = true but ProductLocation rows also exist | Ambiguous: is product global OR location-specific? |
| **Order accepts delivery cost but always 0** | deliveryFils: Int @default(0) | Shipping calculation not implemented |
| **VendorOrder.status transition SLA only noted in notesToVendor** | acceptBy exists but no auto-timeout logic | Manual admin intervention required if vendor ignores SLA |
| **Refund.reason is just a string** | No enum for refund reasons | Inconsistent refund reason entries |
| **No soft-delete support** | Records are hard-deleted on Cascade | Audit trail lost if product deleted |

---

### 🟢 GOOD PATTERNS

✅ **OrderItem snapshots** - Product names, prices, vendor names captured at order time  
✅ **VendorOrder isolation** - Each vendor gets separate order with separate SLA  
✅ **OrderEvent audit trail** - Complete history of state changes  
✅ **Price snapshots** - CartItem and OrderItem preserve prices at capture time  
✅ **vendorId tracking** - Vendor responsibility clear at CartItem, OrderItem, VendorOrder level  
✅ **Address deduplication** - normalizedHash prevents duplicate addresses per user  
✅ **Vendor application workflow** - Formal onboarding process exists  

---

## SECTION 6: CURRENT LIMITATIONS

### Q: Can the system support multiple vendors in one order?

**✅ YES**

```
Customer cart can have items from 3 different vendors:
  CartItem 1: Product A (vendorId: V1)
  CartItem 2: Product B (vendorId: V2)
  CartItem 3: Product C (vendorId: V1)

Checkout creates:
  Order (single order, userId, addressId)
  ├─ OrderItem 1 (vendorId: V1)
  ├─ OrderItem 2 (vendorId: V2)
  └─ OrderItem 3 (vendorId: V1)
  
  VendorOrder 1 (vendorId: V1, items: [1, 3])
  └─ VendorOrder 2 (vendorId: V2, items: [2])
```

**Current Test Data Limitation:** Only one vendor configured (House Brand), so never tested.

---

### Q: Can vendors see only their own orders?

**✅ YES (ARCHITECTURALLY)**

```
GET /api/vendor/orders

Authorization: Only vendorId from User.role=VENDOR session allowed to query:
  WHERE vendorId = session.vendorId

Returns: VendorOrders filtered by vendor
```

**Current Limitation:** Vendor portal not fully implemented, but schema/API supports it.

---

### Q: Can products exist without Stripe?

**❌ NO**

```
Payment Flow:
  1. Create Order (status: PENDING_PAYMENT)
  2. Create Stripe Checkout Session (requires STRIPE_SECRET_KEY)
  3. Customer completes payment
  4. Stripe webhook fires (required)
  5. Order.status = PAID
  6. VendorOrders.status = READY_FOR_FULFILLMENT
  7. Vendor can accept/reject

If Stripe not configured:
  ✗ Step 2 fails (no secret key)
  ✗ Step 4 never fires (no webhook)
  ✗ Step 5-7 blocked (order stuck in PENDING_PAYMENT)
```

**Products can exist and be added to cart, but checkout is blocked without Stripe.**

---

### Q: Can prices change without breaking old orders?

**✅ YES**

```
Old order's prices locked in OrderItem.unitPriceFils (immutable)
New orders use current Product.priceFils or ProductVariant.priceFils

If vendor changes Product.priceFils:
  ✗ Old OrderItem.unitPriceFils unchanged (safe)
  ✓ New orders use new price (fresh snapshot at checkout)
```

**Correct design.** Price history not tracked, but orders are safe.

---

### Q: Do vendors have a portal?

**❌ NOT YET**

Schema exists:
- Vendor.userId (link to User account)
- VendorOrder (orders ready to accept/reject)
- /api/vendor/orders (API exists)

But:
- No vendor dashboard UI implemented
- Vendor onboarding via VendorApplication exists
- No vendor login flow wired

---

### Q: Can you support fulfillment carriers (DHL, Noon Delivery)?

**PARTIALLY** 

Schema has space (shippingNotes, shippingAddressLine1-2) but:
- No carrier integration code
- No tracking number storage
- No carrier API integration

**Would require:** Add Carrier model, CarrierTracking model, integration webhooks.

---

### Q: Can you support digital products (download, PDF)?

**NO**

Schema assumes physical delivery (shippingAddressLine1, deliveryFils).

**Would require:** Add Product.isDigital, downloadUrl, add separate "digital fulfillment" VendorOrder status flow.

---

### Q: Can you support subscriptions?

**NO**

Schema has no support for recurring charges, subscription terms, auto-renewal.

**Would require:** Separate Subscription model, SubscriptionLineItem model, Stripe subscription integration.

---

## SECTION 7: RED FLAGS FOR ADDING REAL VENDORS & PRODUCTS

### 🔴 BLOCKERS

| Flag | Severity | Reason | Fix |
|------|----------|--------|-----|
| **Stripe key required for any checkout** | CRITICAL | Can't process orders without payment provider | Use test Stripe key or implement alternative payment (optional) |
| **No vendor portal UI** | HIGH | Vendors can't see/manage their orders | Build vendor dashboard (login, order list, accept/reject UI) |
| **No vendor onboarding in UI** | HIGH | Can't add vendors via self-service | Build vendor application form or admin vendor creation UI |
| **No inventory tracking** | MEDIUM | Vendor can't limit stock per SKU | Add quantity field to ProductVariant and CartItem validation |
| **No product image hosting** | MEDIUM | Vendor has imageUrl field but no upload system | Implement image upload (S3, Cloudinary, etc.) |
| **No price change notifications** | LOW | Vendor changes price, customer doesn't know | Log price changes in OrderEvent, send notification (optional) |

---

### 🟡 CONCERNS

| Concern | Severity | Reason | Mitigation |
|---------|----------|--------|-----------|
| **Manual vendor creation required** | HIGH | VendorApplication exists but no flow to create User | Admin create vendor + user together |
| **Order stuck if vendor doesn't respond in 15 min** | MEDIUM | No auto-refund if SLA expires | Implement cron job to auto-reject expired orders |
| **No Refund auto-completion** | MEDIUM | Refund record created but Stripe refund may fail | Implement refund retry logic with status tracking |
| **Address.normalizedHash only on lat/lng** | MEDIUM | Different buildings at same coordinates seen as duplicate | Consider adding address line 1 to hash |
| **No rate limiting on cart/checkout** | MEDIUM | Could be abused for testing | Add rate limiting to /api/cart and /api/checkout |
| **Delivery fee always 0** | MEDIUM | Can't charge shipping | Implement shipping calculator (distance-based, fixed, etc.) |

---

## SECTION 8: READINESS VERDICT

### ✅ READY FOR REAL VENDORS & PRODUCTS?

**RATING: 7/10**

#### ✅ What's Ready

1. **Multi-vendor order isolation** - VendorOrder per vendor per order
2. **Price snapshots** - Orders immune to price changes
3. **Vendor tracking** - vendorId captured at every decision point
4. **Vendor SLA/acceptance** - 15-min window to accept/reject with audit trail
5. **Refund logic** - Vendor rejection triggers automatic refund
6. **Role-based auth** - User.role supports VENDOR, ADMIN, USER
7. **Vendor application workflow** - Formal onboarding exists (VendorApplication)
8. **Multi-location support** - Location/ProductLocation for geographic rules
9. **Address management** - Users can save and reuse delivery addresses
10. **Order history** - OrderEvent audit trail for compliance

---

#### ⚠️ What Needs Work

1. **Vendor Portal UI** - No dashboard for vendors to manage orders
2. **Product Upload** - No vendor interface to create/edit products (schema ready, UI missing)
3. **Inventory Tracking** - Can mark in_stock / out_stock but no quantity management
4. **Shipping Integration** - No carrier/tracking integration
5. **Auto-SLA Enforcement** - No auto-reject if vendor ignores 15-min deadline
6. **Test Payment Flow** - Stripe required (no mock/test mode)
7. **Vendor Payout System** - Records exist but no actual payout processing (no bank integration)
8. **Order Status Notifications** - No email/push when order status changes

---

#### 🚀 Recommended Next Steps (In Priority Order)

**MUST HAVE (Production Blocking):**
1. Build vendor portal (login + order management UI)
2. Create vendor product upload UI
3. Add inventory quantity tracking
4. Implement auto-refund for expired SLA orders

**SHOULD HAVE (Launch After MVP):**
5. Add shipping cost calculation
6. Implement vendor payout processing (bank transfer integration)
7. Add order status notifications (email)
8. Implement fulfillment carrier integration

**NICE TO HAVE (Post-Launch):**
9. Vendor analytics dashboard
10. Dynamic pricing rules
11. Bulk order import
12. Advanced reporting

---

## DELIVERABLE SUMMARY (FOR FOUNDER)

### Current State
Your database is **architecturally sound for a multi-vendor marketplace**. The schema properly supports:
- Multiple vendors selling in a single customer order
- Vendor-specific fulfillment workflows (each vendor must accept/reject their portion)
- Price stability (old order prices don't change if vendor updates pricing)
- Vendor isolation (vendors can't see other vendors' orders)

### What Works Now
✅ Add products to cart from different vendors  
✅ Create orders with items from multiple vendors  
✅ Create vendor orders with 15-minute SLA  
✅ Vendors can accept or reject their portion  
✅ Issue refunds when vendors reject  
✅ Store addresses and delivery preferences  
✅ Audit trail of all state changes  

### What's Missing
❌ Vendor dashboard (can't see orders)  
❌ Vendor product upload UI  
❌ Inventory quantity tracking  
❌ Automatic refunds if vendor ignores SLA  
❌ Shipping cost calculation  
❌ Vendor payout processing  

### Can You Add Real Vendors?
**YES, but you need to:**
1. **Manually create vendor via admin** (or build self-serve form)
2. **Manually add products via admin** (or build vendor upload UI)
3. **Build vendor dashboard** so they can see & manage orders
4. **Add test Stripe key** so checkout works
5. **Implement auto-SLA rejection** to handle non-responsive vendors

### Estimated Effort
- Vendor login + dashboard: **2-3 weeks**
- Product upload UI: **1-2 weeks**
- Inventory management: **1 week**
- Auto-SLA + refunds: **3-4 days**
- **Total: ~1.5-2 months** for full production readiness

### Bottom Line
The schema is production-ready. The missing piece is the **vendor-facing UI**. Right now, only admins can manage everything. Once you build the vendor portal, you can onboard real vendors within days.

---

**END OF ANALYSIS**
