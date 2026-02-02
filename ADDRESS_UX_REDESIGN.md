# Address UX Redesign - Complete Implementation

## Overview

The address selection flow has been completely redesigned using a modal-based approach that prevents the "input locking" issue that occurred with the previous inline implementation.

## Architecture

### New Structure

```
app/account/addresses/
├── page.tsx                          # Main page (state & logic)
└── _components/
    ├── AddressSearchModal.tsx        # Search predictions modal
    └── AddressMapModal.tsx           # Map pin selection modal

app/api/geo/
└── reverse/
    └── route.ts                      # NEW: Reverse geocoding endpoint
```

### Design Patterns

**Root Cause Fixed:**
- ✅ NO `google.maps.places.Autocomplete()` attached to input elements
- ✅ Using `AutocompleteService` (data-only) for predictions
- ✅ React owns all input elements completely
- ✅ Modal-based UI prevents focus/blur conflicts

## Implementation Details

### 1. AddressSearchModal Component

**Features:**
- Centered modal (desktop) / bottom sheet (mobile)
- Search input with 300ms debounce
- Predictions list with icons & secondary text
- "Set location on map" option to open map modal
- ESC key to close, overlay click to close
- Body scroll locked while modal open

**Key Props:**
```typescript
isOpen: boolean
onClose: () => void
onSelectPrediction: (pred: {
  placeId: string
  formattedAddress: string
  lat: number
  lng: number
}) => void
onOpenMapModal: () => void
```

**Technical Details:**
- Uses `AutocompleteService().getPlacePredictions()` only
- Controlled input: `value={searchQuery}` with `onChange` handler
- Debounce timer prevents rapid API calls
- Click handlers directly update state (no setTimeout hacks)

### 2. AddressMapModal Component

**Features:**
- Full-screen modal with embedded Google Map
- Draggable map with centered pin
- Real-time coordinate updates
- "Get address..." button with loading state
- Reverse geocoding via `/api/geo/reverse`

**Technical Details:**
- `google.maps.Map` with center_changed listener
- Marker stays centered (pin at map center)
- Drag updates mapCenter state, which updates marker
- Confirm button calls `/api/geo/reverse` to get formatted address

### 3. New Reverse Geocoding Endpoint

**`POST /api/geo/reverse`**

Accepts:
```json
{ "lat": number, "lng": number }
```

Returns:
```json
{
  "formattedAddress": "string",
  "lat": number,
  "lng": number,
  "city": "string",
  "state": "string",
  "country": "string",
  "postalCode": "string"
}
```

Uses Google Geocoding API (server-side with `GOOGLE_MAPS_SERVER_KEY`)

### 4. Page.tsx (Main Component)

**State Structure:**
```typescript
// Current form
label: string                    // Address label
selectedAddress: string          // Formatted address string
selectedPlaceId: string | null   // From search, null if map
selectedLat: number | null       // Coordinates
selectedLng: number | null

// Modal states
isSearchModalOpen: boolean
isMapModalOpen: boolean

// Data
addresses: Address[]             // Saved addresses list
```

**Key Handlers:**
- `handleSelectPrediction()` - From search modal
- `handleConfirmMapLocation()` - From map modal
- `handleSave()` - Validates & persists address
- `handleDelete()` - Removes address

**Validation (in handleSave):**
- ✅ label present & non-empty
- ✅ selectedAddress present & non-empty
- ✅ selectedLat & selectedLng are numbers (not null)
- ✅ placeId required for search results, optional for map

### 5. Updated Address API

**`POST /api/account/addresses`**

New request format:
```json
{
  "label": "string",              // e.g., "Home"
  "formattedAddress": "string",   // Full address from search/reverse geocode
  "placeId": "string | null",     // From AutocompleteService (or null if map)
  "latitude": number,             // From search /api/geo/resolve-place or map reverse
  "longitude": number
}
```

Response:
```json
{
  "address": { id, label, formattedAddress, ... },
  "isExisting": boolean
}
```

## Data Flow

### Search → Select Prediction

1. User clicks "Address" button on page
2. SearchModal opens
3. User types (300ms debounce)
4. AutocompleteService predictions appear
5. Click prediction
6. Modal calls `/api/geo/resolve-place` with placeId
7. Returns formatted address + lat/lng
8. `onSelectPrediction` fires → updates page state
9. Modal closes
10. Address field shows formatted address
11. User enters label, clicks Save

### Map → Confirm Location

1. User clicks "Set location on map" in SearchModal
2. SearchModal closes, MapModal opens
3. User drags map, pin stays centered
4. User clicks "Confirm location"
5. Modal calls `/api/geo/reverse` with lat/lng from map center
6. Returns formatted address
7. `onConfirm` fires → updates page state with address + lat/lng
8. Modal closes
9. Proceed to Save as above

## Why This Design Solves Input Locking

**Previous Problem:**
- Input was inline, attached to the page
- google.maps.places.Autocomplete() directly manipulated the DOM
- On keystroke: React setState → async update → library listener fires → overwrites DOM
- Result: User types 2-4 chars, then input freezes

**New Solution:**
- Input is inside a modal (isolated from page)
- NO library code touches the DOM input
- AutocompleteService is data-only, returns predictions
- React owns input completely
- Predictions rendered separately (not by library)
- User can type 50+ chars continuously with zero freezing

## Mobile Responsiveness

**Desktop (md+):**
- Modal: centered, max-width-2xl
- Bottom sheet: false

**Mobile (< md):**
- SearchModal: bottom sheet (h-1/2, rounded-t-3xl)
- MapModal: full screen (rounded top corners)
- Proper touch targets, scrollable lists

## Testing Checklist

- [ ] Can type 50+ characters continuously (no freezing)
- [ ] Predictions appear after ~300ms while typing
- [ ] Clicking prediction closes modal, fills address field
- [ ] "Set location on map" opens map modal
- [ ] Can drag map, pin stays centered
- [ ] "Confirm location" button shows loading state
- [ ] After confirm, address field filled with reverse-geocoded address
- [ ] Save button requires: label + formatted address + lat/lng
- [ ] Save validation shows real error messages (not generic "1 error")
- [ ] Saved address appears under "Your Addresses"
- [ ] ESC key closes both modals
- [ ] Clicking overlay closes modals
- [ ] Body scroll locked while modals open
- [ ] No console errors, no TypeScript warnings
- [ ] Dev server runs cleanly with ✓ Ready in ~1.4s

## Files Modified/Created

**Created:**
- app/account/addresses/_components/AddressSearchModal.tsx (180 lines)
- app/account/addresses/_components/AddressMapModal.tsx (170 lines)
- app/api/geo/reverse/route.ts (72 lines)

**Modified:**
- app/account/addresses/page.tsx (complete rewrite, 380 lines)
- app/api/account/addresses/route.ts (simplified POST handler)

## Environment Variables Required

Already configured in `.env.local`:
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - For map rendering (client)
- `GOOGLE_MAPS_SERVER_KEY` - For reverse geocoding (server)

## Next Steps for User

1. Open http://localhost:3000/account/addresses
2. Click "Address" field to open search modal
3. Type address (should type smoothly, no freezing)
4. See predictions after ~300ms
5. Click prediction → modal closes, address fills
6. Enter label, click Save
7. Verify address appears under "Your Addresses"

OR

1. Click "Set location on map"
2. Drag map to desired location
3. Click "Confirm location"
4. Address auto-filled with reverse geocoded result
5. Enter label, click Save

## Known Behavior

- placeId is stored for search-selected addresses
- placeId is null for map-only selections (still fully functional)
- Coordinates are always required for saving
- Address deduplication uses normalized hash of coordinates
- All timestamps/metadata managed by Prisma

## No Breaking Changes

- Existing saved addresses remain unchanged
- DELETE endpoint still works (no changes)
- GET endpoint still works (no changes)
- All previous data structures maintained in Prisma schema
