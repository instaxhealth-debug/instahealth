# End-to-End Test Checklist

## Pre-Test Setup ✅
- [x] Database seeded with test data (run `npx ts-node scripts/seed-test-e2e.ts`)
- [x] Test user: test@instahealth.com / password123
- [x] 2 Vendors: InstaPepz, MediPro
- [x] Product A: BPC-157 Injectable (InstaPepz) with 5mg variant @ 200 AED
- [x] Product B: Glutathione IV Drip (MediPro) @ 150 AED

## Test Flow

### Phase 1: Cart & Checkout
- [ ] 1.1. Login as test@instahealth.com
- [ ] 1.2. Navigate to /marketplace/peptides
- [ ] 1.3. Find BPC-157 Injectable product
- [ ] 1.4. Click product to view details
- [ ] 1.5. Select 5mg variant (should show 200 AED)
- [ ] 1.6. Add to cart
- [ ] 1.7. Navigate to /marketplace/iv-drips
- [ ] 1.8. Find Glutathione IV Drip
- [ ] 1.9. Add to cart (150 AED)
- [ ] 1.10. Go to cart (/cart)
- [ ] 1.11. Verify cart shows:
  - BPC-157 Injectable (5mg) @ 200 AED
  - Glutathione IV Drip @ 150 AED
  - **Total: 350 AED**

### Phase 2: Stripe Checkout
- [ ] 2.1. Click "Proceed to Checkout"
- [ ] 2.2. Accept terms & disclaimers
- [ ] 2.3. Click "Pay with Stripe"
- [ ] 2.4. Redirected to Stripe Checkout
- [ ] 2.5. Fill payment details:
  - Card: `4242 4242 4242 4242`
  - Expiry: Any future date
  - CVC: Any 3 digits
  - Name: Test User
  - Email: test@instahealth.com
- [ ] 2.6. Complete payment
- [ ] 2.7. Redirected to /checkout/success

### Phase 3: Order Verification (Admin)
- [ ] 3.1. Login as admin (or check admin user exists)
- [ ] 3.2. Navigate to /admin/orders
- [ ] 3.3. Find the new order (most recent)
- [ ] 3.4. Verify order status: **PAID** (webhook worked)
- [ ] 3.5. Click order to view details
- [ ] 3.6. Verify Order Items:
  - **Item 1 (InstaPepz):**
    - Product: BPC-157 Injectable
    - Variant: 5mg
    - Unit Price: **200.00 AED (20000 fils)**
    - Variant snapshot fields populated (variantSku, variantStrength, variantPriceFils)
  - **Item 2 (MediPro):**
    - Product: Glutathione IV Drip
    - Unit Price: **150.00 AED (15000 fils)**
    - No variant fields
- [ ] 3.7. Verify total: **350.00 AED (35000 fils)**
- [ ] 3.8. Check Stripe receipt in Stripe Dashboard matches 350 AED

### Phase 4: Vendor Fulfillment
- [ ] 4.1. On order detail page, mark InstaPepz item as fulfilled
- [ ] 4.2. Verify order status changes to **FULFILLING**
- [ ] 4.3. Mark MediPro item as fulfilled
- [ ] 4.4. Verify order status changes to **FULFILLED**
- [ ] 4.5. Check fulfillment timestamps are set

### Phase 5: Payouts
- [ ] 5.1. Navigate to /admin/payouts
- [ ] 5.2. Verify "Owed Amounts" section shows:
  - **InstaPepz: 200.00 AED** (from fulfilled BPC-157 5mg variant)
  - **MediPro: 150.00 AED** (from fulfilled Glutathione)
- [ ] 5.3. Click "Mark as Paid" for InstaPepz
- [ ] 5.4. Create payout record (status: PAID)
- [ ] 5.5. Verify InstaPepz no longer shows in "Owed"
- [ ] 5.6. Verify InstaPepz appears in "Payout History" with 200 AED
- [ ] 5.7. Click "Mark as Paid" for MediPro
- [ ] 5.8. Verify both vendors have been paid
- [ ] 5.9. Check VendorPayout table in database:
  - [ ] Two records exist
  - [ ] InstaPepz payout: 20000 fils, status PAID
  - [ ] MediPro payout: 15000 fils, status PAID

## Key Validation Points ✅

### Variant Pricing
- [ ] Cart shows variant price (200 AED), not base product price
- [ ] Stripe checkout amount is 350 AED total
- [ ] OrderItem.unitPriceFils = 20000 (variant price in fils)
- [ ] OrderItem.variantPriceFils = 20000 (snapshot)

### Webhooks
- [ ] Order status changes from PENDING_PAYMENT to PAID automatically
- [ ] stripePaymentIntentId is populated

### Multi-Vendor Logic
- [ ] Two separate OrderItems with different vendorIds
- [ ] Order status transitions: PENDING_PAYMENT → PAID → FULFILLING → FULFILLED
- [ ] Payouts calculated per vendor based on fulfilled items only

### Snapshot Data
- [ ] Product names stored in OrderItem (productName)
- [ ] Variant details stored (variantSku, variantStrength, variantUnitSize, variantPriceFils)
- [ ] Even if product/variant is deleted later, order preserves snapshot

## Test Result Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Cart & Checkout | ⬜ | |
| Stripe Payment | ⬜ | |
| Order Verification | ⬜ | |
| Vendor Fulfillment | ⬜ | |
| Payouts | ⬜ | |

**Overall Result:** ⬜ PASS / ⬜ FAIL

**Key Numbers to Confirm:**
- Variant price charged: **200 AED**
- Total charged: **350 AED**
- InstaPepz payout: **200 AED**
- MediPro payout: **150 AED**
