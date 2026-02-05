# Cart & Checkout Debugging Protocol

## Debug Environment Setup ✅

- Dev server running with: `NEXT_PUBLIC_DEBUG_CART=true DEBUG_CART=true DEBUG_CHECKOUT=true npm run dev`
- Prisma Studio available at: http://localhost:5556
- Debug logging added to:
  - `hooks/use-enhanced-cart.ts` (client-side)
  - `app/api/cart/route.ts` (server-side)
  - `app/checkout/page.tsx` (checkout flow)

## Issue #1: "Add to Cart" Does Not Add Items

### Expected Flow
```
User clicks "Add to Cart" button
  ↓
onClick handler fires (ProductCard/ProductDetail/OfferingCard)
  ↓
useEnhancedCart.addItem(productId, variantId, quantity)
  ↓
[CART:ADD] console logs appear in browser
  ↓
POST /api/cart with {productId, variantId, quantity, action:"add"}
  ↓
[API:CART:POST] console logs appear in terminal
  ↓
Database: CartItem created/updated
  ↓
Response: Updated cart with items
  ↓
setDBCart(cart) updates React state
  ↓
CartView re-renders with new item
```

### Debug Checklist

**Browser Console** (Open DevTools → Console):
- [ ] Do you see `[CART:ADD] Starting addItem` when clicking button?
  - **YES**: Hook is executing
  - **NO**: Button onClick not connected or useEnhancedCart not imported

- [ ] Do you see `[CART:ADD] User authenticated, posting to /api/cart`?
  - **YES**: User is logged in
  - **NO**: User session is missing → **Root Cause: Auth failure**

- [ ] Do you see `[CART:ADD] Request payload: {...}`?
  - **YES**: Request is being sent
  - **NO**: Code execution stopped before fetch → Check for errors

- [ ] Do you see `[CART:ADD] Response status: 200`?
  - **YES**: API succeeded
  - **NO**: Check what status you see → **Root Cause: API error**

- [ ] Do you see `[CART:ADD] Cart updated: {itemCount: X}`?
  - **YES**: State updated successfully
  - **NO**: Response parsing failed → **Root Cause: Response format issue**

**Terminal Logs** (Server console):
- [ ] Do you see `[API:CART:POST] Session: ✓ Authenticated`?
  - **YES**: Auth working
  - **NO**: Session middleware failure → **Root Cause: NextAuth config**

- [ ] Do you see `[API:CART:POST] Request: {userId, productId, ...}`?
  - **YES**: Request received
  - **NO**: Request not reaching API → **Root Cause: Network/routing issue**

- [ ] Do you see `[API:CART:POST] ✓ Found existing cart:` or `Creating new cart`?
  - **YES**: Cart exists/created
  - **NO**: Database query failed → **Root Cause: Prisma error**

- [ ] Do you see `[API:CART:POST] ✓ Returning cart: {cartId, itemCount}`?
  - **YES**: Response sent successfully
  - **NO**: Query failed → **Root Cause: Database issue**

**Database Check** (Prisma Studio → http://localhost:5556):
1. Open `Cart` table
   - [ ] Is there a cart for the current user?
   - [ ] What is the `status`? (should be "ACTIVE")

2. Open `CartItem` table
   - [ ] Are there items linked to the cart?
   - [ ] Do the `productId` values exist in `Product` table?
   - [ ] Is `unitPriceFils` > 0?
   - [ ] Is `quantity` > 0?

### Common Root Causes

| Symptom | Root Cause | Fix Location |
|---------|-----------|--------------|
| No `[CART:ADD]` logs | Button not connected | Component onClick handler |
| "User authenticated" not logged | Session missing | Check login state |
| Status 401 | Auth failed | `app/api/cart/route.ts` session check |
| Status 400 | Missing productId | Request payload validation |
| Status 500 | Database error | Check Prisma schema/connection |
| Response OK but cart empty | Wrong user queried | `userId` mismatch |
| Item not appearing in UI | State not updating | `setDBCart` not called |

---

## Issue #2: Stuck/Ghost Cart Item Cannot Be Deleted

### Expected Flow
```
User clicks "Remove" button in CartView
  ↓
onClick fires: removeItem(productId, variantId)
  ↓
[CART:REMOVE] console logs in browser
  ↓
POST /api/cart with {productId, variantId, quantity: 0, action:"remove"}
  ↓
[API:CART:POST] logs in terminal
  ↓
Database: CartItem deleted (deleteMany with productId + variantId)
  ↓
Response: Updated cart without item
  ↓
UI re-renders without item
```

### Debug Checklist

**Identify the Stuck Item**:
1. In browser console, log current cart:
   ```js
   // In browser DevTools console
   fetch('/api/cart').then(r => r.json()).then(console.log)
   ```

2. Look for items with:
   - `product: null` (product deleted from DB but CartItem remains)
   - `variant: null` when variantId is not null (variant deleted)
   - `unitPriceFils: 0` (price not set properly)

**Try Manual Removal**:
```js
// In browser DevTools console
fetch('/api/cart', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    productId: 'STUCK_ITEM_PRODUCT_ID',
    variantId: 'STUCK_ITEM_VARIANT_ID_OR_NULL',
    quantity: 0,
    action: 'remove'
  })
}).then(r => r.json()).then(console.log)
```

**Check Terminal Logs**:
- [ ] Do you see `[API:CART:POST] Request: {..., action:"remove"}`?
- [ ] Do you see database deletion query?
- [ ] Do you see `[API:CART:POST] ✓ Returning cart`?

**Database Direct Query** (Prisma Studio):
1. Find the stuck CartItem record
2. Note its `id`, `productId`, `variantId`
3. Check if `productId` exists in `Product` table
4. Try deleting directly in Prisma Studio
   - **If deletion works**: Foreign key constraint is fine
   - **If deletion fails**: Constraint issue

### Common Root Causes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Item shows `product: null` | Product deleted but CartItem remains | Add ON DELETE CASCADE to FK |
| Remove button does nothing | onClick not connected | Check `CartView` component |
| Status 200 but item remains | Wrong productId/variantId in request | Log request payload |
| deleteMany finds 0 records | Mismatch in variant matching (null vs undefined) | Fix null/undefined handling |
| Item reappears after refresh | Deletion not committed | Check transaction/DB connection |

---

## Issue #3: "Proceed to Payment" Does Nothing

### Expected Flow
```
User clicks "Proceed to Payment" button
  ↓
onClick fires: handleCheckoutSubmit()
  ↓
[CHECKOUT] Submitting with address: {...}
  ↓
POST /api/checkout/create (address + cart data)
  ↓
[CHECKOUT] Order created: orderId
  ↓
POST /api/checkout/stripe-session {orderId}
  ↓
[CHECKOUT] Redirecting to Stripe: https://checkout.stripe.com/...
  ↓
window.location.assign(stripeUrl)
  ↓
Browser redirects to Stripe payment page
```

### Debug Checklist

**Browser Console**:
- [ ] Do you see `[CHECKOUT] Submitting with address:`?
  - **YES**: Handler is executing
  - **NO**: Button onClick not connected or validation failing → **Check form validation**

- [ ] Do you see `[CHECKOUT] Order created: orderId`?
  - **YES**: Order creation succeeded
  - **NO**: Check for `[CHECKOUT] Create order failed:` → **Root Cause: Order creation error**

- [ ] Do you see `[CHECKOUT] Redirecting to Stripe:`?
  - **YES**: Stripe session created
  - **NO**: Check for `[CHECKOUT] Stripe session failed:` → **Root Cause: Stripe API error**

- [ ] Does browser actually redirect?
  - **YES**: Working correctly
  - **NO**: `window.location.assign()` blocked? → Check console for errors

**Terminal Logs**:

For `/api/checkout/create`:
- [ ] Request received with cart items?
- [ ] Order created in database?
- [ ] Response: `{orderId: "..."}`?

For `/api/checkout/stripe-session`:
- [ ] Request received with orderId?
- [ ] Stripe API called successfully?
- [ ] Response: `{url: "https://checkout.stripe.com/..."}`?

**Network Tab** (DevTools → Network):
1. Click "Proceed to Payment"
2. Watch for requests:
   - `POST /api/checkout/create` → Status 200? Response has `orderId`?
   - `POST /api/checkout/stripe-session` → Status 200? Response has `url`?
3. If either fails, check:
   - Request payload
   - Response body
   - Response status code

### Common Root Causes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| No console logs | Button onClick not wired | Check `CheckoutPage` button |
| Form validation error | Missing required fields | Check address/terms/disclaimer |
| "Cart is empty" error | No items in DB cart | User needs to add items first |
| Order creation fails | Prisma schema mismatch | Check Order model fields |
| Stripe session fails | Invalid Stripe key | Check `.env.local` STRIPE_SECRET_KEY |
| "No payment URL" | Stripe response format changed | Check Stripe API response |
| Redirect doesn't happen | Browser blocking navigation | Check for popup blocker |

---

## Systematic Debugging Steps

### Step 1: Reproduce in Browser
1. Open http://localhost:3000
2. Open DevTools Console (Cmd+Option+J)
3. Open DevTools Network tab
4. **Test Issue #1**: Click "Add to Cart" on any product
   - Watch console for `[CART:ADD]` logs
   - Watch terminal for `[API:CART:POST]` logs
   - Check Network tab for POST /api/cart request

5. **Test Issue #2**: Go to cart, click remove on an item
   - Watch console for `[CART:REMOVE]` logs
   - Watch terminal for `[API:CART:POST]` logs with action:"remove"

6. **Test Issue #3**: Complete checkout form, click "Proceed to Payment"
   - Watch console for `[CHECKOUT]` logs
   - Watch Network tab for checkout API calls

### Step 2: Capture Evidence
Take screenshots/copy:
- Browser console logs
- Terminal logs
- Network request/response payloads
- Database state (from Prisma Studio)

### Step 3: Identify Root Cause
Match symptoms to tables above to find exact failure point

### Step 4: Propose Minimal Fix
- File path + line number
- Exact code change
- Why it fixes the root cause

---

## Quick Commands

### View Server Logs
```bash
tail -f /tmp/dev-server.log
```

### Query Database Directly
```bash
cd "/Users/cruzfrangieh/Desktop/instaxhealth website"
npx prisma studio
# Opens at http://localhost:5555 or 5556
```

### Test API Endpoints
```bash
# Get session
curl http://localhost:3000/api/auth/session

# Get cart
curl -H "Cookie: authjs.session-token=YOUR_TOKEN" \
  http://localhost:3000/api/cart

# Add to cart
curl -X POST http://localhost:3000/api/cart \
  -H "Cookie: authjs.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"PRODUCT_ID","quantity":1,"action":"add"}'
```

### Clear Cart (Reset Test State)
```js
// In browser console
fetch('/api/cart', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({action: 'clear'}) // If implemented
})
```

---

## Next: Run Tests

1. Open browser to http://localhost:3000
2. Open DevTools console
3. Login if not already
4. Follow "Step 1: Reproduce in Browser" above
5. Document all logs and errors
6. Report findings with evidence

**No code changes until root causes are identified with proof.**
