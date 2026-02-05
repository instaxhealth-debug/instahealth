# STRIPE CHECKOUT - QUICK TEST GUIDE

## TL;DR: What Was Fixed

| Issue | Fix | Impact |
|-------|-----|--------|
| `NEXTAUTH_URL=http://www.https://...` | → `http://localhost:3000` | ✅ Auth warnings gone |
| No `NEXT_PUBLIC_BASE_URL` | → Added to `.env.local` | ✅ Stripe redirects work |
| No debug logging on 400 errors | → Added comprehensive logs | ✅ Can now debug failures |
| Weak client error handling | → Added logging + better errors | ✅ Clear error messages |

---

## MANUAL TEST PROCEDURE (5 mins)

### Step 1: Start Dev Server
```bash
cd "/Users/cruzfrangieh/Desktop/instaxhealth website"
DEBUG_CHECKOUT=true npm run dev
```
✅ Server should start at `http://localhost:3000`

### Step 2: Add Product to Cart
1. Go to: `http://localhost:3000/marketplace/peptides`
2. Click any product (e.g., "Global Peptide Mix")
3. Click "Add to Cart"

### Step 3: Go to Checkout
1. Click cart icon in header
2. Click "Proceed to Checkout"
3. Form should pre-fill with:
   - ✅ Default address auto-selected
   - ✅ NO red error banner (this was the bug!)
   - ✅ Name/phone fields empty (user fills these)

### Step 4: Fill Form
```
Full Name: Test User
Phone: +971501234567
Address: (auto-selected)
☑ I accept the terms and conditions
☑ I accept the product disclaimer
```

### Step 5: Click "Proceed to Payment"

**CHECK BROWSER CONSOLE** (F12 → Console):
```
[CHECKOUT] Submitting with address: addr_abc123
[CHECKOUT] Shipping payload: { name: "Test User", phone: "+971501234567", ... }
[CHECKOUT] Order created: order_xyz789
[CHECKOUT] Redirecting to Stripe: https://checkout.stripe.com/...
```

**CHECK TERMINAL** where dev server is running:
```
[CHECKOUT:CREATE] Session: ✓ Authenticated
[CHECKOUT:CREATE] Request body keys: [...]
[CHECKOUT:CREATE] Shipping data: { name: ✓, phone: ✓, line1: ✓, terms: ✓ }
[CHECKOUT:CREATE] ✓ Found saved address: addr_abc123
[CHECKOUT:CREATE] ✓ Cart has 1 items, total: 75000 fils
[CHECKOUT:CREATE] ✓ Order created: order_xyz789

[STRIPE:SESSION] Session: ✓ Authenticated
[STRIPE:SESSION] Order ID: order_xyz789
[STRIPE:SESSION] ✓ Stripe session created: cs_test_abc123
[STRIPE:SESSION] ✓ Order updated with session ID
```

### Step 6: Verify Stripe Redirect
✅ Should redirect to: `https://checkout.stripe.com/pay/cs_test_...`

If you see Stripe checkout page → **SUCCESS!** 🎉

---

## TROUBLESHOOTING

### "POST /api/checkout/create 400"

**Check Terminal Logs** for which validation failed:

| Log | Meaning | Fix |
|-----|---------|-----|
| `Session: ✗ No session` | Not logged in | Go to /login first |
| `Shipping data: { name: ✗, ...` | Name is empty | Fill "Full Name" field |
| `Shipping data: { ..., phone: ✗, ...` | Phone is invalid | Use UAE format: +971XXXXXXXXX |
| `Address not found` | AddressId doesn't exist | Auto-select or add new address |
| `Cart is empty` | No items in cart | Add product first |
| `Terms: ✗` | Not accepted | Check both checkboxes |

### "Auth mismatch warning still shows"

Make sure `.env.local` has:
```env
NEXTAUTH_URL=http://localhost:3000
```

Then restart dev server:
```bash
^C  # Kill server
DEBUG_CHECKOUT=true npm run dev
```

### "Stripe redirect not happening"

Check terminal for Stripe session creation:
```
[STRIPE:SESSION] ✓ Stripe session created: cs_test_...
```

If not present, check logs for "ORDER_NOT_FOUND" or "ORDER_NOT_PAYABLE"

---

## PRODUCTION DEPLOYMENT

For Vercel:
1. Set env vars in Vercel dashboard:
   ```env
   NEXTAUTH_URL=https://instahealth.ae
   NEXT_PUBLIC_BASE_URL=https://instahealth.ae
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. Optional: Enable debug logs in production:
   ```env
   DEBUG_CHECKOUT=true
   ```
   (Logs will appear in Vercel → Logs)

3. Deploy:
   ```bash
   git push origin main
   ```

---

## DEBUG LOGGING - HOW TO READ

### Enable (Local)
```bash
DEBUG_CHECKOUT=true npm run dev
```

### Disable (Local)
```bash
npm run dev  # DEBUG_CHECKOUT not set
```

### Production (Vercel)
- Check Vercel dashboard → Logs
- Filter for `[CHECKOUT:` or `[STRIPE:`
- Set `DEBUG_CHECKOUT=true` in environment to enable

### What Each Line Means

```
✓ = Success, field valid
✗ = Failure, field invalid/missing
→ = Action performed
[PREFIX] = Which API/phase (CREATE, SESSION)
```

Example:
```
[CHECKOUT:CREATE] Shipping data: { name: ✓, phone: ✗, line1: ✓, terms: ✓ }
                                  ↑ Valid    ↑ INVALID  ↑ Valid  ↑ Valid
```

---

## SUCCESS CRITERIA ✅

After fix, you should see:

1. **On Page Load**:
   - ✅ NO red error banner
   - ✅ Default address already selected
   - ✅ Form ready to fill

2. **On Submit (with valid data)**:
   - ✅ No validation errors shown
   - ✅ `[CHECKOUT:CREATE]` logs in terminal show all ✓
   - ✅ `[STRIPE:SESSION]` logs show session created
   - ✅ Browser redirects to Stripe

3. **On Submit (with invalid data, e.g., empty phone)**:
   - ✅ Phone error shows in UI
   - ✅ Terminal log shows: `Shipping data: { ..., phone: ✗, ...}`
   - ✅ No Stripe redirect (form remains on checkout)

---

## FILES CHANGED

```
✅ .env.local
   - NEXTAUTH_URL fixed
   - NEXT_PUBLIC_BASE_URL added

✅ app/api/checkout/create/route.ts
   - Debug logging added
   - Error codes improved

✅ app/api/checkout/stripe-session/route.ts
   - Debug logging added
   - Error codes improved

✅ app/checkout/page.tsx
   - Client logging added
   - Error handling improved
```

---

**Status**: Ready for testing! Dev server running at http://localhost:3000
