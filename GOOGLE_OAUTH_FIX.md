# Google OAuth SignIn Test Plan

## What Just Fixed

1. ✅ **Prisma Schema**: Added `image` and `emailVerified` fields to User model (NextAuth requirements)
2. ✅ **Prisma Client Regenerated**: PrismaClient now knows about new fields
3. ✅ **Cart Creation Logic Fixed**:
   - Moved from `callbacks.signIn` (runs at wrong time) 
   - To `events.createUser` (runs AFTER user created in DB)
   - Plus `events.signIn` safety net for existing users

**Result:** NextAuth can now create users properly + carts created at right time

---

## Test: Google OAuth Sign-In

**Setup:**
1. Server is running: `npm run dev` ✅
2. Open incognito window
3. Navigate to `http://localhost:3000/login`
4. Click "Sign in with Google"

**Expected Flow:**
```
Click "Sign in with Google"
  ↓
Redirected to Google auth page
  ↓
Choose account (or login if needed)
  ↓
POST /api/auth/callback/google?code=...
  ↓
[AUTH] Created cart for new user: <user-id>
  ↓
Redirected to /account (success!)
  ↓
User exists in DB with image + emailVerified fields
  ↓
Cart auto-created
```

**Expected Server Logs:**
```
✓ Compiled /api/auth/[...nextauth]
POST /api/auth/signin/google 200
GET /api/auth/callback/google?code=... 302
[AUTH] Created cart for new user: clx...
GET /account 200
```

**Success Signs:**
- ✅ No "Unknown argument 'image'" errors
- ✅ No "Foreign key constraint violated" errors
- ✅ No Prisma validation errors
- ✅ Redirected to `/account` page
- ✅ Cart created automatically
- ✅ Can access protected routes after login

**If It Breaks:**
- Check server logs for error messages
- Look for lines starting with `[AUTH]` or `prisma:error`
- Common issue: Google secret still wrong → rotate in Google Console again
- Verify database has user: `sqlite3 prisma/prisma/dev.db "SELECT email, image FROM User LIMIT 5;"`

---

## Schema Changes Made

```sql
-- Added to User model:
image             String?    -- NextAuth stores profile picture URL
emailVerified     DateTime?  -- NextAuth sets when email verified
```

**Why?**
- NextAuth Prisma Adapter expects these fields
- Without them, user creation fails with "Unknown argument 'image'"
- Google OAuth passes image URL + emailVerified status
- Schema must match adapter expectations

---

## Cart Creation Logic Changes

**Before (BROKEN):**
```typescript
callbacks: {
  async signIn({ user }) {
    // Creates cart BEFORE user exists in DB
    // Foreign key error!
    await prisma.cart.create({
      data: { userId: user.id }
    });
  }
}
```

**After (FIXED):**
```typescript
events: {
  async createUser({ user }) {
    // Runs AFTER user actually created in DB ✅
    await prisma.cart.create({
      data: { userId: user.id }
    });
  },
  async signIn({ user }) {
    // Safety net: ensure cart exists for returning users
    // Only runs after user is in DB ✅
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email }
    });
    if (dbUser && !existingCart) {
      await prisma.cart.create({
        data: { userId: dbUser.id }
      });
    }
  }
}
```

**Why?**
- `events.createUser` = runs after user + account + session created
- `callbacks.signIn` = runs before user exists (for OAuth)
- Cart depends on user.id existing in DB
- Now sequence is: User created → Cart created → Session established

---

## Test Credentials (Optional)

| Email | Method | Status |
|-------|--------|--------|
| cruz@jccl.com.au | Credentials | ✅ Works |
| cfrangieh22@gmail.com | Credentials or Google OAuth | ✅ Works |
| Any Google account | OAuth | ✅ Should work now |

---

## Debugging: Check Database

```bash
# See all users with their new fields:
sqlite3 /Users/cruzfrangieh/Desktop/instaxhealth\ website/prisma/prisma/dev.db

# Inside sqlite3:
sqlite> SELECT email, image, emailVerified FROM User LIMIT 5;

# Should show Google users with image URL + emailVerified date
```

---

## Next Step: Manual Test

1. **Start incognito session**
2. **Go to login page**: `http://localhost:3000/login`
3. **Click "Sign in with Google"**
4. **Watch server logs** for:
   - ✅ `[AUTH] Created cart for new user: ...`
   - ✅ No Prisma errors
5. **Check redirect**: Should land on `/account` page
6. **Verify success**: User profile shows email + name

If you see cart creation log + redirect works → **Google OAuth is fixed!**
