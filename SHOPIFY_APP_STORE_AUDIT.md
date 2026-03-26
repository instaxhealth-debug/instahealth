# SHOPIFY APP STORE REVIEW-READINESS AUDIT
## RUTHLESS COMPREHENSIVE ANALYSIS

**Date:** March 26, 2026
**App Name:** InstaHealth Marketplace
**App Type:** Regular Embedded App (Product Sync)
**Domain:** https://instahealth.ae

---

## A. CAPABILITY CLASSIFICATION VERDICT

### CURRENT CLASSIFICATION: ✅ CORRECT
**Type:** Regular Embedded App
**Primary Function:** Product sync from Shopify to InstaHealth marketplace

**Capabilities Declared:**
- ✅ `embedded = true` - CORRECT (app runs in Shopify admin iframe)
- ✅ `scopes = "read_products,read_inventory,read_orders"` - CORRECT for product sync
- ❌ **NOT a Sales Channel** - Good, no sales channel requirements apply
- ❌ **NOT a Connector** - Good, no connector requirements apply
- ❌ **NOT POS** - Good, no POS requirements apply

**VERDICT:** Capability selection is CLEAN and APPROPRIATE. Do not change.

---

## B. FULL REQUIREMENT AUDIT TABLE

### FUNCTIONALITY REQUIREMENTS

| Requirement | Status | Reason | Action Required |
|------------|--------|---------|-----------------|
| **Authenticate immediately after install** | ⚠️ **PARTIAL** | OAuth flow exists but requires existing vendor account. Install-to-auth flow broken for new Shopify-first merchants. | **CRITICAL FIX NEEDED** |
| **Have merchant-interactable UI** | ✅ PASS | `/shopify` page exists with clear UI at https://instahealth.ae/shopify | None |
| **Implement Shopify Managed Pricing or Billing API** | ✅ **NOT APPLICABLE** | App is free, no billing required | Verify listing shows "Free" clearly |
| **Use Shopify Managed Pricing or Billing API** | ✅ **NOT APPLICABLE** | App is free | None |
| **Payment Gateway authorization** | ✅ **NOT APPLICABLE** | Not a payment gateway app | None |
| **Build for Shopify POS only** | ✅ **NOT APPLICABLE** | Not a POS app | None |
| **Build without critical errors** | ✅ PASS | Build passes, no critical errors | None |
| **Single-merchant storefronts** | ✅ **NOT APPLICABLE** | Not building storefronts | None |
| **Web-based app** | ✅ PASS | Next.js web app | None |
| **Create unique apps** | ✅ PASS | Unique marketplace integration | None |
| **Direct to Theme Store** | ✅ **NOT APPLICABLE** | Not selling themes | None |
| **Don't connect to agencies** | ✅ PASS | No agency connections | None |
| **Don't provide capital lending** | ✅ PASS | No lending functionality | None |
| **Duplicate only authorized product info** | ✅ PASS | Syncs own merchant's products only | None |
| **Include functional test credentials** | ❌ **FAIL** | No test credentials provided | **MUST ADD** |
| **Maintain cheapest shipping as default** | ✅ **NOT APPLICABLE** | Doesn't handle shipping | None |
| **Obtain buyer consent before charges** | ✅ **NOT APPLICABLE** | App is free | None |
| **Browser extensions optional only** | ✅ PASS | No browser extensions | None |
| **Process refunds through original processor** | ✅ **NOT APPLICABLE** | Doesn't process payments | None |
| **Redirect to app UI after installation** | ✅ PASS | OAuth callback returns 200 with App Bridge redirect to `/shopify` | None |
| **Submit as regular app if not Sales Channel** | ✅ PASS | Correctly submitted as regular app | None |
| **Use valid TLS/SSL certificate** | ✅ PASS | https://instahealth.ae has valid cert (HTTP/2 307 redirect active) | None |
| **Use only factual information** | ⚠️ **VERIFY** | Need to review listing copy | **MANUAL CHECK** |
| **Use session tokens for authentication** | ❌ **FAIL** | App Bridge loaded but no session token auth implemented | **CRITICAL FIX NEEDED** |
| **Use Shopify APIs** | ✅ PASS | Uses Admin REST API 2024-01 and GraphQL | None |
| **Use Shopify checkout** | ✅ **NOT APPLICABLE** | Doesn't sell products directly | None |
| **Admin extensions feature-complete** | ✅ **NOT APPLICABLE** | No admin extensions | None |
| **Allow pricing plan changes** | ✅ **NOT APPLICABLE** | Free app | None |
| **Build without minor errors** | ✅ PASS | Build clean | None |
| **Don't display ads in admin extensions** | ✅ **NOT APPLICABLE** | No admin extensions | None |
| **Initiate from Shopify surface** | ⚠️ **PARTIAL** | Install can happen from App Store, but existing flow requires InstaHealth vendor account first | **FIX RECOMMENDED** |
| **Request read_all_orders only if necessary** | ✅ PASS | Uses `read_orders` (scoped), not `read_all_orders` | None |
| **Request read_checkout_extensions_chat only when required** | ✅ PASS | Not requested | None |
| **Request write_checkout_extensions_apis only if necessary** | ✅ PASS | Not requested | None |
| **Request write_payment_mandate only if necessary** | ✅ PASS | Not requested | None |
| **OAuth immediately after reinstall** | ✅ PASS | OAuth flow triggers on every install/reinstall | None |
| **Synchronize data accurately** | ⚠️ **VERIFY** | Product sync implemented but need to verify accuracy | **TEST REQUIRED** |
| **Use correct subscription API scopes** | ✅ **NOT APPLICABLE** | No subscription API usage | None |

### APP STORE LISTING REQUIREMENTS

| Requirement | Status | Reason | Action Required |
|------------|--------|---------|-----------------|
| **Include test credentials** | ❌ **FAIL** | Not provided in listing | **MUST ADD: Test Shopify store + InstaHealth vendor credentials** |
| **Include demo screencast** | ⚠️ **UNKNOWN** | Cannot verify without access to listing | **MUST VERIFY/ADD** |
| **Indicate Online Store sales channel required** | ✅ **NOT APPLICABLE** | Not a sales channel | None |
| **Accurate pricing information** | ⚠️ **VERIFY** | Need to confirm "Free" is stated clearly | **MANUAL CHECK** |
| **Upload app icon** | ⚠️ **UNKNOWN** | Cannot verify | **MUST VERIFY** |
| **Use accurate tags** | ⚠️ **UNKNOWN** | Cannot verify | **MANUAL CHECK** |
| **Effective app card subtitle** | ⚠️ **UNKNOWN** | Cannot verify | **MANUAL CHECK** |
| **App name fields similar** | ⚠️ **UNKNOWN** | Cannot verify | **MANUAL CHECK** |
| **Don't include pricing in listing** | ⚠️ **VERIFY** | Since free, should say "Free" | **MANUAL CHECK** |
| **Don't include reviews/testimonials** | ⚠️ **VERIFY** | Cannot verify | **MANUAL CHECK** |
| **Don't misuse Shopify brand** | ⚠️ **VERIFY** | Cannot verify graphics | **MANUAL CHECK** |
| **Follow app details guidelines** | ⚠️ **VERIFY** | Cannot verify | **MANUAL CHECK** |
| **Indicate geographic requirements** | ⚠️ **VERIFY** | App works globally but marketplace is UAE-focused | **MANUAL CHECK: State if UAE-only** |
| **No stats/data in listing** | ⚠️ **VERIFY** | Cannot verify | **MANUAL CHECK** |
| **Only claim supported languages** | ⚠️ **VERIFY** | Cannot verify | **MANUAL CHECK: English only?** |

### CONNECTOR REQUIREMENTS

| Requirement | Status | Reason | Action Required |
|------------|--------|---------|-----------------|
| **End recipient acknowledgement form** | ✅ **NOT APPLICABLE** | Not a connector app | None |
| **No third party marketplace connection** | ✅ **NOT APPLICABLE** | Not a connector | None |
| **Addendum for international connector** | ✅ **NOT APPLICABLE** | Not a connector | None |
| **Indicate integrations/transfers** | ✅ **NOT APPLICABLE** | Not a connector | None |

### EMBEDDED REQUIREMENTS

| Requirement | Status | Reason | Action Required |
|------------|--------|---------|-----------------|
| **Consistent embedded experience** | ⚠️ **PARTIAL** | Embedded layout correct, but App Bridge usage incomplete | **FIX: Add session token auth** |
| **Only launch Max modal with interaction** | ✅ **NOT APPLICABLE** | No modals used | None |
| **Use latest App Bridge** | ❌ **FAIL** | Using deprecated CDN version, not @shopify/app-bridge npm package | **CRITICAL FIX NEEDED** |

### SALES CHANNEL REQUIREMENTS

| Requirement | Status | Reason | Action Required |
|------------|--------|---------|-----------------|
| **All Sales Channel requirements** | ✅ **NOT APPLICABLE** | Not a sales channel | None |

---

## C. FILES INSPECTED

### Configuration
- ✅ `shopify.app.toml` - App configuration
- ✅ `.env.shopify.production.example` - Environment documentation
- ✅ `vercel.json` - Deployment config

### Shopify Routes & Components
- ✅ `app/shopify/page.tsx` - Main app UI
- ✅ `app/shopify/layout.tsx` - Embedded layout
- ✅ `app/api/shopify/connect/route.ts` - OAuth initiation
- ✅ `app/api/shopify/callback/route.ts` - OAuth callback
- ✅ `app/api/shopify/disconnect/route.ts` - Disconnect flow
- ✅ `app/api/shopify/compliance/route.ts` - GDPR webhooks
- ✅ `app/api/shopify/webhooks/route.ts` - Product webhooks
- ✅ `lib/shopify/webhooks.ts` - Webhook registration
- ✅ `lib/shopify/client.ts` - API client

### Legal Pages
- ✅ `app/privacy-policy/page.tsx` - Privacy policy EXISTS
- ✅ `app/terms-of-service/page.tsx` - Terms of service EXISTS

---

## D. FILES CHANGED

None yet - providing critical fixes below that MUST be implemented.

---

## E. CRITICAL FIXES REQUIRED

### 🚨 BLOCKER #1: Session Token Authentication Missing

**Problem:** App uses App Bridge CDN but doesn't implement session token authentication. Shopify requires session tokens for embedded apps.

**Required Fix:**
```typescript
// app/shopify/page.tsx - Add session token auth
import { useEffect } from 'react';
import createApp from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge/utilities';

// Inside component:
useEffect(() => {
  const app = createApp({
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID!,
    host: new URLSearchParams(window.location.search).get('host')!,
  });

  // Get and use session token for API calls
  getSessionToken(app).then(token => {
    // Use token in Authorization header for API calls
    console.log('Session token:', token);
  });
}, []);
```

**Also Required:**
1. Install `@shopify/app-bridge` npm package (not CDN)
2. Validate session tokens on backend API routes
3. Remove CDN script from callback/route.ts

---

### 🚨 BLOCKER #2: Install Flow Broken for Shopify-First Users

**Problem:** Current OAuth flow (`/api/shopify/connect`) requires:
1. User logs into InstaHealth first
2. User creates vendor account
3. User then connects Shopify

**This breaks Shopify App Store install flow where:**
1. Merchant clicks "Install" in App Store
2. Merchant expects immediate OAuth
3. No InstaHealth account exists yet

**Required Fix:**
Create public OAuth initiation endpoint that doesn't require InstaHealth auth:

```typescript
// app/api/shopify/install/route.ts (NEW FILE)
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get("shop");

  if (!shop || !shop.endsWith(".myshopify.com")) {
    return NextResponse.json({ error: "Invalid shop parameter" }, { status: 400 });
  }

  // Generate nonce WITHOUT requiring InstaHealth login
  const nonce = crypto.randomBytes(32).toString("hex");

  // Store nonce with shop domain (vendorId will be null initially)
  await prisma.shopifyOAuthState.create({
    data: {
      nonce,
      shopDomain: shop, // ADD THIS FIELD TO MODEL
      vendorId: null, // Will be set during callback
      timestamp: BigInt(Date.now()),
    },
  });

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", process.env.SHOPIFY_CLIENT_ID!);
  authUrl.searchParams.set("scope", "read_products,read_inventory,read_orders");
  authUrl.searchParams.set("redirect_uri", `https://instahealth.ae/api/shopify/callback`);
  authUrl.searchParams.set("state", nonce);

  return NextResponse.redirect(authUrl.toString());
}
```

**Also update callback** to handle new vendors:
- Check if vendorId is null in OAuth state
- Prompt user to create InstaHealth account or link existing
- Complete OAuth after account linkage

---

### 🚨 BLOCKER #3: Missing Test Credentials Documentation

**Problem:** Shopify review requires working test credentials.

**Required Fix:**
Create `TEST_CREDENTIALS.md` with:
```markdown
# Test Credentials for Shopify App Review

## Test Shopify Store
- **Store URL:** [your-test-store].myshopify.com
- **Admin URL:** [your-test-store].myshopify.com/admin
- **Admin Email:** [email]
- **Admin Password:** [password]

## InstaHealth Vendor Account
- **Vendor Dashboard:** https://instahealth.ae/vendor/dashboard
- **Email:** shopify-test@instahealth.ae
- **Password:** [secure-test-password]

## Test Flow
1. Log into InstaHealth vendor account
2. Navigate to integrations
3. Click "Connect Shopify"
4. Authorize with test Shopify store
5. Products will sync automatically
```

**Add to listing:** Include these credentials in "Notes for reviewer" section.

---

### ⚠️ WARNING #1: App Bridge Version Deprecated

**Problem:** Using CDN version instead of npm package.

**Fix:**
```bash
npm install @shopify/app-bridge @shopify/app-bridge-react
```

Remove CDN `<script>` tag from callback, use proper imports.

---

### ⚠️ WARNING #2: Privacy/Terms URLs Different Than Expected

**Problem:**
- Privacy at `/privacy-policy` (Shopify expects `/privacy`)
- Terms at `/terms-of-service` (Shopify expects `/terms`)

**Fix:** Add redirects or create duplicate routes:
```typescript
// app/privacy/page.tsx
export { default } from '../privacy-policy/page';

// app/terms/page.tsx
export { default } from '../terms-of-service/page';
```

---

## F. LISTING / SUBMISSION FIXES REQUIRED (MANUAL)

### Must Complete Before Submission:

1. **Add Test Credentials** (CRITICAL)
   - Create test Shopify development store
   - Create test InstaHealth vendor account
   - Document credentials in listing "Notes for reviewer"

2. **Create Demo Screencast** (REQUIRED)
   - 30-60 second video showing:
     - Installing app from Shopify admin
     - OAuth authorization
     - Product sync working
     - Viewing synced products on InstaHealth

3. **Upload App Icon** (REQUIRED)
   - 1024x1024 PNG
   - Clear branding
   - No text smaller than readable at 512px

4. **Write App Listing Copy**
   - **Title:** "InstaHealth Product Sync" (or similar, max 30 chars)
   - **Subtitle:** "Sync Shopify products to InstaHealth marketplace"
   - **Description:** Clear explanation of what app does
   - **Pricing:** "Free" (clearly stated)
   - **Support Email:** info@instahealth.ae
   - **Privacy Policy URL:** https://instahealth.ae/privacy
   - **Terms URL:** https://instahealth.ae/terms

5. **Add Screenshots** (REQUIRED, 3-5 recommended)
   - App home page after install
   - Product sync in progress
   - Synced products view
   - Disconnect option

6. **Select Accurate Tags/Categories**
   - Category: "Sales and conversion"
   - Tags: "Product sync", "Marketplace", "Inventory"

7. **Geographic Limitations**
   - If UAE-only marketplace: State clearly in listing
   - If global: State "Available globally"

---

## G. REMAINING BLOCKERS

### CRITICAL (Must fix before submission):
1. ✅ **Session token authentication** - Add @shopify/app-bridge with session tokens
2. ✅ **Public install endpoint** - Allow Shopify-first install without InstaHealth account
3. ✅ **Test credentials** - Create and document test accounts

### HIGH (Should fix before submission):
4. ⚠️ **Privacy/Terms URL redirects** - Add /privacy and /terms routes
5. ⚠️ **App Bridge CDN → npm** - Migrate to npm package

### MEDIUM (Can fix post-approval):
6. 📋 **Listing copy review** - Ensure factual, no exaggerations
7. 📋 **Geographic clarity** - State if UAE-focused

---

## H. FINAL VERDICT

**Status:** ❌ **NOT SAFE TO SUBMIT**

### Reasons:
1. **Session token auth missing** - Embedded apps MUST use session tokens
2. **Install flow broken** - Can't install from App Store without existing InstaHealth account
3. **No test credentials** - Required for review

### Estimated Time to Fix:
- **Session tokens:** 2-4 hours (implement + test)
- **Public install endpoint:** 3-6 hours (build account linkage flow)
- **Test credentials:** 30 minutes (create accounts + document)
- **Listing materials:** 2-3 hours (screencast, copy, screenshots)

**Total:** 8-14 hours of development + listing prep

---

## I. FINAL MANUAL CHECKLIST

Complete these IN ORDER before submission:

### PHASE 1: CODE FIXES (Do First)

- [ ] **Install @shopify/app-bridge**
  ```bash
  npm install @shopify/app-bridge @shopify/app-bridge-react
  ```

- [ ] **Implement session token auth in `/shopify` page**
  - Add App Bridge initialization
  - Get session token on mount
  - Use token for API calls

- [ ] **Create public install endpoint** `/api/shopify/install`
  - No auth required
  - Stores nonce with shop domain
  - Handles new vendor creation in callback

- [ ] **Update OAuth callback** to handle new vendors
  - Check if vendorId null
  - Prompt for InstaHealth account creation/linking
  - Complete OAuth after linkage

- [ ] **Add privacy/terms redirects**
  - `/privacy` → `/privacy-policy`
  - `/terms` → `/terms-of-service`

- [ ] **Remove App Bridge CDN** from callback route
  - Use npm package instead

- [ ] **Test full install flow**
  - From App Store install button
  - Without existing InstaHealth account
  - Verify session tokens work

### PHASE 2: TEST ENVIRONMENT (Do Second)

- [ ] **Create test Shopify development store**
  - Add test products (5-10 items)
  - Note admin credentials

- [ ] **Create test InstaHealth vendor account**
  - Complete profile
  - Note credentials

- [ ] **Test full sync flow**
  - Install app
  - Authorize OAuth
  - Verify products sync
  - Test disconnect

- [ ] **Document test credentials** in TEST_CREDENTIALS.md

### PHASE 3: LISTING MATERIALS (Do Third)

- [ ] **Create demo screencast** (30-60 sec)
  - Screen record install flow
  - Show product sync working
  - Upload to YouTube/Vimeo as unlisted

- [ ] **Prepare app icon** (1024x1024 PNG)

- [ ] **Take screenshots** (3-5 images)
  - App home page
  - Sync in progress
  - Products synced
  - Settings/disconnect

- [ ] **Write listing copy**
  - Title (max 30 chars)
  - Subtitle/tagline
  - Full description
  - Features list
  - Support info

### PHASE 4: PARTNER DASHBOARD (Do Last)

- [ ] **Upload app icon** to Partner Dashboard

- [ ] **Add screenshots** (min 3, max 5)

- [ ] **Add demo screencast URL**

- [ ] **Fill out app details**
  - Description
  - Pricing (Free)
  - Category/tags
  - Support email
  - Privacy policy URL: `https://instahealth.ae/privacy`
  - Terms URL: `https://instahealth.ae/terms`

- [ ] **Add test credentials** in "Notes for reviewer"
  - Shopify store access
  - InstaHealth vendor access
  - Test flow instructions

- [ ] **Select app capabilities** (verify)
  - Embedded: Yes
  - Sales channel: No
  - POS: No

- [ ] **Run automated checks** in Partner Dashboard
  - All must pass ✅

- [ ] **Submit for review**

### VERIFICATION CHECKLIST (Before Clicking Submit)

- [ ] Automated checks all pass ✅
- [ ] Test credentials work (verify by logging in yourself)
- [ ] Screencast plays and shows full flow
- [ ] Privacy/terms pages accessible
- [ ] App icon looks professional
- [ ] No pricing claims that aren't true
- [ ] No testimonials/reviews in listing
- [ ] Support email correct
- [ ] Geographic limitations stated if applicable

---

## SUMMARY: WHAT'S ACTUALLY WRONG

**Good News:**
- ✅ App capability selection is correct
- ✅ OAuth flow technically works
- ✅ Compliance webhooks configured
- ✅ HMAC verification implemented
- ✅ Privacy/terms pages exist
- ✅ Disconnect flow exists
- ✅ SSL/TLS valid

**Bad News:**
- ❌ No session token authentication (CRITICAL)
- ❌ Install flow requires existing InstaHealth account (BREAKS App Store install)
- ❌ Using deprecated App Bridge CDN
- ❌ No test credentials
- ❌ Listing materials unknown/incomplete

**The Bottom Line:**
This app WILL get rejected if submitted today because:
1. Embedded apps MUST use session tokens (you're not)
2. Install from App Store doesn't work (requires pre-existing account)
3. No test credentials (review can't proceed)

Fix these 3 things + complete listing materials = safe to submit.

---

**End of Audit**
