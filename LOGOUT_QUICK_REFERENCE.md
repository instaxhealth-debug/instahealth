# Logout + Protected Routes - Quick Reference

## The Problem (Before Fix)

❌ User clicks logout but `/account` still loads  
❌ Session is cleared server-side but UI shows "Account"  
❌ Back button can access protected pages  
❌ Stale session state in browser  

## The Solution (After Fix)

✅ Logout clears session AND updates UI  
✅ Protected routes redirect before rendering  
✅ Back button doesn't expose protected content  
✅ All state reads from `useSession()` (never cached)  

---

## Implementation

### Logout Button Handler

```typescript
const handleSignOut = async () => {
  setIsLoading(true);
  try {
    await signOut({ redirect: false });    // 1. Clear session
    router.refresh();                       // 2. Revalidate components
    router.replace("/login");               // 3. Navigate (replace history)
  } catch (error) {
    setIsLoading(false);
  }
};
```

### Header Session Reading

```typescript
const { data: session } = useSession();

// ✅ CORRECT: Renders based on live session
{session ? "Account" : "Login"}

// ❌ WRONG: Caches session state
const [isLoggedIn, setIsLoggedIn] = useState(!!session);
{isLoggedIn ? "Account" : "Login"}  // Stays true after logout
```

### Protected Route Guard

```typescript
export default async function AccountPage() {
  const session = await auth();  // Server-side check
  
  if (!session) {
    redirect("/login");  // Redirect before rendering
  }
  
  return (...);
}
```

---

## What Happens on Logout

```
Click Logout
  ↓
await signOut() → Session cleared on server
  ↓
router.refresh() → Server components re-run
  ↓
Header component sees session=null → Renders "Login"
  ↓
router.replace("/login") → Navigate (replace history)
  ↓
User on /login page, fully logged out ✓
```

---

## What Happens on Protected Page Access After Logout

```
User tries to access /account
  ↓
app/account/page.tsx executes (server-side)
  ↓
const session = await auth() → null (no valid session)
  ↓
redirect("/login") → User redirected before rendering
  ↓
User cannot see account content ✓
```

---

## Testing Checklist

- [ ] Click logout → redirects to /login ✓
- [ ] After logout, `/api/auth/session` returns `null` ✓
- [ ] Header shows "Login" (not "Account") ✓
- [ ] Try accessing `/account` → redirects to /login ✓
- [ ] Try accessing `/orders` → redirects to /login ✓
- [ ] Back button doesn't go to protected pages ✓
- [ ] Button disabled during logout ✓
- [ ] Shows "Signing out..." text ✓

---

## Key Files

| File | What It Does |
|------|--------------|
| `components/ui/LogoutButton.tsx` | Logout handler with correct async flow |
| `components/layout/Header.tsx` | Reactive header that updates on logout |
| `app/account/page.tsx` | Protected with server-side session check |
| `app/orders/page.tsx` | Protected with server-side session check |
| `app/admin/page.tsx` | Protected with admin-only check |

---

## Common Mistakes to Avoid

❌ `router.push()` instead of `router.replace()`  
❌ `router.refresh()` after `router.push()`  
❌ Not awaiting `signOut()`  
❌ Caching session in local state  
❌ Checking localStorage instead of `useSession()`  
❌ Only client-side route guards  
❌ Not disabling button during logout  

✅ `await signOut()` → `router.refresh()` → `router.replace()`  
✅ Read session from `useSession()` only  
✅ Server-side guards on all protected routes  
✅ Button disabled with loading state  

---

## The Flow in One Sentence

> **Await session clear, refresh server components, navigate safely—never redirect before the session is actually gone.**

---

## Verification

Run this to verify logout works:

```bash
# 1. Sign in
→ Visit http://localhost:3000/login
→ Enter credentials
→ Should go to /account

# 2. Check session exists
→ Open DevTools Network tab
→ Request /api/auth/session
→ Should return { user: {...} }

# 3. Logout
→ Click "Logout" button in header
→ Should show spinner
→ Should redirect to /login

# 4. Verify logged out
→ Request /api/auth/session again
→ Should return null

# 5. Try protected page
→ Visit /account directly
→ Should redirect to /login
```

If all above work: ✅ Logout is fixed!
