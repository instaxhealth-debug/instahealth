# Quick Start: Deploy Shopify Fixes to Production

**⏱️ Time Required:** 10-15 minutes
**🎯 Goal:** Deploy fixes and pass Shopify automated checks

---

## 1️⃣ Update Shopify Partner Dashboard (5 min)

**Go to:** https://partners.shopify.com → Your App → App Setup

### Add New Redirect URL:
```
https://instahealth.ae/admin/oauth/redirect_to_install
```

**Steps:**
1. Click "App Setup" tab
2. Scroll to "Allowed redirection URLs"
3. Click "Add URL"
4. Paste: `https://instahealth.ae/admin/oauth/redirect_to_install`
5. Click "Save"

✅ **Verify:** Both URLs should now be listed:
- `https://instahealth.ae/api/shopify/callback`
- `https://instahealth.ae/admin/oauth/redirect_to_install` ← NEW

---

## 2️⃣ Deploy Code Changes (3 min)

**Option A: Push to Git (Recommended)**
```bash
# Stage changes
git add -A

# Commit
git commit -m "fix: Shopify App Store automated check failures

- Add /admin/oauth/redirect_to_install endpoint (fixes 404 error)
- Fix compliance webhook TOML configuration
- Update install flow handling"

# Push (triggers automatic Vercel deployment)
git push origin main
```

**Option B: Manual Vercel Deploy**
```bash
vercel --prod
```

✅ **Verify:** Check Vercel Dashboard for successful deployment (2-3 minutes)

---

## 3️⃣ Verify Deployment (2 min)

**Test the new endpoint:**
```bash
curl -I https://instahealth.ae/admin/oauth/redirect_to_install
```

✅ **Expected:** HTTP/2 302 or 307 (redirect, not 404!)

**Test app home:**
```bash
curl -I https://instahealth.ae/shopify
```

✅ **Expected:** HTTP/2 200

---

## 4️⃣ Run Shopify Automated Checks (2 min)

**Go to:** Shopify Partner Dashboard → Your App → Test on development store

1. Click "Run automated checks"
2. Wait for results (30-60 seconds)

✅ **All should pass:**
- ✅ Immediately authenticates after install
- ✅ Immediately redirects to app UI after authentication ← **FIXED**
- ✅ Provides mandatory compliance webhooks ← **FIXED**
- ✅ Verifies webhooks with HMAC signatures ← **FIXED**
- ✅ Uses valid TLS certificate

---

## 5️⃣ Test Install Flow (Optional, 3 min)

1. Install app on a development Shopify store
2. Should see install flow redirect to `/shopify?install=true`
3. Complete OAuth flow
4. Should redirect to `/shopify?shopify=connected`
5. Should see "Successfully Connected!" message

---

## ✅ Success Criteria

Your deployment is successful when:

- [x] New redirect URL added to Partner Dashboard
- [x] Code deployed to Vercel (build passed)
- [x] `/admin/oauth/redirect_to_install` returns 302 (not 404)
- [x] Shopify automated checks all pass ✅
- [x] Test install works without errors

---

## 🚨 If Something Goes Wrong

### Issue: 404 on /admin/oauth/redirect_to_install

**Fix:**
```bash
# Verify file exists
ls app/admin/oauth/redirect_to_install/route.ts

# If missing, the file should be here:
# /Users/cruzfrangieh/Desktop/instaxhealth website/app/admin/oauth/redirect_to_install/route.ts

# Redeploy
git push origin main
```

### Issue: Automated checks still failing

**Fix:**
1. Wait 5 minutes (Shopify cache)
2. Clear Vercel cache: Deployments → Redeploy (Clear Cache)
3. Verify `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` are set in Vercel

### Issue: Webhooks not working

**Fix:**
1. Verify `shopify.app.toml` is deployed
2. Check Vercel logs: Dashboard → Functions → Real-time logs
3. Test with Shopify's webhook test feature in Partner Dashboard

---

## 📞 Need Help?

**Documentation:**
- Full details: `/docs/SHOPIFY_APP_STORE_FIXES.md`
- Deployment checklist: `/docs/DEPLOYMENT_CHECKLIST.md`

**Key Files:**
- `/app/admin/oauth/redirect_to_install/route.ts` (NEW)
- `/shopify.app.toml` (UPDATED)
- `/app/shopify/page.tsx` (UPDATED)

---

**Next Step:** Submit app for Shopify App Store review! 🚀
