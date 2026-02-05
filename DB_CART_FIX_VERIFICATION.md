# DB-Backed Cart System - Verification Guide

## Overview
The cart system has been refactored to use the database as the single source of truth for authenticated users, eliminating the mismatch where the UI showed items but checkout didn't see them.

## Key Changes

### 1. **Components Updated to Use `useEnhancedCart` Hook**
- ✅ `components/products/ProductDetailWithVariants.tsx` - Uses enhanced cart for add-to-cart
- ✅ `components/marketplace/OfferingCard.tsx` - Uses enhanced cart for quick add
- ✅ `components/cards/ProductCard.tsx` - Uses enhanced cart for listings
- ✅ `components/pepz/ProductDetail.tsx` - Uses enhanced cart for pepz products
- ✅ `components/cart/CartView.tsx` - Shows items from DB cart when authenticated
- ✅ `app/checkout/page.tsx` - Reads cart from DB via enhanced hook

### 2. **API Routes Enhanced**
- ✅ `/api/cart/route.ts` - Improved action handling (add/update/remove)
  - Fixed quantity validation
  - Proper merge behavior on add (accumulates quantities)
  - Update action for changing quantities
  - Remove action for deleting items
- ✅ `/api/checkout/create/route.ts` - Enhanced debug logging
  - Logs userId
  - Logs cart item count
  - Logs totalFils
  - Debug DB cart check if empty

### 3. **Guest-to-User Merge**
- ✅ `hooks/use-enhanced-cart.ts` - Already supports guest merge
  - Detects login (session status changes to "authenticated")
  - Calls `mergeGuestCart()` which posts to `/api/cart/merge`
  - Clears local localStorage after merge
  - Loads user's DB cart

### 4. **Location Handling**
- ✅ Cart page shows items regardless of location selection
- ✅ Location only enforced at checkout (if required)
- ✅ Cart model has `locationId` field but not required for viewing

## Architecture

```
User adds product → ProductDetailWithVariants (useEnhancedCart)
                   ↓
        POST /api/cart (productId, variantId, quantity, action: "add")
                   ↓
        API creates/gets user's cart, adds CartItem to DB
                   ↓
        Returns updated cart with all items
                   ↓
        Hook updates state (dbCart)
                   ↓
        Item appears in CartView (reads from dbCart.items)
                   ↓
        User goes to checkout → Reads items from /api/checkout/create
                   ↓
        Checkout API calls getCartWithProducts(userId)
                   ↓
        Returns same items from DB
                   ↓
        Order created successfully ✓
```

## Test Scenarios

### Test 1: Add Item → Refresh → Item Persists
1. Login to site
2. Go to product page (e.g., `/marketplace/peptides`)
3. Click "Add to Cart"
4. **Expected**: Toast shows "Added to cart"
5. Refresh page (Cmd+R)
6. **Expected**: Item still visible in cart badge/page
7. Go to `/cart`
8. **Expected**: Item visible in cart with quantity, price
9. Check browser DevTools → Network → POST `/api/cart` was called
10. **Verify**: Response shows `items: [{...}]` in the cart

### Test 2: Checkout Creates Order
1. After adding items, go to `/checkout`
2. **Expected**: Cart summary shows items
3. Fill in shipping form (name, phone, address)
4. Check "Accept Terms" and "Product Disclaimer"
5. Click "Proceed to Payment"
6. **Expected**: Redirect to Stripe Checkout page
7. Check browser console: `[CHECKOUT] Redirecting to Stripe:`
8. Check terminal output: `[CHECKOUT:CREATE] ✓ Cart has X items, total: Y fils`

### Test 3: Guest → Login → Cart Persists
1. Logout if logged in
2. Go to product page
3. Add product to cart (goes to localStorage)
4. **Expected**: CartView shows item (from localStorage)
5. Login (click Login, use test account)
6. **Expected**: After redirect, CartView shows same item
7. Check terminal: `[MERGE CART]` should log
8. Go to another page and back to `/cart`
9. **Expected**: Item still there
10. Verify in Prisma that CartItem exists in DB

### Test 4: Multiple Variants
1. Go to product with variants (e.g., different strengths)
2. Select a variant
3. Add to cart
4. Go back, select different variant
5. Add to cart again
6. Go to `/cart`
7. **Expected**: 2 line items showing (one for each variant)
8. Update quantity of one variant
9. **Expected**: Only that variant's quantity changes
10. Verify in DB: 2 CartItem rows with different variantIds

### Test 5: Update Quantity in Cart
1. Add item to cart
2. Go to `/cart`
3. Click "+" to increase quantity
4. **Expected**: Quantity updates immediately
5. Click "-" to decrease
6. **Expected**: Quantity decreases, or item removed if quantity → 0
7. Check network: PATCH/POST to `/api/cart` with `action: "update"`

## Debug Commands

### Check Cart in Database
```bash
# Login and get session, then run in browser console:
fetch('/api/cart').then(r => r.json()).then(console.log)
```

### Check Order Creation
```bash
# After checkout, check if order exists:
SELECT * FROM "Order" WHERE "userId" = '<user-id>' ORDER BY "createdAt" DESC;
SELECT * FROM "CartItem" WHERE "cartId" = '<cart-id>';
```

### Enable Debug Logging
```bash
DEBUG_CHECKOUT=true npm run dev
```

When enabled, terminal will show:
```
[CHECKOUT:CREATE] User ID: user_abc123
[CHECKOUT:CREATE] Cart data retrieved: { found: true, itemCount: 2, totalFils: 150000 }
[CHECKOUT:CREATE] ✓ Cart has 2 items, total: 150000 fils
```

## Expected Log Output

### When Adding Item to Cart (Dev Server Console)
```
✓ Compiled /api/cart in XXms
POST /api/cart 200
```

### When Proceeding to Checkout (Dev Server Console)
```
[CHECKOUT:CREATE] Session: ✓ Authenticated
[CHECKOUT:CREATE] User ID: clx...
[CHECKOUT:CREATE] Shipping data: { name: '✓', phone: '✓', line1: '✓', ... }
[CHECKOUT:CREATE] ✓ Found saved address: cml9799zq0001kz04l8fwwx2q
[CHECKOUT:CREATE] Cart data retrieved: { found: true, itemCount: 3, totalFils: 450000 }
[CHECKOUT:CREATE] ✓ Cart has 3 items, total: 450000 fils
[CHECKOUT:CREATE] ✓ Order created: ord_...
POST /api/checkout/create 200
```

### If Cart Is Empty (Error Case)
```
[CHECKOUT:CREATE] Cart data retrieved: { found: false, itemCount: 0 }
[CHECKOUT:CREATE] DB Cart check: { exists: false, items: 0 }
[CHECKOUT:CREATE] ✗ Rejected: Cart is empty
POST /api/checkout/create 400
```

## Files Modified

### Core Components
- `components/products/ProductDetailWithVariants.tsx`
- `components/marketplace/OfferingCard.tsx`
- `components/cards/ProductCard.tsx`
- `components/pepz/ProductDetail.tsx`
- `components/cart/CartView.tsx`
- `app/checkout/page.tsx`

### API Routes
- `app/api/cart/route.ts` - Enhanced action handling
- `app/api/checkout/create/route.ts` - Better debug logging

### Hooks (Pre-existing, now utilized)
- `hooks/use-enhanced-cart.ts` - Main hook for DB-backed cart

## Rollback Plan

If issues arise, the changes are backwards compatible:
1. Components will fall back to `useCartStore` (localStorage) for guests
2. Database cart items are non-destructive (can be pruned)
3. Original `useCartStore` still works for legacy code

## Troubleshooting

### "Cart is empty" on checkout but items are visible
1. Check if user is logged in: `useSession()` should show user
2. Check if `/api/cart` returns items: `fetch('/api/cart').then(r => r.json()).then(console.log)`
3. Verify user has cart in DB: Check `prisma.cart.findUnique({ where: { userId: session.user.id } })`
4. Check if items are in CartItem table: `SELECT * FROM "CartItem" WHERE "cartId" = '...'`

### Cart summary shows wrong total
1. Check `getTotalPrice()` calculation in hook
2. Verify `unitPriceFils` is set correctly on CartItem
3. Ensure prices are stored in fils (1 AED = 100 fils)

### Items not persisting after refresh
1. Check if items are actually in DB: Query CartItem table
2. Check if `/api/cart` is being called on page load
3. Verify `useEnhancedCart` is properly used (not `useCartStore`)

### Merge not working (guest items lost after login)
1. Check `/api/cart/merge` endpoint exists and works
2. Verify guest cart items are in localStorage before login
3. Check if merge is called: Look for `[MERGE CART]` log in console

## Success Criteria

✅ Add item → Item appears in cart UI → Item visible after refresh
✅ Add item → Checkout shows item → Order created
✅ Guest adds item → Login → Item persists in DB
✅ Multiple variants → Each variant tracked separately
✅ Update quantity → Reflects in UI and DB
✅ Debug logs show correct user ID, item count, total price
