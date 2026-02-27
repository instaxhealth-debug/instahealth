# Bulk Image Upload - Server-Side Fix

## Critical Issues Fixed

### Bug #1: "Vercel Blob: Failed to retrieve the client token"
**Root Cause:** Frontend was using `@vercel/blob/client` for client-side uploads, which requires a client token endpoint.

**Fix:** Removed ALL client-side upload code. Frontend now sends multipart/form-data to server API route.

### Bug #2: "Unexpected token 'R', 'Request En...' is not valid JSON"
**Root Cause:** Frontend assumed all responses were JSON, crashed when server returned HTML error pages (redirects, 413, etc.).

**Fix:** Added robust error handling - checks `content-type` header before parsing.

---

## Architecture Change

### Before (BROKEN)
```
Browser → @vercel/blob/client.upload()
        → POST /api/vendor/products/images/upload-token (get token)
        → Direct to Vercel Blob (with client token)
        → POST /api/vendor/products/images/update-images (update DB)
        ❌ "Failed to retrieve the client token"
```

### After (FIXED)
```
Browser → FormData with files
        → POST /api/vendor/products/images/bulk-upload
        → Server uses @vercel/blob.put() with BLOB_READ_WRITE_TOKEN
        → Server updates DB
        → Returns JSON response
        ✅ Works!
```

---

## Files Changed

### 1. `app/vendor/products/images/BulkFileUpload.tsx` - REWRITTEN

**Removed:**
- `import { upload } from "@vercel/blob/client"`
- Client-side upload logic
- Upload token requests

**Added:**
- FormData construction
- `fetch("/api/vendor/products/images/bulk-upload")` with multipart/form-data
- Robust error handling (content-type check before JSON parsing)

**Code Change:**
```typescript
// OLD (BROKEN):
import { upload } from "@vercel/blob/client";
const blob = await upload(blobPath, file, {
  access: "public",
  handleUploadUrl: "/api/vendor/products/images/upload-token",
});

// NEW (FIXED):
const formData = new FormData();
files.forEach((file) => formData.append("files", file));
formData.append("mappingMode", mappingMode);
formData.append("replaceExisting", replaceExisting.toString());

const response = await fetch("/api/vendor/products/images/bulk-upload", {
  method: "POST",
  body: formData,
});

// Robust error handling
const contentType = response.headers.get("content-type");
if (contentType?.includes("application/json")) {
  data = await response.json();
} else {
  const text = await response.text();
  throw new Error(`Server error (${response.status}): ${text.substring(0, 200)}`);
}
```

### 2. `app/api/vendor/products/images/bulk-upload/route.ts` - UPDATED

**Added:**
- BLOB_READ_WRITE_TOKEN validation
- Returns JSON error if token missing

**Code Change:**
```typescript
export async function POST(req: NextRequest) {
  try {
    // NEW: Check for BLOB_READ_WRITE_TOKEN
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[BULK_UPLOAD] BLOB_READ_WRITE_TOKEN is missing");
      return NextResponse.json(
        { error: "Server configuration error: BLOB_READ_WRITE_TOKEN missing" },
        { status: 500 }
      );
    }

    const { vendorId } = await requireVendor();
    // ... rest of upload logic (already uses server-side put())
  }
}
```

### 3. `app/api/debug/blob/route.ts` - NEW

**Purpose:** Debug endpoint to check Blob configuration

```typescript
export async function GET() {
  return NextResponse.json({
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    runtimeEnv: process.env.VERCEL_ENV || "local",
    nodeEnv: process.env.NODE_ENV || "development",
  });
}
```

### 4. Files DELETED (No Longer Needed)

- `app/api/vendor/products/images/upload-token/route.ts` ❌ Removed
- `app/api/vendor/products/images/update-images/route.ts` ❌ Removed

These endpoints were only needed for client-side uploads.

### 5. `middleware.ts` - VERIFIED

Already correctly configured:
```typescript
if (pathname.startsWith("/api") || ...) {
  return NextResponse.next(); // ✅ No redirects for /api routes
}
```

---

## Environment Variables

### Required
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

**Location:**
- Local: `.env.local`
- Production: Vercel Dashboard → Environment Variables

**Verification:**
```bash
# Test locally
curl http://localhost:3000/api/debug/blob

# Expected response
{
  "hasBlobToken": true,
  "runtimeEnv": "local",
  "nodeEnv": "development"
}
```

---

## Testing Checklist

### Local Testing

1. **Verify Environment**
   ```bash
   # Check .env.local has BLOB_READ_WRITE_TOKEN
   grep BLOB_READ_WRITE_TOKEN .env.local

   # Should output: BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
   ```

2. **Start Dev Server**
   ```bash
   npm run dev
   ```

3. **Check Debug Endpoint**
   ```bash
   curl http://localhost:3000/api/debug/blob

   # Expected:
   # {
   #   "hasBlobToken": true,
   #   "runtimeEnv": "local",
   #   "nodeEnv": "development"
   # }
   ```

   **If `hasBlobToken: false`:**
   - Add `BLOB_READ_WRITE_TOKEN` to `.env.local`
   - Get value from Vercel Dashboard → Storage → Blob
   - Restart dev server

4. **Test Upload (Filename Mode)**
   - Navigate to `/vendor/products/images`
   - Create test product with SKU `TEST001`
   - Create image file named `TEST001.jpg`
   - Upload via "Upload Files" tab (Filename = SKU mode)
   - **Expected:**
     - Upload succeeds
     - Result shows green checkmark
     - Database updated: `Product.imageUrl` contains Vercel Blob URL
   - **If error:**
     - Check browser console for error details
     - Check server logs for `[BULK_UPLOAD]` messages
     - Verify BLOB_READ_WRITE_TOKEN is set

5. **Test Error Handling**
   - Upload file with invalid SKU (e.g., `NOTEXIST999.jpg`)
   - **Expected:**
     - No crash
     - Clear error message: "Product not found for SKU: NOTEXIST999"
     - Result shows red error icon

6. **Test Oversized Batch**
   - Try to upload 15 files at once
   - **Expected:**
     - Toast error: "Too many files - Maximum 10 files per batch"
     - Files NOT uploaded

### Production Testing (After Deploy)

1. **Verify Environment Variables**
   ```bash
   # In Vercel Dashboard:
   # Settings → Environment Variables → Check BLOB_READ_WRITE_TOKEN exists
   ```

2. **Deploy to Production**
   ```bash
   git add .
   git commit -m "fix: use server-side blob uploads only"
   git push origin main

   # Wait for Vercel deployment to complete
   ```

3. **Check Debug Endpoint**
   ```bash
   curl https://your-domain.com/api/debug/blob

   # Expected:
   # {
   #   "hasBlobToken": true,
   #   "runtimeEnv": "production",
   #   "nodeEnv": "production"
   # }
   ```

   **If `hasBlobToken: false`:**
   - Go to Vercel Dashboard → Environment Variables
   - Add `BLOB_READ_WRITE_TOKEN`
   - Redeploy

4. **Test Upload in Production**
   - Log in as vendor
   - Navigate to `/vendor/products/images`
   - Upload 3-5 test images
   - **Expected:**
     - All upload successfully
     - Images visible on marketplace
     - No console errors

5. **Monitor for Errors**
   - Vercel Dashboard → Logs
   - Look for `[BULK_UPLOAD]` entries
   - Check for errors related to Blob uploads

---

## Error Messages Guide

### Expected (Good) Errors

| Error | Meaning | Fix |
|-------|---------|-----|
| "Too many files - Maximum 10 files per batch" | User selected >10 files | Select fewer files |
| "Product not found for SKU: XXX" | SKU doesn't exist | Check SKU spelling |
| "Product already has an image..." | Image exists, replace OFF | Enable "Replace existing" |
| "Server configuration error: BLOB_READ_WRITE_TOKEN missing" | Missing env var | Add BLOB_READ_WRITE_TOKEN |

### BAD Errors (Should NOT See)

| Error | Why It's Gone |
|-------|---------------|
| "Failed to retrieve the client token" | ✅ No longer using client-side uploads |
| "Unexpected token 'R'" | ✅ Added content-type check before JSON parsing |
| HTML in response | ✅ All API routes return JSON |

---

## Debugging Commands

### Check if Blob token is set
```bash
# Local
grep BLOB_READ_WRITE_TOKEN .env.local

# Production
vercel env ls
```

### Test API directly
```bash
# Create test FormData
curl -X POST http://localhost:3000/api/vendor/products/images/bulk-upload \
  -H "Cookie: your-session-cookie" \
  -F "files=@test.jpg" \
  -F "mappingMode=filename" \
  -F "replaceExisting=false"

# Expected: JSON response with results array
```

### Check server logs
```bash
# Local
# Look in terminal running `npm run dev`

# Production
# Vercel Dashboard → Deployments → [latest] → Logs
```

---

## Build Commands

```bash
# Clean install
rm -rf .next node_modules
npm install

# Build
npm run build

# Expected output:
# ✓ Compiled successfully
# ƒ /vendor/products/images    12.7 kB    119 kB
# ƒ /api/vendor/products/images/bulk-upload    0 B    0 B
# ƒ /api/debug/blob    0 B    0 B
```

---

## Summary

### What Changed
- ✅ Removed ALL client-side blob upload code
- ✅ Frontend sends FormData to server API
- ✅ Server uses `@vercel/blob.put()` with BLOB_READ_WRITE_TOKEN
- ✅ Added robust error handling (content-type checks)
- ✅ Added debug endpoint for token verification
- ✅ Deleted unnecessary client-side upload endpoints

### What Stayed The Same
- ✅ Vendor authentication (requireVendor)
- ✅ Vendor-scoped database queries
- ✅ SKU mapping (filename or CSV)
- ✅ File validation (type, size, batch limits)
- ✅ Security (HTTPS-only, no cross-vendor access)

### Build Status
✅ **PASSED** - All TypeScript errors fixed

### Ready for Production
✅ All critical bugs fixed
✅ Server-side uploads only
✅ JSON responses guaranteed
✅ Clear error messages
✅ Debug endpoint available

---

**Status:** 🚀 **READY TO DEPLOY**

Just ensure `BLOB_READ_WRITE_TOKEN` is set in production environment variables before deployment!
