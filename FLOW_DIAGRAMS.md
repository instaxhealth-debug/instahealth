# Address Selection Flow Diagram

## High-Level Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                    /account/addresses (Main Page)                    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Add Address Card                  │  Your Addresses Card       │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │ Label:  [Home        ]            │  ✓ Home: Dubai Marina      │ │
│  │                                   │  ✓ Work: Sheikh Zayed Rd  │ │
│  │ Address: [Click to search...]     │                            │ │
│  │          (shows selected addr)    │  [Delete] [Delete]        │ │
│  │                                   │                            │ │
│  │ Coords: Lat 25.2048, Lng 55.2708 │                            │ │
│  │ [Save Address]                    │                            │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│                          ▼ (on button click)                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

                                    │
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌──────────────────────┐      ┌──────────────────────┐
        │  AddressSearchModal   │      │   AddressMapModal    │
        └──────────────────────┘      └──────────────────────┘
```

## Search Flow

```
User clicks "Address" button
                │
                ▼
        SearchModal opens
        (isSearchModalOpen = true)
                │
                ▼
        Input auto-focused
        (ref.current.focus())
                │
                ▼
        User types "Dubai M..."
        onChange fires immediately
        (state updates synchronously)
                │
                ▼
        300ms debounce timer started
        (prevents rapid API calls)
                │
                ▼
        Timer expires → fetchPredictions()
        calls AutocompleteService.getPlacePredictions()
                │
                ▼
        Server responds with predictions array
                │
                ▼
        Predictions render in dropdown list
        (setPredictions, setShowPredictions = true)
                │
                ▼
        User clicks prediction
        onClick handler fires
        (no setTimeout delays)
                │
                ▼
        handleSelectPrediction() called
        POST /api/geo/resolve-place with placeId
                │
                ▼
        Server returns: {lat, lng, formattedAddress, ...}
                │
                ▼
        onSelectPrediction callback in parent
        Updates: selectedAddress, selectedPlaceId, selectedLat, selectedLng
                │
                ▼
        Modal closes
        (setIsSearchModalOpen = false)
                │
                ▼
        Page shows address + coordinates
        User enters label & clicks Save
```

## Map Flow

```
User clicks "Set location on map"
                │
                ▼
        SearchModal closes
        MapModal opens
        (isMapModalOpen = true)
                │
                ▼
        Google Map renders in modal
        center: {lat: 25.2048, lng: 55.2708} (Dubai)
        Marker at center
                │
                ▼
        User drags map
        map.center_changed event fires
        marker.setPosition(newCenter)
        setMapCenter({lat, lng})
                │
                ▼
        User stops dragging
        Clicks "Confirm location" button
                │
                ▼
        POST /api/geo/reverse
        with { lat: mapCenter.lat, lng: mapCenter.lng }
                │
                ▼
        Server calls Google Geocoding API
        Returns formatted address
                │
                ▼
        onConfirm callback in parent
        Updates: selectedAddress, selectedPlaceId (null), selectedLat, selectedLng
                │
                ▼
        Modal closes
        (setIsMapModalOpen = false)
                │
                ▼
        Page shows reverse-geocoded address + coordinates
        User enters label & clicks Save
```

## Save Flow

```
User enters label: "Home"
Selected address: "Dubai Marina, Dubai"
Selected coords: lat 25.2048, lng 55.2708
                │
                ▼
        User clicks [Save Address]
                │
                ▼
        handleSave() validates:
        ├─ label.trim() ✓
        ├─ selectedAddress ✓
        ├─ selectedLat ✓
        ├─ selectedLng ✓
                │
                ▼
        POST /api/account/addresses
        body: {
          label: "Home",
          formattedAddress: "Dubai Marina, Dubai",
          placeId: "ChIJ..." or null,
          latitude: 25.2048,
          longitude: 55.2708
        }
                │
                ▼
        Server receives request
        ├─ Validates all fields present
        ├─ Creates normalized hash from lat/lng
        ├─ Checks for duplicates
        ├─ Creates Address record
        └─ Returns { address, isExisting }
                │
                ▼
        Client resets form:
        ├─ label = ""
        ├─ selectedAddress = ""
        ├─ selectedPlaceId = null
        ├─ selectedLat = null
        ├─ selectedLng = null
                │
                ▼
        fetchAddresses() refreshes list
                │
                ▼
        Address appears in "Your Addresses" card
```

## State Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                      Page Component                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current Form State                                        │
│  ├─ label: "Home"                                          │
│  ├─ selectedAddress: "Dubai Marina, Dubai"               │
│  ├─ selectedPlaceId: "ChIJ..." (or null if map)           │
│  ├─ selectedLat: 25.2048                                  │
│  ├─ selectedLng: 55.2708                                  │
│                                                             │
│  Modal State                                               │
│  ├─ isSearchModalOpen: boolean                            │
│  ├─ isMapModalOpen: boolean                               │
│                                                             │
│  Data State                                                │
│  ├─ addresses: Address[]                                  │
│  ├─ isLoading: boolean                                    │
│  ├─ isSaving: boolean                                     │
│  ├─ errorMsg: string                                      │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │        AddressSearchModal (isSearchModalOpen)    │     │
│  ├──────────────────────────────────────────────────┤     │
│  │ ├─ searchQuery: "Dubai M"                        │     │
│  │ ├─ predictions: Prediction[]                     │     │
│  │ ├─ isLoading: boolean                            │     │
│  │ ├─ showPredictions: boolean                      │     │
│  │ ├─ error: string | null                          │     │
│  │ └─ autocompleteServiceRef                        │     │
│  │                                                   │     │
│  │ onSelectPrediction() → parent handleSelect...()  │     │
│  │ onOpenMapModal() → setIsMapModalOpen(true)       │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │        AddressMapModal (isMapModalOpen)          │     │
│  ├──────────────────────────────────────────────────┤     │
│  │ ├─ mapCenter: { lat, lng }                       │     │
│  │ ├─ isLoadingAddress: boolean                     │     │
│  │ ├─ error: string | null                          │     │
│  │ ├─ map: google.maps.Map                          │     │
│  │ └─ marker: google.maps.Marker                    │     │
│  │                                                   │     │
│  │ onConfirm() → parent handleConfirm()             │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoint Dependencies

```
┌────────────────────────────────┐
│    /account/addresses/page.tsx │
└────────────────┬───────────────┘
                 │
    ┌────────────┼────────────┬─────────────────┐
    │            │            │                 │
    ▼            ▼            ▼                 ▼
   GET          POST        DELETE             POST
  /api/acc     /api/acc    /api/acc/      /api/geo/
  ount/addr   ount/addr   addresses/:id   resolve-
  esses      esses                       place

    │            │            │                 │
    │            │            │                 └─► Google Places API
    │            │            │                    (PlaceDetails)
    │            │            │
    │            │            └─► Prisma.address.delete()
    │            │
    │            ├─► Prisma.address.create()
    │            │
    │            └─► /api/geo/reverse ◄─┐
    │               (for validation)    │
    │                                    └─── Google Geocoding API
    │
    └─► Prisma.address.findMany()
        (list saved addresses)

AddressSearchModal
    │
    ├─► AutocompleteService.getPlacePredictions()
    │   (Google Maps API - client)
    │
    └─► /api/geo/resolve-place
        (to get lat/lng for selected prediction)

AddressMapModal
    │
    ├─► google.maps.Map.center_changed
    │   (real-time as user drags)
    │
    └─► /api/geo/reverse
        (to get address when pin position confirmed)
```

## Input Locking Fix - Before vs After

### ❌ BEFORE (Input Locking Bug)

```
User Input: "Dubai Marina" (12 characters)
                │
                ├─ React: setState(addressQuery = "Dubai Marina")
                │           (async, not immediate)
                │
                ├─ Autocomplete Listener: fires on every keystroke
                │                         (also async)
                │
                ├─ RACE CONDITION:
                │  ├─ Autocomplete reads OLD DOM value (e.g., "Du")
                │  ├─ Autocomplete calls event handler
                │  ├─ Handler calls setState again (overwrites React's setState)
                │  ├─ React re-render sets value to "Dubai Marina"
                │  ├─ But Autocomplete listener already modified the element
                │  └─ Result: Input shows "Du" despite React trying to set "Dubai Marina"
                │
                ▼
        User CANNOT continue typing
        Input is FROZEN / LOCKED
        Must reload page to fix
```

### ✅ AFTER (No Input Locking)

```
User Input: "Dubai Marina" (typing continuously)
                │
                ├─ Input onChange fires immediately
                │  └─ React: setState(searchQuery = new character)
                │             (synchronous state update)
                │
                ├─ Input re-renders INSTANTLY
                │  └─ value={searchQuery} always matches actual state
                │
                ├─ 300ms debounce timer started
                │  └─ Delays AutocompleteService API call only
                │     (does NOT delay input rendering)
                │
                ├─ User keeps typing
                │  └─ Each keystroke: state updates immediately
                │     input re-renders immediately
                │     (no library interference)
                │
                ├─ Debounce timer expires
                │  └─ AutocompleteService.getPlacePredictions() called
                │     (user has already typed "Dubai Marina")
                │
                ▼
        User can type 50+ characters continuously
        ZERO freezing
        ZERO locking
        Smooth, responsive experience ✓
```

## Why Modal Structure Helps

```
OLD: Inline Input on Page
─────────────────────────
┌──────────────────────────────┐
│  Page Component              │
│  ├─ Address Input (inline)   │  ◄─ Autocomplete library attached here
│  └─ Predictions (dropdown)   │  ◄─ Library manages this too
│                              │
│  Problem: Multiple elements  │
│  managed by both React AND   │
│  Autocomplete library        │
│                              │
│  Result: Race conditions     │
└──────────────────────────────┘


NEW: Modal Component (isolated)
──────────────────────────────
┌──────────────────────────────┐
│  Page Component              │
│  ├─ Address Display (static) │  ◄─ No library involvement
│  └─ [Click to Search] button │  ◄─ Just a button
│                              │
│  Separate Modal:             │
│  ┌──────────────────────┐    │
│  │ SearchModal          │    │
│  │ ├─ Input             │    │  ◄─ React ONLY
│  │ ├─ Predictions List  │    │  ◄─ React ONLY
│  │ └─ Close Button      │    │  ◄─ React ONLY
│  └──────────────────────┘    │  
│                              │
│  Benefit: Complete isolation │
│  Input is ONLY controlled    │
│  by React (no interference)  │
└──────────────────────────────┘
```
