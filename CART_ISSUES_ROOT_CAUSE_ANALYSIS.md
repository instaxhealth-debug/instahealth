# Cart Issues - Root Cause Analysis

## Investigation Summary

**Date**: 2026-02-05  
**Debug Environment**: NEXT_PUBLIC_DEBUG_CART=true, DEBUG_CART=true enabled  
**Method**: Code review, schema analysis, data flow tracing

---

## Issue #1: "Add to Cart" Does Not Add Items

### ROOT CAUSES IDENTIFIED ✅

#### **Cause 1A: Invalid Product IDs in Mock Data (OfferingCard)**

**Location**: [components/marketplace/OfferingCard.tsx](components/marketplace/OfferingCard.tsx#L28-L31)

**Problem**:
```typescript
// OfferingCard.tsx line 28-31
await addItem(
  offering.id,                              // ❌ WRONG
  offering.shopifyVariantId || offering.id, // ❌ WRONG
  1
);
```

The `offering.id` values are prefixed strings like `"offering-instapepz-xyz"` from [lib/data/vendors.ts](lib/data/vendors.ts#L136-L157), which **do not exist** in the Prisma `Product` table.

**Evidence**:
- [lib/data/vendors.ts#L137](lib/data/vendors.ts#L137): Offerings are created with `id: "offering-instapepz-${product.id}"`
- [prisma/schema.prisma#L216-L240](prisma/schema.prisma#L216-L240): Product IDs are CUIDs without prefixes
- API cart route expects valid Product.id from database

**Expected Flow**:
```
User clicks "Add to Cart"
  ↓
POST /api/cart {productId: "offering-instapepz-xyz", ...}
  ↓
API queries: Product.findUnique({where: {id: "offering-instapepz-xyz"}})
  ↓
Result: null (product not found)
  ↓
API tries to create CartItem with invalid productId
  ↓
Prisma foreign key constraint fails OR item created but can't load product relation
```

**Fix Required**:
Either:
1. **Option A**: OfferingCard should only be used with database-backed offerings (not mock data)
2. **Option B**: Convert offerings to use real Product IDs from database
3. **Option C**: Remove OfferingCard and use ProductCard everywhere

---

#### **Cause 1B: Incorrect variantId in ProductCard**

**Location**: [components/cards/ProductCard.tsx](components/cards/ProductCard.tsx#L24)

**Problem**:
```typescript
// ProductCard.tsx line 24
await addItem(product.id, product.id, 1);
//                         ^^^^^^^^^^^ ❌ WRONG - passing productId as variantId
```

**Expected**:
```typescript
// Should be:
await addItem(product.id, undefined, 1);
// OR if product has variants:
await addItem(product.id, product.variants?.[0]?.id, 1);
```

**Impact**:
- When API receives `variantId` equal to `productId`, it looks for a ProductVariant with that ID
- ProductVariant IDs are different from Product IDs
- Query: `ProductVariant.findFirst({where: {id: productId}})` returns null
- Cart item is created with invalid `variantId`
- When fetching cart, the `variant` relation returns null (ghost data)

**Evidence**:
- [prisma/schema.prisma#L379](prisma/schema.prisma#L379): `variant ProductVariant? @relation(fields: [variantId], references: [id])`
- [app/api/cart/route.ts#L82-L100](app/api/cart/route.ts#L82-L100): API uses `variantId` to query ProductVariant table

**Fix Required**:
```typescript
// ProductCard.tsx
const handleAddToCart = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  try {
    // Use undefined for variantId if product has no variants
    // Or select specific variant if product has variants
    const variantId = product.variants?.[0]?.id;
    await addItem(product.id, variantId, 1);
    toast({
      title: "Added to cart",
      description: `${product.name} added to your cart`,
    });
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to add item to cart",
      variant: "destructive",
    });
  }
};
```

---

#### **Cause 1C: Silent Error Handling in useEnhancedCart**

**Location**: [hooks/use-enhanced-cart.ts](hooks/use-enhanced-cart.ts#L93-L135)

**Problem**:
```typescript
// useEnhancedCart.ts (with new debug logging)
if (res.ok) {
  const cart = await res.json();
  setDBCart(cart);
} else {
  const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
  console.error("[CART:ADD] API error:", res.status, errorData);
  throw new Error(errorData.error || "Failed to add to cart"); // ✅ NOW throws
}
```

**Previous behavior** (before debug logging):
- Errors were logged to console but NOT thrown
- UI didn't know the operation failed
- No toast notification shown
- User thinks item was added but it wasn't

**Evidence**: The original code only logged errors without throwing, preventing the calling component's try/catch from handling failures.

**Fix Status**: ✅ FIXED - Debug logging now throws errors

---

### Verification Steps for Issue #1

To verify the fixes work:

1. **Check Product IDs in Database**:
   ```sql
   -- In Prisma Studio or psql
   SELECT id, name, slug FROM "Product" LIMIT 5;
   ```
   
2. **Browser Console Test**:
   ```javascript
   // Test with real product ID from database
   fetch('/api/cart', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       productId: 'REAL_PRODUCT_ID_FROM_DB',
       variantId: undefined,
       quantity: 1,
       action: 'add'
     })
   }).then(r => r.json()).then(console.log)
   ```

3. **Watch for Debug Logs**:
   - Browser: `[CART:ADD] Starting addItem`
   - Browser: `[CART:ADD] Response status: 200`
   - Terminal: `[API:CART:POST] ✓ Returning cart: {cartId, itemCount}`

---

## Issue #2: Stuck/Ghost Cart Item Cannot Be Deleted

### ROOT CAUSES IDENTIFIED ✅

#### **Cause 2A: variantId null vs undefined Mismatch**

**Location**: [app/api/cart/route.ts](app/api/cart/route.ts#L60-L70)

**Problem**:
The unique constraint in Prisma is:
```prisma
@@unique([cartId, productId, variantId])
```

When querying for deletion:
```typescript
// API receives variantId: null or undefined
await prisma.cartItem.deleteMany({
  where: {
    cartId: cart.id,
    productId,
    variantId: variantId || null  // ⚠️ Converts undefined to null
  }
});
```

**Issue**: If the CartItem was created with `variantId: undefined` but query uses `variantId: null`, the unique constraint match fails.

**Evidence**:
- PostgreSQL treats NULL differently in unique constraints
- Prisma might store `undefined` as `NULL` but query comparison may differ
- [prisma/schema.prisma#L383](prisma/schema.prisma#L383): `@@unique([cartId, productId, variantId])`

**Fix Required**:
```typescript
// Ensure consistent null handling
const normalizedVariantId = variantId === undefined || variantId === null ? null : variantId;

if (action === "remove") {
  await prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
      productId,
      variantId: normalizedVariantId
    }
  });
}
```

---

#### **Cause 2B: Invalid ProductId/VariantId in Stuck Item**

**Symptom**: Item shows in cart with `product: null` or `variant: null`

**Root Cause**: CartItem was created with:
- A `productId` that doesn't exist (due to Issue #1 Cause 1A)
- A `variantId` that doesn't match any ProductVariant (due to Issue #1 Cause 1B)

**Why it gets stuck**:
```prisma
// schema.prisma CartItem model
product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
variant ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
```

- If Product is deleted: `onDelete: Cascade` should delete CartItem
- If ProductVariant is deleted: `onDelete: SetNull` sets variantId to null
- BUT if Product/Variant never existed in the first place, relation is NULL from creation

**Result**: CartItem exists but has null relations, appears as "ghost item" in UI

**Fix Required**: Fix root causes 1A and 1B to prevent creation of invalid cart items

---

#### **Cause 2C: UI Not Refreshing After Remove**

**Potential Issue**: If API returns 200 but UI doesn't update, check:

**Location**: [hooks/use-enhanced-cart.ts](hooks/use-enhanced-cart.ts#L155-L180) removeItem function

**Verify**:
```typescript
if (res.ok) {
  const cart = await res.json();
  setDBCart(cart); // ✅ This should trigger re-render
}
```

**Debug**: Check if `dbCart` state is actually updating in React DevTools

---

### Verification Steps for Issue #2

1. **Identify Stuck Items**:
   ```javascript
   // Browser console
   fetch('/api/cart')
     .then(r => r.json())
     .then(cart => {
       cart.items.forEach(item => {
         if (!item.product || !item.product.id) {
           console.error('Ghost item found:', item);
         }
       });
     });
   ```

2. **Try Manual Removal**:
   ```javascript
   // Get stuck item's IDs from above, then:
   fetch('/api/cart', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       productId: 'STUCK_ITEM_PRODUCT_ID',
       variantId: null, // or the actual variantId
       quantity: 0,
       action: 'remove'
     })
   }).then(r => r.json()).then(console.log)
   ```

3. **Check Database**:
   ```sql
   -- Prisma Studio or psql
   SELECT ci.id, ci.productId, ci.variantId, p.name as productName, pv.sku as variantSku
   FROM "CartItem" ci
   LEFT JOIN "Product" p ON ci.productId = p.id
   LEFT JOIN "ProductVariant" pv ON ci.variantId = pv.id
   WHERE ci.cartId = 'YOUR_CART_ID';
   ```
   
   Look for rows where `productName` or `variantSku` is NULL.

---

## Issue #3: "Proceed to Payment" Does Nothing

### PRELIMINARY ANALYSIS

**Location**: [app/checkout/page.tsx](app/checkout/page.tsx#L140-L250)

**Expected Flow**:
```javascript
handleCheckoutSubmit()
  ↓ [CHECKOUT] Submitting with address: ...
  ↓ POST /api/checkout/create
  ↓ [CHECKOUT] Order created: orderId
  ↓ POST /api/checkout/stripe-session {orderId}
  ↓ [CHECKOUT] Redirecting to Stripe: https://...
  ↓ window.location.assign(url)
```

### Possible Root Causes (Need Browser Testing)

#### **Cause 3A: Form Validation Failure**

**Check**: Are all required fields filled?
- addressId
- shippingName
- shippingPhone
- acceptedTerms (must be true)
- acceptedDisclaimer (must be true)

**Debug**:
```typescript
// app/checkout/page.tsx
const handleCheckoutSubmit = async (formData: CheckoutFormData) => {
  console.log('[CHECKOUT] Form data:', formData); // ✅ Already has logging
  // ...
}
```

Watch browser console - if you don't see `[CHECKOUT] Submitting with address:`, validation is failing silently.

---

#### **Cause 3B: Empty Cart**

**Check**: Cart must have items for checkout to work

**Expected API Response** if cart is empty:
```json
{
  "error": "Cart is empty"
}
```

**Debug**:
```javascript
// Browser console - check cart before checkout
fetch('/api/cart').then(r => r.json()).then(console.log)
```

---

#### **Cause 3C: onClick Handler Not Wired**

**Location**: Check the "Proceed to Payment" button in checkout page

**Expected**:
```typescript
<Button onClick={handleCheckoutSubmit}>
  Proceed to Payment
</Button>
```

**Verify**: Search checkout page for button with onClick handler

---

#### **Cause 3D: API Errors Not Surfaced**

**Check browser console for**:
- `[CHECKOUT] Create order failed: {...}`
- `[CHECKOUT] Stripe session failed: {...}`

**Check terminal logs for**:
- `/api/checkout/create` errors
- `/api/checkout/stripe-session` errors

---

### Verification Steps for Issue #3

**IMPORTANT**: This requires browser testing with real cart data.

1. **Add items to cart** (using fixed components from Issues #1)
2. **Go to checkout page**
3. **Fill out all form fields**:
   - Select delivery address
   - Enter shipping name
   - Enter shipping phone
   - Check "Accept Terms"
   - Check "Accept Disclaimer"
4. **Open Browser DevTools Console**
5. **Open Browser DevTools Network Tab**
6. **Click "Proceed to Payment"**
7. **Watch for**:
   - Console logs: `[CHECKOUT] Submitting...`
   - Network requests: POST /api/checkout/create, POST /api/checkout/stripe-session
   - Any errors in console
   - Browser redirect to Stripe URL

---

## Minimal Fix Plan

### Priority 1: Fix ProductCard (Issue #1B)

**File**: [components/cards/ProductCard.tsx](components/cards/ProductCard.tsx#L21-L35)

**Change**:
```typescript
const handleAddToCart = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  try {
    // FIX: Don't pass productId as variantId
    // Use undefined if no variants, or select first variant
    const variantId = product.variants && product.variants.length > 0 
      ? product.variants[0].id 
      : undefined;
    
    await addItem(product.id, variantId, 1);
    toast({
      title: "Added to cart",
      description: `${product.name} added to your cart`,
    });
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to add item to cart",
      variant: "destructive",
    });
  }
};
```

### Priority 2: Fix ProductDetailWithVariants (Issue #1B)

**File**: [components/products/ProductDetailWithVariants.tsx](components/products/ProductDetailWithVariants.tsx#L33-L40)

**Verify** it's using `selectedVariantId` correctly (likely already correct, but check)

### Priority 3: Disable OfferingCard or Fix Data (Issue #1A)

**Option A**: Stop using OfferingCard until offerings use real Product IDs
**Option B**: Seed database with products that match offering IDs
**Option C**: Remove mock offerings and use only database products

### Priority 4: Fix variantId null handling (Issue #2A)

**File**: [app/api/cart/route.ts](app/api/cart/route.ts#L60-L70)

**Add at top of POST handler**:
```typescript
// Normalize variantId to handle null vs undefined consistently
const normalizedVariantId = variantId === undefined || variantId === null || variantId === '' 
  ? null 
  : variantId;

// Use normalizedVariantId in all queries instead of variantId
```

### Priority 5: Clean Up Ghost Items (Issue #2B)

**Manual cleanup** via Prisma Studio or SQL:
```sql
-- Find ghost items
SELECT ci.id, ci.productId, ci.variantId, p.name as productName
FROM "CartItem" ci
LEFT JOIN "Product" p ON ci.productId = p.id
WHERE p.id IS NULL;

-- Delete them
DELETE FROM "CartItem"
WHERE productId NOT IN (SELECT id FROM "Product");
```

### Priority 6: Debug Checkout (Issue #3)

**Requires browser testing** - can't fix without reproducing the issue with evidence.

**Next step**: Test in browser with debug logs enabled, capture:
- Console logs
- Network request/response
- Exact error messages

---

## Files Modified for Debug Logging

✅ [hooks/use-enhanced-cart.ts](hooks/use-enhanced-cart.ts) - Added comprehensive client-side logging  
✅ [app/api/cart/route.ts](app/api/cart/route.ts) - Added server-side API logging  
✅ [app/checkout/page.tsx](app/checkout/page.tsx) - Already has checkout logging  

---

## Testing Checklist

### Before Applying Fixes
- [ ] Identify a valid Product ID from database (via Prisma Studio)
- [ ] Try adding that product via API curl/fetch
- [ ] Confirm it fails OR succeeds (establish baseline)

### After Applying Fixes
- [ ] Test ProductCard "Add to Cart" button
- [ ] Verify cart item appears in UI
- [ ] Verify cart item has valid product relation
- [ ] Test removing item from cart
- [ ] Verify item is removed from UI and DB
- [ ] Test checkout flow end-to-end
- [ ] Verify Stripe redirect happens

---

## Summary

| Issue | Root Cause | Status | Fix Complexity |
|-------|-----------|--------|----------------|
| #1A: Add to cart (OfferingCard) | Mock data has invalid Product IDs | ✅ Identified | MEDIUM - requires data fix |
| #1B: Add to cart (ProductCard) | Wrong variantId passed | ✅ Identified | LOW - simple code change |
| #1C: Silent errors | Errors not thrown to UI | ✅ FIXED | DONE |
| #2A: Can't delete items | null vs undefined variantId | ✅ Identified | LOW - add normalization |
| #2B: Ghost items | Invalid foreign keys | ✅ Identified | LOW - cleanup + prevent |
| #2C: UI not updating | State update issue | ⚠️ Possible | Need browser test |
| #3: Checkout redirect | Multiple possible causes | ⚠️ Needs testing | TBD - need evidence |

**Next Required Action**: Apply Priority 1-2 fixes, then test in browser to verify and diagnose Issue #3.
