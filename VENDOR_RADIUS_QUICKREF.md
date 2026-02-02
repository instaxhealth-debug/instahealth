# Vendor Service Radius - Quick Reference

## 🎯 What Was Implemented

**MVP Vendor Service Radius Enforcement** - Users can only checkout vendors that service their delivery address. All validation happens server-side before Stripe session creation.

---

## 🔑 Environment Variables

```bash
# Already configured in .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA...  # Client (browser)
GOOGLE_MAPS_SERVER_KEY=AIzaSyD...           # Server only (NEVER expose)
```

---

## 📋 New API Endpoints

### 1. Resolve Place (Server-side)
```
POST /api/geo/resolve-place
Body: { placeId: "ChIJ..." }
Returns: { formattedAddress, lat, lng, components, normalizedHash, placeId }
```

### 2. Address Management (Authenticated)
```
GET    /api/account/addresses          - List user's saved addresses
POST   /api/account/addresses          - Save new address (auto-dedupes)
PATCH  /api/account/addresses/[id]     - Update address label
DELETE /api/account/addresses/[id]     - Delete address
```

### 3. Test Geo Validation
```
GET /api/geo/test                       - Run validation test suite
```

---

## 🔧 Checkout Changes

**New Request Fields**:
```typescript
{
  addressId?: string,   // Use saved address
  placeId?: string,     // OR one-time place ID
  // ... existing fields (locationId, shippingName, etc.)
}
```

**Validation Flow**:
1. User provides `addressId` OR `placeId`
2. Server resolves delivery lat/lng
3. Server groups cart items by vendor
4. For each vendor:
   - Load vendor geo settings from DB
   - Validate distance using `assertAddressInVendorRadius()`
   - If fails → return 400 error with details
   - If all pass → create Stripe session

**Error Response** (out of radius):
```json
{
  "ok": false,
  "error": "Address is 123 km from vendor base, exceeds 10 km service radius",
  "code": "OUT_OF_RADIUS",
  "vendorId": "clv...",
  "vendorName": "InstaPepz",
  "distanceKm": 123.4,
  "radiusKm": 10
}
```

---

## 📊 Database Schema

### New Model: Address
```prisma
model Address {
  id               String   @id @default(cuid())
  userId           String
  label            String   // "Home", "Work", etc.
  formattedAddress String
  placeId          String
  lat              Float
  lng              Float
  city             String?
  state            String?
  country          String?
  postalCode       String?
  normalizedHash   String   // For deduplication
  
  @@unique([userId, normalizedHash])
  @@index([userId])
}
```

### Vendor Model Extensions
```prisma
model Vendor {
  // ... existing fields
  
  basePlaceId              String?
  baseAddressFormatted     String?
  baseLat                  Float?
  baseLng                  Float?
  serviceRadiusKm          Int     @default(25)
  enforceServiceRadius     Boolean @default(true)
  allowOutOfRadiusOverride Boolean @default(false)
}
```

---

## 🧪 Testing

**Run Tests**:
```bash
curl http://localhost:3000/api/geo/test | jq '.summary'
```

**Expected Output**:
```json
{
  "allTestsPassed": true
}
```

**Test Coverage**:
- ✅ Address within radius → allowed
- ✅ Address outside radius → blocked (OUT_OF_RADIUS)
- ✅ Vendor base not set → blocked (VENDOR_BASE_NOT_SET)
- ✅ Enforcement disabled → allowed
- ✅ Admin override → allowed

---

## 🔐 Security

- ✅ All geo validation server-side
- ✅ `GOOGLE_MAPS_SERVER_KEY` never exposed to client
- ✅ Address ownership enforced (users can only access their own addresses)
- ✅ No CORS issues (server-to-Google API only)
- ✅ Checkout blocked before Stripe session creation

---

## 📁 Key Files

### New Files
- `server/services/geo.ts` - Core geo logic
- `app/api/geo/resolve-place/route.ts` - Place resolution
- `app/api/geo/test/route.ts` - Validation tests
- `app/api/account/addresses/route.ts` - Address CRUD
- `app/api/account/addresses/[id]/route.ts` - Address operations

### Modified Files
- `prisma/schema.prisma` - Added Address model + vendor geo fields
- `app/api/checkout/route.ts` - Added radius enforcement
- `.env.local` - Added GOOGLE_MAPS_SERVER_KEY

---

## ⚡ Quick Commands

```bash
# Test geo validation
curl http://localhost:3000/api/geo/test

# Resolve a place
curl -X POST http://localhost:3000/api/geo/resolve-place \
  -H "Content-Type: application/json" \
  -d '{"placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4"}'

# Build project
npm run build

# Check schema sync
npx prisma db push

# Generate Prisma client
npx prisma generate
```

---

## 🚧 Pending Work

**Admin UI** (backend ready, UI not built yet):
- Add Places Autocomplete to vendor edit page
- Form fields for:
  - Base address (with autocomplete)
  - Service radius (km)
  - Enforce service radius (toggle)
  - Allow admin override (toggle)
- Validation: Block `active=true` if `enforceServiceRadius=true` but base coords missing

---

## 📖 Full Documentation

See: `VENDOR_RADIUS_IMPLEMENTATION.md` for complete implementation details

---

## ✅ Status

**Implementation**: MVP COMPLETE  
**Build**: ✅ PASSING  
**Tests**: ✅ ALL PASSING  
**Security**: ✅ SERVER-SIDE ENFORCED  
**Database**: ✅ MIGRATED  

Ready for production with admin UI integration pending.
