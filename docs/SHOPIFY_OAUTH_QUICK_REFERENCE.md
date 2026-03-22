# Shopify OAuth Quick Reference

## 🎯 The Fix (TL;DR)

**Problem:** `redirect_uri` was `undefined/api/shopify/callback` because `NEXT_PUBLIC_APP_URL` was not defined.

**Solution:** Implemented intelligent fallback chain + comprehensive logging.

---

## 📋 Immediate Actions Required

### 1. Add to Shopify Partner Dashboard

**Development:**
```
http://localhost:3000/api/shopify/callback
```

**Production:**
```
https://yourdomain.com/api/shopify/callback
```

⚠️ **Must match EXACTLY** - no trailing slash, no query params, correct protocol

### 2. Set Environment Variables

**Development (`.env.local`):**
```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
SHOPIFY_CLIENT_ID=your-client-id
SHOPIFY_CLIENT_SECRET=your-client-secret
```

**Production (Vercel/Netlify):**
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
SHOPIFY_CLIENT_ID=your-prod-client-id
SHOPIFY_CLIENT_SECRET=your-prod-client-secret
```

---

## 🔍 How to Verify the Fix

### Step 1: Check Logs

When you visit `/api/shopify/connect?shop=yourstore.myshopify.com`, you should see:

```
[SHOPIFY_CONNECT] ===== OAUTH DIAGNOSTICS =====
[SHOPIFY_CONNECT] shop = yourstore.myshopify.com
[SHOPIFY_CONNECT] BASE_URL = http://localhost:3000
[SHOPIFY_CONNECT] SHOPIFY_REDIRECT_URI = http://localhost:3000/api/shopify/callback
...
```

✅ **Good:** `SHOPIFY_REDIRECT_URI` shows your actual domain
❌ **Bad:** Shows `undefined/api/shopify/callback`

### Step 2: Extract redirect_uri from Authorization URL

From the logs, find this line:
```
[SHOPIFY_CONNECT] Full authorization URL: https://yourstore.myshopify.com/admin/oauth/authorize?client_id=xxx&scope=...&redirect_uri=http://localhost:3000/api/shopify/callback&state=xxx
```

Extract the `redirect_uri` parameter and verify it matches your Shopify whitelist.

### Step 3: Test OAuth Flow

1. Go to vendor dashboard
2. Click "Connect Shopify"
3. Enter shop domain (e.g., `yourstore.myshopify.com`)
4. Should redirect to Shopify (NOT error page)
5. Click "Install" on Shopify
6. Should redirect back with success message

---

## 🚨 Troubleshooting

### Still getting "redirect_uri is not whitelisted"?

**Check these common mismatches:**

| What's Generated | What's Whitelisted | Problem |
|-----------------|-------------------|---------|
| `http://yourdomain.com/...` | `https://yourdomain.com/...` | Protocol mismatch |
| `https://www.yourdomain.com/...` | `https://yourdomain.com/...` | Subdomain mismatch |
| `https://yourdomain.com/api/shopify/callback/` | `https://yourdomain.com/api/shopify/callback` | Trailing slash |
| `undefined/api/shopify/callback` | `https://yourdomain.com/...` | Missing BASE_URL env var |

**To fix:**
1. Check server logs for exact `SHOPIFY_REDIRECT_URI`
2. Go to Shopify Partner Dashboard → App Setup → URLs
3. Add the EXACT URL from logs to whitelist
4. Save and retry

### redirect_uri still shows "undefined"?

**Quick fixes:**
1. Restart Next.js dev server: `Ctrl+C` then `npm run dev`
2. Verify `.env.local` has `NEXT_PUBLIC_BASE_URL=http://localhost:3000`
3. For production, set `NEXT_PUBLIC_APP_URL` in Vercel/Netlify

---

## 📝 Environment Variable Priority

The code checks variables in this order:

1. `SHOPIFY_REDIRECT_URI` (explicit override)
2. `NEXT_PUBLIC_APP_URL` (recommended for production)
3. `NEXT_PUBLIC_BASE_URL` (current setup, works for dev)
4. `NEXTAUTH_URL` (fallback)
5. `http://localhost:3000` (last resort)

**Recommendation:**
- Development: Use `NEXT_PUBLIC_BASE_URL` (already set)
- Production: Set `NEXT_PUBLIC_APP_URL` (new variable)

---

## 🎯 What Changed?

### Files Modified

1. **`app/api/shopify/connect/route.ts`**
   - Fixed BASE_URL resolution
   - Added diagnostic logging

2. **`app/api/shopify/callback/route.ts`**
   - Synchronized URL construction

3. **`.env.local`**
   - Added configuration comments

### The Core Fix

**Before:**
```typescript
const SHOPIFY_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + "/api/shopify/callback";
// Result: "undefined/api/shopify/callback" ❌
```

**After:**
```typescript
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

const SHOPIFY_REDIRECT_URI = BASE_URL + "/api/shopify/callback";
// Result: "http://localhost:3000/api/shopify/callback" ✅
```

---

## 📞 Support

For detailed explanation, see: [`docs/SHOPIFY_OAUTH_FIX.md`](./SHOPIFY_OAUTH_FIX.md)
