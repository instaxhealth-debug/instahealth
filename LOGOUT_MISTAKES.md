# Common Logout Mistakes to Avoid

## ❌ Mistake #1: Redirecting Before Session is Cleared

```typescript
// WRONG - Redirect happens before session is cleared
const handleLogout = async () => {
  await signOut({ redirect: false });
  router.push("/");        // ❌ Navigates immediately
  router.refresh();        // ❌ Called after redirect (too late)
};
```

**Problem:** By the time `router.refresh()` runs, the user is already on `/`. The component renders with stale session data.

**Fix:** Reverse the order
```typescript
const handleLogout = async () => {
  await signOut({ redirect: false });
  router.refresh();        // ✅ Revalidate first
  router.push("/");        // ✅ Navigate after refresh
};
```

---

## ❌ Mistake #2: Not Awaiting signOut()

```typescript
// WRONG - Doesn't wait for signOut to complete
const handleLogout = () => {
  signOut({ redirect: false });  // ❌ Not awaited
  router.push("/");              // ❌ Runs immediately
};
```

**Problem:** Session cookie is cleared asynchronously. Navigation happens before it's actually cleared.

**Fix:** Always await
```typescript
const handleLogout = async () => {
  await signOut({ redirect: false });  // ✅ Wait for it to complete
  router.refresh();
  router.push("/");
};
```

---

## ❌ Mistake #3: Using Automatic Redirect

```typescript
// WRONG - Relies on signOut's automatic redirect
const handleLogout = () => {
  signOut({ redirect: true });  // ❌ Relies on NextAuth's redirect
};
```

**Problem:** You lose control of the flow. You can't:
- Disable the button
- Show loading state
- Handle errors
- Run additional cleanup

**Fix:** Use `redirect: false` and control the flow manually
```typescript
const handleLogout = async () => {
  await signOut({ redirect: false });  // ✅ You control the flow
  router.refresh();
  router.push("/");
};
```

---

## ❌ Mistake #4: Not Disabling the Button

```typescript
// WRONG - User can click logout multiple times
const handleLogout = async () => {
  await signOut({ redirect: false });
  router.refresh();
  router.push("/");
  // ❌ No button disabled state
};

return <button onClick={handleLogout}>Logout</button>;
```

**Problem:** User can double-click or triple-click logout, causing multiple sign-out attempts.

**Fix:** Disable button during logout
```typescript
const [isLoading, setIsLoading] = useState(false);

const handleLogout = async () => {
  setIsLoading(true);  // ✅ Disable button
  try {
    await signOut({ redirect: false });
    router.refresh();
    router.push("/");
  } catch (error) {
    setIsLoading(false);  // ✅ Re-enable on error
  }
};

return <button onClick={handleLogout} disabled={isLoading}>Logout</button>;
```

---

## ❌ Mistake #5: Caching Session in Local State

```typescript
// WRONG - Header caches session in local state
export function Header() {
  const { data: session } = useSession();
  const [isLoggedIn, setIsLoggedIn] = useState(!!session);  // ❌ Cache!

  return (
    <>
      {isLoggedIn ? "Account" : "Login"}  // ❌ Stale state
    </>
  );
}
```

**Problem:** After logout, `session` becomes `null`, but `isLoggedIn` stays `true`. Header shows wrong state.

**Fix:** Read session directly, don't cache it
```typescript
export function Header() {
  const { data: session } = useSession();  // ✅ Always fresh

  return (
    <>
      {session ? "Account" : "Login"}  // ✅ Always accurate
    </>
  );
}
```

---

## ❌ Mistake #6: Using localStorage for Auth State

```typescript
// WRONG - localStorage persists after logout
const handleLogout = async () => {
  await signOut({ redirect: false });
  localStorage.removeItem("auth");  // ❌ Separate cache to manage
};

export function Header() {
  const auth = localStorage.getItem("auth");
  return auth ? "Account" : "Login";  // ❌ Unreliable
}
```

**Problem:** If you forget to clear localStorage, or if logout fails, you have inconsistent state.

**Fix:** Use only NextAuth session
```typescript
export function Header() {
  const { data: session } = useSession();
  return session ? "Account" : "Login";  // ✅ Single source of truth
}
```

---

## ❌ Mistake #7: No Error Handling

```typescript
// WRONG - If logout fails, button stays disabled forever
const [isLoading, setIsLoading] = useState(false);

const handleLogout = async () => {
  setIsLoading(true);
  await signOut({ redirect: false });
  router.refresh();
  router.push("/");
  // ❌ If error occurs, isLoading never becomes false
};
```

**Problem:** Network error during logout? Button stays disabled, user is stuck.

**Fix:** Handle errors and re-enable button
```typescript
const handleLogout = async () => {
  setIsLoading(true);
  try {
    await signOut({ redirect: false });
    router.refresh();
    router.push("/");
  } catch (error) {
    console.error("Logout failed:", error);
    setIsLoading(false);  // ✅ Re-enable on error
    setError("Failed to sign out. Please try again.");
  }
};
```

---

## ❌ Mistake #8: Mixing Page Router and App Router APIs

```typescript
// WRONG - Page Router (useRouter from next/router) + App Router (redirect from next/navigation)
import { useRouter } from "next/router";  // ❌ Page Router
import { redirect } from "next/navigation";  // ❌ App Router (server-only)

const handleLogout = () => {
  redirect("/");  // ❌ Can't call from client
};
```

**Problem:** Incompatible APIs. `redirect()` is server-only.

**Fix:** Use App Router's `useRouter` and `useNavigation`
```typescript
import { useRouter } from "next/navigation";  // ✅ App Router

const handleLogout = async () => {
  const router = useRouter();
  await signOut({ redirect: false });
  router.refresh();
  router.push("/");  // ✅ Works in App Router
};
```

---

## ✅ The Correct Pattern

```typescript
"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setIsLoading(true);
    setError("");
    try {
      // 1. Clear session (must await)
      await signOut({ redirect: false });

      // 2. Revalidate server components
      router.refresh();

      // 3. Navigate (after session is cleared)
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
      setError("Failed to sign out. Please try again.");
      setIsLoading(false);  // Re-enable button on error
    }
  };

  return (
    <button onClick={handleLogout} disabled={isLoading}>
      {isLoading ? "Signing out..." : "Sign Out"}
    </button>
  );
}
```

---

## Checklist: Is Your Logout Correct?

- [ ] `await signOut({ redirect: false })`
- [ ] `router.refresh()` before `router.push()`
- [ ] Button disabled during logout
- [ ] Loading state with visual feedback
- [ ] Error handling with re-enable button
- [ ] No localStorage auth caching
- [ ] Header reads session directly (not cached)
- [ ] No custom "loggedIn" state
- [ ] Using App Router APIs (not Page Router)

**If all checked: ✅ Your logout is correct!**
