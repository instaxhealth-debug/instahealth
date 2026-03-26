# Test Credentials for Shopify App Review

**IMPORTANT:** These credentials are REQUIRED for Shopify App Store review.
Provide these in the "Notes for Reviewer" section when submitting.

---

## Test Shopify Development Store

**Store URL:** [TO BE CREATED]
**Admin Login:** https://[your-test-store].myshopify.com/admin

**Admin Credentials:**
- Email: [CREATE TEST STORE AND ADD HERE]
- Password: [ADD HERE]

**Test Products:**
- 5-10 test products should be added to the store
- Include products with variants
- Include products with images
- Include products with different inventory levels

---

## InstaHealth Vendor Test Account

**Vendor Dashboard:** https://instahealth.ae/vendor/dashboard

**Test Account Credentials:**
- Email: shopify-test@instahealth.ae
- Password: [CREATE ACCOUNT AND ADD PASSWORD HERE]

**Account Setup:**
- Complete vendor profile
- Add business information
- Set up payment details (if required)

---

## Test Flow for Reviewers

### Option 1: Install from Shopify App Store (Recommended)

1. Log into the test Shopify development store
2. Navigate to Apps → App Store
3. Search for "InstaHealth" (or use direct install URL if provided)
4. Click "Install"
5. Authorize the app with the requested permissions
6. App should redirect to InstaHealth integration page
7. Create InstaHealth account or log in with test credentials above
8. Link Shopify store to InstaHealth vendor account
9. Products should begin syncing automatically
10. Verify synced products in vendor dashboard

### Option 2: Install from Vendor Dashboard

1. Log into InstaHealth vendor dashboard with test credentials above
2. Navigate to Integrations → Shopify
3. Click "Connect Shopify Store"
4. Enter shop domain: [your-test-store].myshopify.com
5. Click "Connect"
6. Log into Shopify admin (use credentials above)
7. Authorize the app
8. Return to InstaHealth dashboard
9. Verify products are syncing

---

## What Reviewers Should See

### After Installation:
- ✅ App appears in Shopify admin under Apps
- ✅ OAuth authorization completes successfully
- ✅ Redirect to InstaHealth app page (`/shopify`)
- ✅ Success message displayed
- ✅ Products begin syncing automatically

### Product Sync:
- ✅ All test products appear in sync queue
- ✅ Products sync with correct data (title, price, variants, images)
- ✅ Inventory levels match Shopify
- ✅ Products marked as "from Shopify" in InstaHealth

### Webhooks:
- ✅ Mandatory compliance webhooks registered
- ✅ Product sync webhooks registered
- ✅ Real-time updates when products change in Shopify

### Disconnect:
- ✅ Disconnect button available in vendor dashboard
- ✅ Disconnecting removes access token
- ✅ Webhooks cleaned up
- ✅ Products marked as inactive (optional: keep products setting)

---

## Known Limitations / Expected Behavior

1. **Geographic Focus:** App is designed for UAE marketplace (InstaHealth)
2. **Product Types:** Syncs all product types, but health-related products work best
3. **Pricing:** App is FREE, no charges or subscription fees
4. **Support:** Email support at info@instahealth.ae

---

## Troubleshooting for Reviewers

### If OAuth Fails:
- Verify shop parameter is correct (.myshopify.com domain)
- Check that redirect URLs are whitelisted in app configuration
- Try reinstalling from scratch

### If Products Don't Sync:
- Check Shopify access token is valid (in vendor settings)
- Verify products exist in Shopify store
- Check webhook registration status
- View sync logs in vendor dashboard

### If Embedded App Doesn't Load:
- Verify iframe embedding is allowed
- Check browser console for errors
- Try hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

---

## Support During Review

If reviewers encounter any issues during testing:

**Email:** info@instahealth.ae
**Subject:** "[SHOPIFY REVIEW] Issue with app testing"

We monitor this inbox during business hours (UAE time: UTC+4) and will respond within 24 hours.

---

**Last Updated:** March 26, 2026
**App Version:** 1.0.0
**Contact:** info@instahealth.ae
