# InstaHealth Performance Baseline Report

**Date:** 2026-02-05
**Mode:** Development (production build had errors)
**Methodology:** Lighthouse 13.x audits on key pages

---

## EXECUTIVE SUMMARY

**Current Performance Status:** ⚠️ **NEEDS IMPROVEMENT**

- **Homepage:** 85/100 (GOOD) - Minor LCP optimization needed
- **Cart Page:** 63/100 (POOR) - **CRITICAL ISSUES**

**Top 3 Critical Problems:**
1. **Cart LCP is 7.9s** (should be < 2.5s) → 216% slower than target
2. **Duplicate API calls** (4x /api/auth/session, 2x /api/locations/*) → Wasted requests
3. **Massive JS bundle** (1.3 MB main-app.js) → 936ms parse/eval time

---

## LIGHTHOUSE SCORES

### Homepage (/)
```
Performance:  85/100  ✓ GOOD
LCP:          4.2s    ⚠️ Needs improvement (target: <2.5s)
CLS:          0       ✓ Excellent
FCP:          0.8s    ✓ Good
TBT:          20ms    ✓ Excellent
Speed Index:  2.7s    ✓ Good
```

**Resources:**
- Network Requests: 29
- Total Transfer: 583 KB
- Main Thread: 300ms

### Cart Page (/cart)
```
Performance:  63/100  ✗ POOR
LCP:          7.9s    ✗ CRITICAL (target: <2.5s)
CLS:          0       ✓ Excellent
FCP:          0.8s    ✓ Good
TBT:          520ms   ✗ High blocking time (target: <200ms)
Speed Index:  1.2s    ✓ Good
```

**Resources:**
- Network Requests: 28
- Total Transfer: **2,576 KB** (4.4x heavier than homepage!)
- Main Thread: **1,800ms** (6x slower than homepage!)

---

## TOP 5 BOTTLENECKS (WITH EVIDENCE)

### 1. CRITICAL: Duplicate API Calls on Cart Page

**Evidence from Lighthouse Network Log:**
```
4x /api/auth/session       ← Called FOUR times on single page load
2x /api/locations/active    ← Duplicate location check
2x /api/locations/selected  ← Another duplicate location call
```

**Impact:**
- Wasted network requests = slower page load
- Unnecessary server load
- Potential data inconsistency if responses differ

**Root Cause:** Multiple components/hooks calling same endpoints independently without coordination or caching.

**Target Fix:** Consolidate to 1 call each via:
- Centralized auth state management
- Location context provider with caching
- OR single "bootstrap" endpoint returning all user data

---

### 2. CRITICAL: Cart Page LCP at 7.9 seconds

**Evidence:**
- **Cart LCP:** 7.9s
- **Homepage LCP:** 4.2s
- **Target LCP:** < 2.5s (Google Core Web Vitals)

**Comparison:** Cart is 3.2x slower than target, 1.9x slower than homepage.

**Likely Causes:**
- 2.5 MB JS bundle blocking render (see #3)
- Missing Suspense boundaries → waits for all data before showing anything
- No loading skeletons → user sees blank screen
- Heavy client-side rendering of cart items

**Target Fix:**
- Add `<Suspense>` with skeleton loaders
- Stream cart data from server
- Pre-render cart shell with loading states
- Defer non-critical JS (analytics, chat widgets)

---

### 3. CRITICAL: Massive JavaScript Bundle (1.3 MB main-app.js)

**Evidence from Bootup Time Analysis:**
```
936ms  /_next/static/chunks/main-app.js  ← MASSIVE PARSE TIME
252ms  webpack-internal next/dist/compile
98ms   /_next/static/chunks/app/layout.js
68ms   /_next/static/chunks/app/cart/page.js
```

**Total JS Parse/Eval Time:** 936ms on main-app.js alone!

**Bundle Sizes:**
- main-app.js: **1,313 KB**
- app/layout.js: 415 KB
- app/cart/page.js: 286 KB
- global-error.js: 137 KB
- app/error.js: 137 KB

**Total Cart Page JS:** ~2.3 MB

**Impact:**
- 936ms+ of main thread blocking just to parse JavaScript
- Contributes directly to 520ms TBT (Total Blocking Time)
- Mobile devices will be even worse

**Target Fix:**
- Code splitting: Move vendor-specific UI to lazy-loaded components
- Remove unused dependencies (check webpack-bundle-analyzer)
- Use dynamic imports for modals, drawers, admin panels
- Consider lighter alternatives to heavy libraries

---

### 4. HIGH: Main Thread Work (1.8s on Cart)

**Evidence from Main Thread Breakdown:**
```
Cart Page Total: 1,778ms

906ms  Script Evaluation          ← 51% of time
574ms  Script Parsing & Compilation ← 32% of time
185ms  Other
52ms   Style & Layout
23ms   Garbage Collection
```

**Comparison:**
- **Cart:** 1,778ms main thread work
- **Homepage:** 300ms main thread work
- **6x slower!**

**Root Cause:**
- Large JS bundles (see #3)
- Potential heavy computations in cart rendering
- No memoization of expensive calculations

**Target Fix:**
- Memoize cart calculations (totals, grouped items)
- Use `useMemo` for filtered/sorted lists
- Check for unnecessary re-renders with React DevTools Profiler
- Virtualize long item lists if >20 items

---

### 5. MEDIUM: TTFB at 820ms on Homepage

**Evidence:**
- **Homepage TTFB:** 820ms
- **Cart TTFB:** 340ms

**Note:** Cart TTFB is actually better, suggesting homepage does more server work.

**Impact:**
- 820ms before browser receives first byte
- User sees blank screen during this time
- Slows down EVERY page load

**Possible Causes:**
- Database queries on homepage (categories, featured products, vendors)
- No caching on frequently accessed data
- Cold starts (serverless functions)
- Neon database in different region (check latency)

**Target Fix:**
- Add Next.js caching: `fetch(url, { next: { revalidate: 60 } })`
- Cache vendor/category lists (rarely change)
- Use ISR (Incremental Static Regeneration) for homepage
- Consider Redis/Upstash for hot data

---

## NETWORK REQUEST ANALYSIS

### Homepage (29 requests, 583 KB)
- ✓ No duplicate requests detected
- ✓ Reasonable number of requests
- ✓ Small total transfer size

### Cart Page (28 requests, 2,576 KB)
- ✗ **8 duplicate requests** (4x auth session, 2x locations active, 2x locations selected)
- ✗ **2.5 MB total transfer** (4.4x heavier than homepage)
- ✗ 1.3 MB single JS file

**Duplicate Request Breakdown:**
| Endpoint | Count | Waste |
|----------|-------|-------|
| `/api/auth/session` | 4x | 3 unnecessary calls |
| `/api/locations/active` | 2x | 1 unnecessary call |
| `/api/locations/selected` | 2x | 1 unnecessary call |

**Total Wasted Requests:** 5 per page load

---

## LARGEST RESOURCES

**Cart Page Top 5 (by transfer size):**
1. **1,313 KB** - `/_next/static/chunks/main-app.js` ← CRITICAL
2. **415 KB** - `/_next/static/chunks/app/layout.js`
3. **286 KB** - `/_next/static/chunks/app/cart/page.js`
4. **137 KB** - `/_next/static/chunks/app/global-error.js`
5. **137 KB** - `/_next/static/chunks/app/error.js`

**Observation:** Error handling chunks are large (137 KB each). Consider:
- Lazy load error boundaries
- Remove dev-only error details from production
- Use lighter error UI

---

## COMPARISON: HOMEPAGE VS CART

| Metric | Homepage | Cart | Difference |
|--------|----------|------|------------|
| **Performance Score** | 85 | 63 | **-26% worse** |
| **LCP** | 4.2s | 7.9s | **+88% slower** |
| **TBT** | 20ms | 520ms | **+2,500% worse!** |
| **Main Thread** | 300ms | 1,778ms | **+493% slower** |
| **Transfer Size** | 583 KB | 2,576 KB | **+342% heavier** |
| **Network Requests** | 29 | 28 | -1 (but has duplicates) |

**Conclusion:** Cart page performance is **significantly degraded** compared to homepage. This is likely due to heavy cart logic, duplicate API calls, and massive JS bundles.

---

## CORE WEB VITALS SUMMARY

| Page | LCP | CLS | FCP | Status |
|------|-----|-----|-----|--------|
| **Homepage** | 4.2s ⚠️ | 0 ✓ | 0.8s ✓ | **Needs Improvement** |
| **Cart** | 7.9s ✗ | 0 ✓ | 0.8s ✓ | **Poor** |

**Google Thresholds:**
- LCP: < 2.5s (Good), 2.5-4.0s (Needs Improvement), > 4.0s (Poor)
- CLS: < 0.1 (Good)
- FCP: < 1.8s (Good)

**Verdict:**
- ✓ CLS: Excellent (0 on both pages)
- ✓ FCP: Good (0.8s on both pages)
- ✗ LCP: **BOTH PAGES FAIL** (4.2s homepage, 7.9s cart)

---

## PRIORITY FIXES (BY IMPACT)

### PRIORITY 1 (CRITICAL - DO FIRST)
1. **Eliminate duplicate API calls** on cart page
   - Fix: Create centralized auth/location providers
   - Impact: 5 fewer requests per page = faster load
   - Difficulty: Easy (2-3 hours)

2. **Add Suspense boundaries + loading skeletons** to cart page
   - Fix: Wrap cart content in `<Suspense fallback={<CartSkeleton />}>`
   - Impact: Improve perceived performance, reduce LCP
   - Difficulty: Easy (1-2 hours)

3. **Code split large bundles**
   - Fix: Dynamic imports for admin panels, modals, vendor dashboards
   - Impact: Reduce main-app.js from 1.3 MB to < 500 KB
   - Difficulty: Medium (4-6 hours)

### PRIORITY 2 (HIGH - DO NEXT)
4. **Add caching to frequently accessed endpoints**
   - Fix: Use `fetch(url, { next: { revalidate: 60 } })` for categories/vendors
   - Impact: Reduce TTFB from 820ms to < 200ms
   - Difficulty: Easy (2-3 hours)

5. **Memoize cart calculations**
   - Fix: Use `useMemo` for totals, grouped items, filtered lists
   - Impact: Reduce main thread work, fewer re-renders
   - Difficulty: Easy (1-2 hours)

### PRIORITY 3 (MEDIUM - DO AFTER)
6. **Optimize error boundary bundles**
   - Fix: Lazy load error components, remove dev stack traces from prod
   - Impact: Reduce error.js from 137 KB to < 50 KB
   - Difficulty: Medium (2-3 hours)

7. **Implement ISR for homepage**
   - Fix: Use `export const revalidate = 60` in page.tsx
   - Impact: Pre-render homepage, serve instantly
   - Difficulty: Easy (1 hour)

---

## EXPECTED IMPROVEMENTS (AFTER FIXES)

### Target Metrics (Realistic)
| Metric | Current (Cart) | Target | Improvement |
|--------|----------------|--------|-------------|
| **Performance Score** | 63 | 85+ | +35% |
| **LCP** | 7.9s | < 3.0s | -62% |
| **TBT** | 520ms | < 100ms | -81% |
| **Main Thread** | 1,778ms | < 600ms | -66% |
| **Transfer Size** | 2,576 KB | < 1,000 KB | -61% |
| **Duplicate Requests** | 5 | 0 | -100% |

### Stretch Goal (Optimistic)
| Metric | Target (Optimistic) |
|--------|---------------------|
| **Performance Score** | 90+ |
| **LCP** | < 2.5s (Good) |
| **TBT** | < 50ms |
| **Main Thread** | < 400ms |

---

## NEXT STEPS

1. **Read this report thoroughly** - Understand each bottleneck
2. **Run Priority 1 fixes first** - Biggest impact, easiest wins
3. **Re-run Lighthouse after each fix** - Measure improvement
4. **Document actual results** - Update PERFORMANCE_REPORT.md with before/after
5. **Continue to Priority 2 & 3** - Iterative optimization

---

## APPENDICES

### A. How to Reproduce These Tests

```bash
# 1. Start dev server (production had errors)
npm run dev

# 2. Wait for server to be ready
# ✓ Ready in ~10s

# 3. Run Lighthouse
lighthouse http://localhost:3000 --output=json --output=html --output-path=./homepage --chrome-flags="--headless --no-sandbox" --only-categories=performance

# 4. Repeat for cart page
lighthouse http://localhost:3000/cart --output=json --output=html --output-path=./cart --chrome-flags="--headless --no-sandbox" --only-categories=performance

# 5. Extract metrics
node -e "const data = require('./homepage.report.json'); console.log(data.categories.performance.score * 100);"
```

### B. Production Build Issue

**Note:** Production build (`npm run build && npm run start`) returned 500 errors for /cart, /marketplace, and other pages.

**Error:** Pages failed to render in production mode.

**Recommendation:** Fix production errors before deploying optimizations. Possible causes:
- Missing environment variables in production
- Database connection issues
- Prisma client generation mismatch

**Next Action:** Debug production build separately.

### C. Tools Used

- **Lighthouse 13.x** (via CLI)
- **Node.js analysis scripts** (extracting metrics from JSON reports)
- **Chrome DevTools** (network inspection)

### D. Lighthouse Reports Location

All raw reports saved to:
```
docs/performance-audits/
├── homepage.report.html
├── homepage.report.json
├── cart.report.html
└── cart.report.json
```

View HTML reports in browser for visual analysis.

---

**Report Generated:** 2026-02-05
**Author:** Claude (Performance Audit)
**Status:** Baseline established, awaiting optimization implementation

**END OF BASELINE REPORT**
