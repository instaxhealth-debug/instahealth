# Order Creation Flow with Stripe Integration

## Overview
Production-grade order creation system with Stripe Checkout integration and webhook payment confirmation.

## Architecture

### Database Schema
- **Order**: Stores order details with Stripe session tracking
  - `status`: PENDING_PAYMENT (default), PAID, CANCELLED, REFUNDED
  - `stripeCheckoutSessionId`: Unique Stripe session identifier
  - `stripePaymentIntentId`: Stripe payment intent (set after payment)
  - Money stored as integer fils (1 AED = 100 fils)
  - Shipping information (name, phone, address lines, notes)

- **OrderItem**: Line items for each order
  - Links to Order, Product, Vendor
  - `unitPriceFils` and `lineTotalFils` for price tracking

- **Cart**: User shopping cart
  - One cart per user (userId is unique)

- **CartItem**: Items in cart
  - Unique pair: cartId + productId

### API Endpoints

#### POST /api/checkout
Creates an order and Stripe checkout session.

**Authentication**: Required (NextAuth session)

**Request Body**:
```json
{
  "locationId": "string",
  "shippingName": "string",
  "shippingPhone": "string",
  "shippingAddressLine1": "string",
  "shippingAddressLine2": "string (optional)",
  "shippingNotes": "string (optional)"
}
```

**Response**:
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/...",
  "orderId": "clx..."
}
```

**Flow**:
1. Validates user session
2. Retrieves user's cart with products
3. Validates all products are available and in stock
4. Creates Order with status=PENDING_PAYMENT
5. Creates OrderItems from cart items
6. Creates Stripe Checkout Session
7. Updates Order with stripeCheckoutSessionId
8. Clears user's cart
9. Returns Stripe session URL for redirect

**Error Responses**:
- 401: Unauthorized (no session)
- 404: User not found
- 400: Missing fields, empty cart, or unavailable products
- 500: Server error

#### POST /api/stripe/webhook
Handles Stripe webhook events to update order status.

**Authentication**: Stripe signature verification

**Events Handled**:
- `checkout.session.completed`: Marks order as PAID

**Flow**:
1. Verifies webhook signature using STRIPE_WEBHOOK_SECRET
2. Finds Order by stripeCheckoutSessionId
3. Checks if already PAID (idempotent)
4. Updates Order status to PAID
5. Stores stripePaymentIntentId

**Response**: Always returns 200 for valid webhooks

### Cart Management (lib/cart.ts)

**Functions**:
- `getOrCreateCart(userId)`: Get user cart or create if doesn't exist
- `addToCart(userId, productId, quantity)`: Add/update item in cart
- `updateCartItemQuantity(cartItemId, quantity)`: Update or remove item
- `removeFromCart(cartItemId)`: Delete item from cart
- `getCartWithProducts(userId)`: Get cart with product details and totals
- `clearCart(userId)`: Remove all items from cart

## Environment Variables

Add these to `.env.local`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...              # Stripe secret API key
STRIPE_WEBHOOK_SECRET=whsec_...            # Webhook signing secret from Stripe dashboard

# Application URL (for Stripe redirects)
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Use production URL in production

# Database (already configured)
DATABASE_URL="file:./dev.db"

# NextAuth (already configured)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

## Setup Instructions

### 1. Get Stripe Keys
1. Create a Stripe account at https://stripe.com
2. Get test API keys from Dashboard → Developers → API keys
3. Copy "Secret key" (starts with `sk_test_`)

### 2. Configure Webhook
1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks to local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy the webhook signing secret (starts with `whsec_`)
5. Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

**For Production**:
1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select event: `checkout.session.completed`
4. Copy signing secret to production environment

### 3. Test the Flow

**Create test cart and checkout**:
```bash
# 1. Start the app
npm run dev

# 2. In another terminal, start Stripe webhook listener
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 3. Login to your app
# 4. Add items to cart (via your UI or API)
# 5. POST to /api/checkout with shipping details
# 6. Redirect to returned checkout URL
# 7. Use test card: 4242 4242 4242 4242, any future date, any CVC
# 8. Complete payment
# 9. Check webhook logs - order should be marked PAID
```

## UI Integration Example

```typescript
// In your cart/checkout page
const handleCheckout = async () => {
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId: selectedLocationId,
        shippingName: name,
        shippingPhone: phone,
        shippingAddressLine1: address1,
        shippingAddressLine2: address2,
        shippingNotes: notes,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Checkout failed');
    }

    // Redirect to Stripe Checkout
    window.location.href = data.url;
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Failed to start checkout');
  }
};
```

## Money Handling

All monetary values are stored as **integer fils** (1 AED = 100 fils):
- Product prices: `priceFils`
- Order totals: `subtotalFils`, `deliveryFils`, `totalFils`
- Order items: `unitPriceFils`, `lineTotalFils`

**Conversion**:
```typescript
// Display: fils to AED
const aed = priceFils / 100;
const formatted = `AED ${aed.toFixed(2)}`;

// Store: AED to fils
const fils = Math.round(aedAmount * 100);
```

**Stripe Integration**:
Stripe expects amounts in smallest currency unit, which matches our fils storage:
```typescript
unit_amount: unitPriceFils // No conversion needed!
```

## Security

- **Authentication**: All checkout endpoints require NextAuth session
- **Webhook Verification**: Stripe signature validation prevents unauthorized status updates
- **Idempotency**: Webhook handler checks existing order status before updating
- **Product Validation**: Verifies products exist, are active, and in stock before checkout
- **User Isolation**: Users can only checkout their own cart

## Status Flow

```
[User adds items to cart]
        ↓
[POST /api/checkout] → Order created: status=PENDING_PAYMENT
        ↓
[Redirect to Stripe]
        ↓
[User completes payment]
        ↓
[Stripe webhook] → Order updated: status=PAID
        ↓
[Redirect to /checkout/success]
```

## Error Handling

- Invalid products → 400 with specific product name
- Empty cart → 400
- Missing shipping info → 400
- Webhook signature failure → 400 (logged)
- Order not found in webhook → 200 (acknowledged, no retry)
- Already paid → 200 (idempotent)

## Next Steps

1. Add delivery fee calculation logic
2. Add order email notifications (on PAID status)
3. Add admin dashboard for order management
4. Add order tracking page at /orders/[id]
5. Implement CANCELLED and REFUNDED status workflows
6. Add inventory decrement on PAID status
