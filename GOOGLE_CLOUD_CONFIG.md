# Google Cloud Configuration Enforcement Checklist

**IMPORTANT:** These steps MUST be completed before testing will work.

---

## Step 1: Verify API Key Restrictions (HTTP Referrers)

### In Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to: **APIs & Services** → **Credentials**
4. Click on your API key
5. Under **Application restrictions**, select **HTTP referrers**

### Must include EXACTLY these HTTP referrers:
```
http://127.0.0.1:3000/*
http://localhost:3000/*
https://instahealth.ae/*
https://www.instahealth.ae/*
```

✅ Verify each one is present  
✅ Application restriction = **Websites** (not Websites (HTTP), not Websites (HTTPS))

---

## Step 2: Enforce API Key Restrictions (API Restrictions)

### In Google Cloud Console (same credentials page):

Under **API restrictions**, select **Restrict key**

**Then select EXACTLY these APIs:**
- ✅ Maps JavaScript API
- ✅ Places API
- ✅ Geocoding API

**Status should show:** "3 APIs selected"

**NOT:** "Don't restrict key" ❌

---

## Step 3: Enable Billing

### In Google Cloud Console:
1. Go to **Billing** → **Billing Accounts**
2. Verify a **valid payment method** is on file
3. Status should be **Active** (green)

---

## Step 4: Verify APIs are Enabled

### In Google Cloud Console:
1. Go to **APIs & Services** → **Enabled APIs & services**
2. Verify these are in the list with **Status: Enabled**:

- ✅ Maps JavaScript API
- ✅ Places API  
- ✅ Geocoding API

If any are **NOT** in the list, click **Enable APIs and Services** and search for them.

---

## Step 5: Verify Environment Variables

In your project's `.env.local`:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAlMHK6BQp9UHo5_Wm7ngiFF_52R_YPVWw
GOOGLE_MAPS_SERVER_KEY=AIzaSyDjadytz1tZyrA9ItXNG8TnaDHBkGJvrVw
```

⚠️ **Make sure these match your actual Google Cloud keys**

---

## Step 6: Hard Refresh Browser

After making any changes to Google Cloud:

1. Clear browser cache: **Ctrl+Shift+Delete** (or **Cmd+Shift+Delete** on Mac)
2. Hard refresh page: **Ctrl+Shift+R** (or **Cmd+Shift+R** on Mac)
3. Close and reopen browser tab

---

## Testing

Once all 5 steps completed:

### 1. Open http://localhost:3000/account/addresses

### 2. Scroll to bottom → Expand "🔧 Google Maps Debug Info"

**Should see:**
```
✅ API Key Configured: true
✅ Current Origin: http://localhost:3000
✅ Maps Loaded: false (will load on first modal open)
✅ window.google.maps Exists: false (will become true)
✅ Has Error: false
```

### 3. Open Browser Console: **F12 → Console tab**

### 4. Click "Address" button

**Console should show:**
```
[GoogleMapsLoader] Starting load with config: {apiKey: "***...", libraries: ["places"], version: "weekly"}
[GoogleMapsLoader] Loader instance created, calling load()
[GoogleMapsLoader] SUCCESS: Google Maps loaded
[GoogleMapsLoader] Verified window.google.maps exists
[AddressSearchModal] Creating AutocompleteService instance
[AddressSearchModal] AutocompleteService ready
```

### 5. Type "soho palm" slowly

**Console should show:**
```
[AddressSearchModal] Fetching predictions for: soho palm
[AddressSearchModal] Prediction status: OK
[AddressSearchModal] Received 5 predictions
```

**Modal should show predictions list** (not "No places found")

### 6. Click "Set location on map"

**Console should show:**
```
[AddressMapModal] Loading Google Maps
[AddressMapModal] Creating map instance
[AddressMapModal] Creating marker
[AddressMapModal] Map initialized successfully
```

**Map should render** (no error box, no Google Maps error overlay)

---

## If Something Fails

### Error: "REQUEST_DENIED..."
- Check Step 1: API key HTTP referrers
- Check Step 4: Places API enabled

### Error: "Maps failed to load..."
- Check Step 4: Maps JavaScript API enabled
- Check Step 2: API key restrictions include Maps JS API
- Check Step 3: Billing active

### Error: "No places found" (for "soho palm")
- Check console: what is the status?
- If `ZERO_RESULTS`: normal (try different search term)
- If `REQUEST_DENIED`: check API key restrictions
- If `INVALID_REQUEST`: check component restrictions (must allow "ae")

### Console shows nothing
- Hard refresh: Cmd+Shift+R (or Ctrl+Shift+R)
- Check if dev server still running: http://localhost:3000 should load

---

## Summary

| Item | Status | How to Fix |
|------|--------|-----------|
| API key HTTP referrers | ✅ Should be set | Step 1 |
| API key API restrictions | ✅ Should have 3 APIs | Step 2 |
| Billing enabled | ✅ Must be active | Step 3 |
| Maps JS API enabled | ✅ Should be in enabled list | Step 4 |
| Places API enabled | ✅ Should be in enabled list | Step 4 |
| Geocoding API enabled | ✅ Should be in enabled list | Step 4 |
| .env.local keys | ✅ Must match Google Cloud | Step 5 |

---

**After completing all steps, proceed to Testing section above.**
