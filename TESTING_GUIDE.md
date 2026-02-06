# 🎯 MANUAL TESTING GUIDE
## Steps 1, 2, 3 — Cart Badge + Checkout Button

---

## QUICK START

**Dev Server Status:** ✅ Running at http://localhost:3000

```bash
# If server is not running:
cd "/Users/cruzfrangieh/Desktop/instaxhealth website"
npm run dev
```

**Expected Output:**
```
✓ Next.js 14.2.35
✓ Local:        http://localhost:3000
✓ Ready in 1165ms
```

---

## TEST #1: HEADER CART BADGE UPDATES IN REAL-TIME ✅

### What We Fixed
Header now subscribes to cart state changes via `useEffect([getTotalItems])`. When cart updates, badge updates instantly without page refresh.

### Desktop Test

**Steps:**
1. Open http://localhost:3000 in browser
2. **Verify:** You see InstaHealth marketplace with search bar
3. Search for any product (e.g., "vitamin", "protein")
4. Click on product to view details
5. Click **"Add to Cart"** button
6. **✅ EXPECTED:** 
   - Cart icon in header shows badge with "1"
   - Badge appears immediately (no delay)
   - No page refresh occurs
7. Click "Add to Cart" again (on same product or different)
8. **✅ EXPECTED:** Badge updates to "2" instantly
9. Repeat adding items until count reaches 5-9
10. **✅ EXPECTED:** Badge shows count (e.g., "5")
11. Add 15+ items total
12. **✅ EXPECTED:** Badge shows "9+" (caps at 9+)

### Mobile Test

**Steps:**
1. Open http://localhost:3000 in mobile view (or resize browser to ~375px width)
2. Search for product and click "Add to Cart"
3. **✅ EXPECTED:** 
   - Badge appears on cart icon in **bottom navigation bar**
   - Shows "1"
   - Updates instantly
4. Add more items
5. **✅ EXPECTED:** Badge updates to "2", "3", etc. in real-time

### What You Should NOT See (Red Flags 🚩)
- ❌ Badge stays at "0" until page refresh
- ❌ Stale count (e.g., shows "1" when you added 3 items)
- ❌ Delay before badge updates (>500ms)
- ❌ Page reloads when adding to cart

---

## TEST #2: PROCEED TO CHECKOUT BUTTON ✅

### What We Verified
Checkout button uses proper event handling (`e.preventDefault()`, `e.stopPropagation()`) and navigates with `router.push("/checkout")` (no page reload).

### Positive Case: Valid Checkout

**Steps:**
1. From Test #1, you should have items in cart
2. Click **cart icon** in header (top right)
3. **✅ EXPECTED:** Navigates to `/cart` page
4. Page shows list of items in cart
5. Scroll down to "Order Summary" card
6. Click **"Proceed to Checkout"** button
7. **✅ EXPECTED:**
   - URL changes to `http://localhost:3000/checkout`
   - **NO page reload** (smooth transition)
   - Checkout page loads with form fields
8. You should see checkout form with:
   - Order summary
   - Delivery address fields
   - Payment method selection
   - "Complete Order" button

### Negative Case: Empty Cart

**Steps:**
1. **Clear your cart completely:**
   - Go to `/cart`
   - Click trash icon on each item to remove
   - Continue until cart shows "Your cart is empty"
2. Click **"Proceed to Checkout"** button (if visible)
3. **OR** use browser console:
   ```javascript
   localStorage.removeItem('cart');
   location.reload();
   ```
   Then try checkout
4. **✅ EXPECTED:**
   - **Toast notification appears** at top/bottom of page
   - Message: "Cart is empty - Add some items to your cart before proceeding to checkout"
   - NO navigation occurs
   - You stay on `/cart` page

### What You Should NOT See (Red Flags 🚩)
- ❌ Page reloads when clicking button
- ❌ "Proceed to Checkout" does nothing (button appears to not work)
- ❌ Navigation to wrong URL
- ❌ Error in browser console: "Cannot read property 'push' of undefined"
- ❌ No validation for empty cart

---

## TEST #3: VERIFY DATABASE & MIGRATIONS ✅

### What We Confirmed
All 11 migrations applied to Neon, including `20260205225500_add_vendorid_to_cartitem`.

**Steps:**
1. Open terminal in VS Code
2. Run:
   ```bash
   cd "/Users/cruzfrangieh/Desktop/instaxhealth website"
   npx prisma migrate status
   ```
3. **✅ EXPECTED OUTPUT:**
   ```
   Datasource "db": PostgreSQL database "neondb"...
   11 migrations found in prisma/migrations
   Database schema is up to date!  ← KEY PHRASE
   ```

If you see this, database gate is passed. ✅

---

## BONUS TEST: DEBUG LOGGING

Enable detailed cart operation logging:

**Steps:**
1. In terminal, run:
   ```bash
   export NEXT_PUBLIC_DEBUG_CART=true
   npm run dev
   ```
2. Open http://localhost:3000
3. Open browser DevTools (F12 or Cmd+Option+I)
4. Go to **Console** tab
5. Add item to cart
6. **✅ EXPECTED:** See logs like:
   ```
   [CART] Proceed to checkout clicked
   [CART:UI] refreshCart called
   [CART:API] response OK
   ```
7. Click "Proceed to Checkout"
8. **✅ EXPECTED:** See:
   ```
   [CART] Proceed to checkout clicked
   [CART] Navigating to /checkout
   ```

---

## TESTING MATRIX

| Scenario | Expected Result | Status |
|----------|-----------------|--------|
| Add item to cart | Header badge shows count | ✅ Test #1 |
| Add multiple items | Badge increments instantly | ✅ Test #1 |
| Badge shows 9+ | Count capped at "9+" after 9 items | ✅ Test #1 |
| Mobile badge | Bottom nav badge updates | ✅ Test #1 |
| Click "Proceed to Checkout" | Navigate to /checkout (no reload) | ✅ Test #2 |
| Empty cart + checkout | Toast appears, no navigation | ✅ Test #2 |
| Migrations applied | "Database schema is up to date!" | ✅ Test #3 |

---

## TROUBLESHOOTING

### Issue: Badge shows "0" after adding items

**Cause:** Header not re-rendering when cart changes

**Fix:** 
```bash
# Restart dev server:
npx prisma generate
npm run dev
```

Then test again.

---

### Issue: Checkout button does nothing

**Cause:** Event handler not firing or router not working

**Fix:**
1. Check browser console (F12) for errors
2. Enable debug logging:
   ```bash
   export NEXT_PUBLIC_DEBUG_CART=true
   npm run dev
   ```
3. Look for `[CART] Proceed to checkout clicked` in console
4. If not there: button click isn't firing
5. If log appears but no navigation: router issue

---

### Issue: Empty cart validation doesn't work

**Cause:** Toast component not imported/working

**Fix:**
```bash
# Check CartView.tsx imports:
grep "useToast" components/cart/CartView.tsx
# Should see: import { useToast } from "@/hooks/use-toast";
```

---

## SIGN-OFF CHECKLIST

After running all tests, verify:

- [ ] ✅ Test #1 passed: Badge updates in real-time
- [ ] ✅ Test #2 passed: Checkout button navigates
- [ ] ✅ Test #2 passed: Empty cart validation works
- [ ] ✅ Test #3 passed: Database migrations are current
- [ ] ✅ No console errors (F12)
- [ ] ✅ No TypeScript errors
- [ ] ✅ No page reloads on cart add/checkout
- [ ] ✅ Mobile responsive (tested at 375px width)

---

## FINAL DEPLOYMENT

Once all tests pass:

```bash
# Commit changes
git add .
git commit -m "fix: Real-time cart badge updates + verify checkout button

- Added useEffect subscription in Header.tsx for instant badge updates
- Verified CartView checkout button handler is correct
- All 11 migrations confirmed applied to Neon database
- Tests: cart badge, checkout navigation, empty cart validation

STEP 1: Database gate PASSED (migrations up to date)
STEP 2: Cart badge FIXED (useEffect subscription added)
STEP 3: Checkout button VERIFIED (no changes needed)
"

# Push to production
git push origin main

# Vercel will auto-deploy
```

---

## DOCUMENTS REFERENCE

| Document | Purpose |
|----------|---------|
| [FINAL_REPORT.md](FINAL_REPORT.md) | Executive summary |
| [STEP_1_2_3_COMPLETION_REPORT.md](STEP_1_2_3_COMPLETION_REPORT.md) | Detailed technical report |
| [DATABASE_SCHEMA_STATE_DIAGNOSIS.md](DATABASE_SCHEMA_STATE_DIAGNOSIS.md) | Database analysis |
| [VERIFY_FIXES.sh](VERIFY_FIXES.sh) | Automated verification script |

---

**Last Updated:** 2026-02-06  
**Server:** http://localhost:3000 ✅ Running  
**Status:** Ready for Testing

