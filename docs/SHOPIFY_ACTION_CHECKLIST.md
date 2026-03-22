# InstaHealth Shopify Production - Action Checklist

## ✅ BACKEND STATUS

**CONFIRMED:**
- ✅ OAuth flow supports dynamic shop installs (`/api/shopify/connect?shop=STORE.myshopify.com`)
- ✅ Vendor tokens stored per-vendor (isolated in `Vendor` table)
- ✅ Sync state stored per-vendor (no shared state)
- ✅ Webhook routing automatic (by shop domain)
- ✅ Product data isolated (scoped by `vendorId`)
- ✅ Security correct (per-vendor nonces, HTTPS)

**NO CODE CHANGES NEEDED** for multi-vendor distribution.

---

## 🚀 WEEK 1: GO LIVE (Unlisted Distribution)

### Day 1: Shopify Dashboard Configuration (30 min)

- [ ] Log into Shopify Partner Dashboard
- [ ] Navigate to Apps → Your App → Distribution
- [ ] Change from "Custom" to **"Unlisted"**
- [ ] Save

- [ ] Go to App Setup → URLs
- [ ] Set App URL: `https://instahealth.ae/vendor/dashboard`
- [ ] Set Redirect URL: `https://instahealth.ae/api/shopify/callback`
- [ ] Add Dev Redirect: `http://localhost:3000/api/shopify/callback`
- [ ] Save

- [ ] Go to App Setup → Webhooks
- [ ] Add webhook: `products/create` → `https://instahealth.ae/api/shopify/webhooks`
- [ ] Add webhook: `products/update` → `https://instahealth.ae/api/shopify/webhooks`
- [ ] Add webhook: `products/delete` → `https://instahealth.ae/api/shopify/webhooks`
- [ ] Add webhook: `app/uninstalled` → `https://instahealth.ae/api/shopify/webhooks`
- [ ] Save

- [ ] Go to Overview
- [ ] Copy Client ID
- [ ] Copy Client Secret (click "Show")
- [ ] Copy Webhook Signing Secret

### Day 1: Environment Variables (10 min)

- [ ] Add to production (Vercel/Netlify):
  ```
  NEXT_PUBLIC_APP_URL=https://instahealth.ae
  SHOPIFY_CLIENT_ID=[from dashboard]
  SHOPIFY_CLIENT_SECRET=[from dashboard]
  SHOPIFY_WEBHOOK_SECRET=[from dashboard]
  ```

- [ ] Redeploy application

### Day 1: Testing (1 hour)

- [ ] Create test Shopify store (if don't have one)
- [ ] Test OAuth: Visit `/api/shopify/connect?shop=test.myshopify.com`
- [ ] Verify redirect to Shopify authorization
- [ ] Click "Install app"
- [ ] Verify redirect back to InstaHealth
- [ ] Check database: Verify vendor has `shopifyConnected=true`
- [ ] Add products in Shopify admin
- [ ] Click "Sync Now" in vendor dashboard
- [ ] Verify products appear in InstaHealth

### Day 2-3: Multi-Vendor Testing

- [ ] Create 2 test vendors in InstaHealth
- [ ] Create 2 test Shopify stores
- [ ] Connect Vendor A to Store A
- [ ] Connect Vendor B to Store B
- [ ] Add different products in each store
- [ ] Sync both vendors
- [ ] **Critical:** Verify Vendor A can't see Vendor B's products
- [ ] Verify webhooks route correctly (update product in Store A, check Vendor A only updates)

### Day 4-7: Beta Launch

- [ ] Onboard 2-3 real beta vendors
- [ ] Monitor server logs for errors
- [ ] Monitor sync success rates
- [ ] Collect vendor feedback
- [ ] Fix any issues

**Result:** ✅ Production-ready unlisted app, vendors connecting

---

## 📋 WEEK 2-3: PREPARE FOR PUBLIC DISTRIBUTION (Parallel)

### Legal Pages (2-3 hours)

- [ ] Create `/app/privacy-policy/page.tsx` (use template in `SHOPIFY_PRODUCTION_PATH.md`)
- [ ] Create `/app/terms-of-service/page.tsx` (use template)
- [ ] Create `/app/support/shopify/page.tsx` (use template)
- [ ] Customize templates with InstaHealth-specific details
- [ ] Deploy to production
- [ ] Verify pages are publicly accessible (no login required)
- [ ] Test HTTPS (must be secure)

### GDPR Webhooks (3-4 hours) - Required if serving EU vendors

- [ ] Create `/app/api/shopify/gdpr/data-request/route.ts` (use template)
- [ ] Create `/app/api/shopify/gdpr/customer-redact/route.ts` (use template)
- [ ] Create `/app/api/shopify/gdpr/shop-redact/route.ts` (use template)
- [ ] Test webhooks with Shopify test tool
- [ ] Verify shop-redact actually deletes vendor data

### App Listing Assets (2 hours)

- [ ] Create app icon (1200x1200px PNG, transparent background)
  - Use InstaHealth logo
  - Add Shopify badge/indicator if desired

- [ ] Create screenshots (3-5 images, 1280x800px):
  - Screenshot 1: Vendor dashboard showing "Connect Shopify" button
  - Screenshot 2: Shopify authorization page
  - Screenshot 3: Successful connection screen
  - Screenshot 4: Product sync in progress
  - Screenshot 5: Synced products in vendor dashboard

- [ ] Write app description (80-5000 characters):
  - What it does
  - Key benefits
  - How it works
  - Who it's for

### Shopify Dashboard - App Listing (1 hour)

- [ ] Go to: App Listing tab
- [ ] App name: "InstaHealth for Shopify Vendors" (or similar)
- [ ] Tagline: "Sync your Shopify products to InstaHealth marketplace"
- [ ] Description: (paste prepared description)
- [ ] Upload app icon
- [ ] Upload screenshots (3-5 images)
- [ ] Category: Store management > Inventory
- [ ] Privacy policy URL: `https://instahealth.ae/privacy-policy`
- [ ] Support email: `support@instahealth.ae`
- [ ] Support URL: `https://instahealth.ae/support/shopify`
- [ ] Save as draft

### Add GDPR Webhooks to Shopify Dashboard (10 min)

- [ ] Go to: App Setup → Webhooks
- [ ] Add webhook: `customers/data_request` → `https://instahealth.ae/api/shopify/gdpr/data-request`
- [ ] Add webhook: `customers/redact` → `https://instahealth.ae/api/shopify/gdpr/customer-redact`
- [ ] Add webhook: `shop/redact` → `https://instahealth.ae/api/shopify/gdpr/shop-redact`
- [ ] Save

### Submit for Review (30 min)

- [ ] Go to: Distribution tab
- [ ] Click: "Choose distribution"
- [ ] Select: **"Public distribution"**
- [ ] Complete review questionnaire:
  - What does your app do? [Brief description]
  - Why do you need requested scopes? [read_products for sync, etc.]
  - How do merchants install? [From InstaHealth vendor dashboard]
  - Where does app appear in Shopify? [Does not appear in Shopify admin]
- [ ] Click: "Submit for review"
- [ ] Wait 2-3 weeks for approval

**Result:** ✅ App submitted for review, unlisted version still working

---

## 🎯 WEEK 5-6: PUBLIC DISTRIBUTION LIVE

### After Approval

- [ ] Receive approval email from Shopify
- [ ] App automatically appears in Shopify App Store
- [ ] No action needed (seamless transition)
- [ ] Update vendor documentation to mention App Store
- [ ] Monitor App Store page for organic installs
- [ ] Consider App Store SEO/optimization

**Result:** ✅ Maximum vendor reach, App Store discoverability

---

## 🚨 CRITICAL REMINDERS

### Do NOT Do These (Common Mistakes)

- ❌ DO NOT change to public distribution before legal pages are ready
- ❌ DO NOT hardcode shop domains anywhere in code
- ❌ DO NOT request `write_*` API scopes (only need `read_*`)
- ❌ DO NOT skip GDPR webhooks if serving EU vendors
- ❌ DO NOT use HTTP in production (must be HTTPS)
- ❌ DO NOT share Shopify Client Secret publicly

### Always Do These

- ✅ Test OAuth flow before submitting for review
- ✅ Test with multiple vendors to verify isolation
- ✅ Monitor server logs during beta testing
- ✅ Keep custom distribution enabled for internal testing
- ✅ Use exact redirect URLs (no typos, trailing slashes, etc.)
- ✅ Verify webhooks are HTTPS in production

---

## 📊 PROGRESS TRACKING

### Pre-Launch Checklist

**Backend (Already Complete):**
- [x] Dynamic shop OAuth support
- [x] Per-vendor token storage
- [x] Webhook routing by shop domain
- [x] Product isolation by vendorId
- [x] Security (nonces, HTTPS)

**Unlisted Distribution (Week 1):**
- [ ] Shopify dashboard configured
- [ ] Environment variables set
- [ ] OAuth flow tested
- [ ] Multi-vendor isolation tested
- [ ] Beta vendors onboarded

**Public Distribution Prep (Week 2-3):**
- [ ] Privacy policy page created
- [ ] Terms of service page created
- [ ] Support page created
- [ ] GDPR webhooks implemented
- [ ] App listing assets created
- [ ] App listing submitted

**Public Distribution Live (Week 5-6):**
- [ ] Shopify approval received
- [ ] App Store listing verified
- [ ] Vendor docs updated
- [ ] Organic installs monitored

---

## 🎉 SUCCESS CRITERIA

### After Week 1 (Unlisted Distribution):
- ✅ Any vendor can connect their Shopify store
- ✅ Products sync automatically
- ✅ Webhooks work for real-time updates
- ✅ Multi-vendor data isolation confirmed
- ✅ No manual intervention needed per vendor

### After Week 5-6 (Public Distribution):
- ✅ App discoverable in Shopify App Store
- ✅ Organic vendor installs happening
- ✅ Legal compliance complete (GDPR, privacy, terms)
- ✅ Scalable to 1000+ vendors
- ✅ Professional App Store presence

---

## 📞 SUPPORT

**If you get stuck:**

1. **OAuth errors:** See `docs/SHOPIFY_OAUTH_FIX.md`
2. **Webhook issues:** Check `SHOPIFY_WEBHOOK_SECRET` is set correctly
3. **App review rejection:** Review `SHOPIFY_PRODUCTION_PATH.md` rejection reasons section
4. **Multi-vendor issues:** Verify database queries include `vendorId` filter

**Key documentation:**
- Full guide: `docs/SHOPIFY_PRODUCTION_PATH.md`
- OAuth fix: `docs/SHOPIFY_OAUTH_FIX.md`
- Architecture: `docs/SHOPIFY_ARCHITECTURE_SUMMARY.md`

---

## 🚀 NEXT STEPS

**Right now:**
1. Read `SHOPIFY_PRODUCTION_PATH.md` (15 min)
2. Execute Week 1 checklist (2 hours)
3. Start onboarding vendors (ongoing)

**This week:**
4. Test with beta vendors (3-5 days)
5. Monitor and fix issues

**Next 2 weeks:**
6. Create legal pages (2-3 hours)
7. Submit for public distribution (30 min)

**Timeline:** Production unlisted app TODAY, public App Store listing in 3-4 weeks

**Your backend is ready. Time to go live!** 🚀
