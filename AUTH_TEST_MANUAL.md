# Manual Authentication Testing Plan

**Server Status:** ✅ Running on http://localhost:3000  
**Last Restart:** Just completed  
**Node Runtime Verified:** ✅ Yes (auth routes set to nodejs, no Prisma in Edge)

---

## Quick Overview

Three critical auth flows need manual verification. Each test should be done in a fresh browser session (incognito) to avoid cached auth state.

| Test | Purpose | Expected Result |
|------|---------|-----------------|
| Test A | Unauthenticated access to /admin | Redirect to /login with callbackUrl |
| Test B | Non-admin user accessing /admin | Redirect to /account |
| Test C | Admin user accessing /admin | Full access to dashboard |

---

## Test A: Unauthenticated Admin Access

**Setup:**
- Open incognito/private window in browser
- Navigate to `http://localhost:3000/admin`

**Expected Result:**
- ✅ Page redirects to `/login?next=/admin`
- ✅ Login page displays (with email/password inputs)
- ✅ No 500 errors in browser console
- ✅ Server logs show no Prisma errors

**Actual Result:**
- [ ] Redirected correctly
- [ ] No errors in console
- [ ] Server logs clean

---

## Test B: Non-Admin User Access

**Setup:**
1. In the incognito window, go to `http://localhost:3000/login`
2. Login with non-admin credentials:
   - Email: `cfrangieh22@gmail.com` (or any non-admin email)
   - Password: `frangido3.` (or any valid password for test account)
3. Wait for redirect to `/account` page
4. Once logged in, navigate to `http://localhost:3000/admin`

**Expected Result:**
- ✅ After login, user is on `/account` page
- ✅ Clicking Admin link (if visible) or navigating to `/admin` redirects to `/account`
- ✅ No access to vendor dashboard or admin panel
- ✅ Server logs show: `[AUTH] Unauthorized admin access attempt by: cfrangieh22@gmail.com`

**Actual Result:**
- [ ] Logged in as non-admin
- [ ] /admin redirects to /account
- [ ] Server logs show deny message

---

## Test C: Admin User Full Access

**Setup:**
1. Close incognito window from Test B
2. Open **new** incognito window
3. Navigate to `http://localhost:3000/login`
4. Login with admin credentials:
   - Email: `cruz@jccl.com.au`
   - Password: `frangido3.`
5. Wait for redirect
6. Once logged in, navigate to `http://localhost:3000/admin`

**Expected Result:**
- ✅ Login succeeds
- ✅ User redirected to `/account` page (or home, depending on callbackUrl)
- ✅ Navigating to `/admin` grants **full access** to vendor dashboard
- ✅ Can view `/admin/vendors`, `/admin/products`, etc.
- ✅ No redirects on admin pages
- ✅ Server logs show no errors

**Actual Result:**
- [ ] Login successful with admin email
- [ ] /admin fully accessible
- [ ] Vendor dashboard loads
- [ ] No unauthorized warnings in logs

---

## Test D: Google OAuth Sign-In (Optional)

**Setup:**
1. In incognito window, go to `http://localhost:3000/login`
2. Click "Sign in with Google"
3. Complete Google authentication flow
4. Should redirect to `/account` with new user created

**Expected Result:**
- ✅ Google authentication popup appears
- ✅ After login, redirected to `/account`
- ✅ User created in database
- ✅ Cart auto-created for new user

**Actual Result:**
- [ ] Google OAuth works
- [ ] User created
- [ ] Cart exists

**⚠️ NOTE:** Google OAuth secret is currently **compromised** (leaked in conversation). This will fail until you:
1. Go to Google Cloud Console
2. Create new OAuth 2.0 Client credentials
3. Update `GOOGLE_CLIENT_SECRET` in `.env.local`
4. Restart server: `npm run dev`

---

## Test E: Logout Flow

**Setup:**
1. Login as admin (Test C)
2. Navigate to account page (`/account`)
3. Scroll down and click "Logout" button

**Expected Result:**
- ✅ Session clears immediately
- ✅ User redirected to `/` (home page)
- ✅ Clicking "Login" link at top works
- ✅ If you try to access `/admin` again, redirects to `/login`

**Actual Result:**
- [ ] Logout button works
- [ ] Redirected to home
- [ ] Session cleared

---

## Server Logs to Watch For

### ✅ Expected (Clean Operation)
```
✓ Compiled /middleware in 136ms
✓ Compiled /login in 875ms
GET /login 200
GET /admin 307 (redirect)
[AUTH] Unauthorized admin access attempt by: cfrangieh22@gmail.com
```

### ❌ Do NOT See (Indicates Problems)
```
PrismaClientValidationError: In order to run Prisma Client on edge runtime...
[AUTH JWT] Failed to refresh user role: PrismaClientValidationError
GET /api/auth/[...nextauth] 500
TypeError: Cannot read property 'user' of null
```

---

## Debugging Commands

### Check Server Logs
```bash
# Terminal shows all server output - watch for errors
# Look for lines starting with [AUTH] or Error
```

### Clear Session/Cache
```bash
# Hard refresh in browser
Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

# Or clear all cookies for localhost:3000:
# DevTools > Application > Cookies > Delete all
```

### Test Admin Email Validation
```bash
# Check if ADMIN_EMAIL is set correctly
grep ADMIN_EMAIL /Users/cruzfrangieh/Desktop/instaxhealth\ website/.env.local

# Expected output:
# ADMIN_EMAIL=cruz@jccl.com.au
```

### Query Database (for debugging)
```bash
sqlite3 /Users/cruzfrangieh/Desktop/instaxhealth\ website/prisma/prisma/dev.db "SELECT email, role FROM User LIMIT 5;"
```

---

## Checklist for Success

- [ ] **Test A Passed**: Unauthenticated users redirect to /login for /admin
- [ ] **Test B Passed**: Non-admin users redirect to /account when accessing /admin
- [ ] **Test C Passed**: Admin user (cruz@jccl.com.au) has full access to /admin
- [ ] **Test D Optional**: Google OAuth flow works (after secret rotation)
- [ ] **Test E Passed**: Logout button clears session and redirects
- [ ] **Server Clean**: No Prisma Edge runtime errors in logs
- [ ] **Email Match**: Admin check uses normalized email (lowercase + trim)
- [ ] **Env Var Set**: ADMIN_EMAIL exists and matches test user email

---

## Next Steps After Testing

1. **All Tests Pass?**
   - ✅ Auth system is production-ready
   - Deploy to Vercel with confidence

2. **Test Fails?**
   - Check server logs for error messages
   - Verify ADMIN_EMAIL in .env.local matches test credentials
   - Ensure database has test users (check with sqlite3)
   - Restart server: `npm run dev`

3. **Google OAuth Still Broken?**
   - Rotate secret in Google Cloud Console
   - Update .env.local
   - Restart server
   - Test again

---

## Test User Credentials

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| cruz@jccl.com.au | frangido3. | admin | Admin access test |
| cfrangieh22@gmail.com | frangido3. (if exists) | user | Non-admin test |

**Note:** Passwords are for development testing only. Change all passwords before production deployment.
