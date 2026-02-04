# Vendor Authentication System

## Overview

Vendors authenticate via **email + password only** (no OAuth, no shared credentials, no database access).

The authentication foundation is secure, session-based, and prevents any accidental vendor data leakage.

---

## Authentication Architecture

### User and Vendor Relationship

```
User (email, passwordHash, role=VENDOR)
    ↓
    One-to-One via Vendor.userId = User.id (UNIQUE constraint)
    ↓
Vendor (id, name, slug, userId, ...)
```

**Rules**:
- One vendor = one user account
- User.role must be VENDOR
- Vendor.userId is UNIQUE (one vendor per user)
- VendorId is NEVER accepted from request headers
- VendorId is ALWAYS derived from session

---

## Login Flow

### Step 1: Vendor Submits Email + Password

```
POST /api/auth/callback/credentials
{
  "email": "vendor@example.com",
  "password": "secure-password"
}
```

### Step 2: NextAuth Validates Credentials

1. Find User by email
2. Check user.role === VENDOR
3. Bcrypt compare password against passwordHash
4. If valid, create JWT session token

### Step 3: Session Created

```javascript
session = {
  user: {
    id: "user-123",
    email: "vendor@example.com",
    role: "VENDOR"
  },
  expires: new Date(...)
}
```

### Step 4: Vendor Accesses Protected Routes

All vendor routes require `requireVendor()`:

```typescript
export async function POST(req: NextRequest) {
  const { vendorId, userId } = await requireVendor();
  // vendorId is SAFE and VERIFIED
  // Can use directly in queries
}
```

### Step 5: requireVendor() Validates Vendor

```typescript
const session = await getServerSession();
// ↓
const user = await prisma.user.findUnique({ email: session.user.email });
// ↓
const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
// ↓
return { vendorId: vendor.id, userId: user.id };
```

**If any step fails**:
- No session → 401 Unauthorized
- User not found → 401 Unauthorized
- User role ≠ VENDOR → 403 Forbidden
- Vendor.userId not found → 403 Forbidden

---

## Protected Endpoints

### Vendor-Only Routes

All these routes require `requireVendor()`:

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/vendor/login` | GET/POST | Vendor login page | Public |
| `/vendor` | GET | Vendor dashboard | ✅ requireVendor |
| `/api/vendor/session` | GET | Check vendor auth | ✅ requireVendor |
| `/api/vendor/orders` | GET | List vendor orders | ✅ requireVendor |
| `/api/vendor/orders/[id]/details` | GET | Get order details | ✅ requireVendor |
| `/api/vendor/orders/[id]/accept` | POST | Accept order | ✅ requireVendor |
| `/api/vendor/orders/[id]/reject` | POST | Reject order | ✅ requireVendor |
| `/api/vendor/orders/[id]/cancel` | POST | Cancel order | ✅ requireVendor |
| `/api/vendor/orders/[id]/update-status` | POST | Update status | ✅ requireVendor |

### Vendor Ownership Verification

Every endpoint that operates on a vendor order also verifies ownership:

```typescript
const vendorOrder = await prisma.vendorOrder.findUnique({
  where: { id: vendorOrderId }
});

// Must own this order
if (vendorOrder.vendorId !== vendorId) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 403 }
  );
}
```

**Result**: Vendor can only access their own data.

---

## Security Guarantees

### ✅ No Header Spoofing
```typescript
// ❌ FORBIDDEN - Will fail
const vendorId = req.headers.get('x-vendor-id');

// ✅ REQUIRED - Session-based
const { vendorId } = await requireVendor();
```

**Enforcement**: Build guardrails block x-vendor-id usage.

### ✅ No Database Access
Vendors cannot:
- Run migrations
- Run seed scripts
- Access raw SQL
- Access other vendor data
- Access customer data
- Access admin functions

**Enforcement**: Vendors only interact via API + NextAuth.

### ✅ No Shared Credentials
Each vendor has:
- Unique email
- Unique password hash
- Unique Vendor.userId
- Unique session token

**Enforcement**: Bcrypt hashing + JWT tokens.

### ✅ No Vendor Identity Leakage
Vendor cannot infer:
- Other vendor IDs
- Customer IDs
- Product IDs from other vendors
- Order IDs from other vendors

**Enforcement**: API only returns their own data.

---

## Implementation Details

### User Model Updates

```prisma
model User {
  id                String     @id @default(cuid())
  email             String     @unique
  passwordHash      String?    // Bcrypt hash for credential login
  name              String?
  image             String?
  emailVerified     DateTime?
  role              Role       @default(USER)  // USER | VENDOR | ADMIN
  defaultLocationId String?
  defaultLocation   Location?  @relation(fields: [defaultLocationId], references: [id], onDelete: SetNull)
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  
  orders            Order[]
  carts             Cart[]
  accounts          Account[]  // NextAuth OAuth
  sessions          Session[]  // NextAuth sessions
  addresses         Address[]
}

enum Role {
  ADMIN
  USER
  VENDOR  // ← NEW
}
```

### Vendor Model Updates

```prisma
model Vendor {
  id        String      @id @default(cuid())
  name      String
  slug      String      @unique
  email     String?     @unique
  userId    String?     @unique  // Link to User for auth
  status    String      @default("active")
  verified  Boolean     @default(false)
  // ... other fields
  
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  products  Product[]
  orderItems OrderItem[]
  vendorOrders VendorOrder[]
  vendorPayouts VendorPayout[]

  @@index([userId])
}
```

### NextAuth Configuration

```typescript
// lib/auth.ts
const authOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        // Check role is VENDOR
        if (!user || user.role !== 'VENDOR') {
          return null;
        }

        // Bcrypt compare password
        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      }
    })
  ]
}
```

### requireVendor Middleware

```typescript
// lib/auth/requireVendor.ts
export async function requireVendor() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    throw new Error('UNAUTHORIZED');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user || user.role !== 'VENDOR') {
    throw new Error('UNAUTHORIZED' | 'FORBIDDEN');
  }

  // Find vendor linked to this user
  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id }
  });

  if (!vendor) {
    throw new Error('FORBIDDEN');
  }

  return { vendorId: vendor.id, userId: user.id };
}
```

---

## Vendor Onboarding

### For Admins: Create Vendor Account

1. **Create User**:
   ```typescript
   const user = await prisma.user.create({
     data: {
       email: 'vendor@example.com',
       passwordHash: await bcrypt.hash('initial-password', 10),
       role: 'VENDOR'
     }
   });
   ```

2. **Create Vendor**:
   ```typescript
   const vendor = await prisma.vendor.create({
     data: {
       name: 'Vendor Name',
       slug: 'vendor-name',
       userId: user.id,  // ← Link to user
       status: 'active',
       email: 'vendor@example.com'
     }
   });
   ```

3. **Send Credentials**:
   - Email vendor their email + temporary password
   - Request password change on first login (future enhancement)

### For Vendors: First Login

1. Go to `/vendor/login`
2. Enter email + password
3. Click "Sign In"
4. Redirected to `/vendor` dashboard if successful

---

## Error Handling

### 401 Unauthorized

**When**: No session OR user not found OR wrong credentials

**Response**:
```json
{ "error": "Unauthorized" }
```

**Action**: Redirect to `/vendor/login`

### 403 Forbidden

**When**: User role ≠ VENDOR OR Vendor not found for user

**Response**:
```json
{ "error": "Forbidden - user is not a vendor" }
```

**Action**: Contact support (user has no vendor access)

---

## Testing Vendor Auth

### Manual Testing

```bash
# 1. Create vendor user in database
psql $DATABASE_URL -c "
INSERT INTO \"User\" (id, email, \"passwordHash\", role)
VALUES (
  'vendor-123',
  'test@vendor.com',
  '\$2a\$10\$...bcrypt_hash...',
  'VENDOR'
);
"

# 2. Create vendor
psql $DATABASE_URL -c "
INSERT INTO \"Vendor\" (id, name, slug, \"userId\", status)
VALUES (
  'vendor-id-456',
  'Test Vendor',
  'test-vendor',
  'vendor-123',
  'active'
);
"

# 3. Test login
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@vendor.com",
    "password": "plain-password"
  }'

# 4. Test vendor endpoint
curl http://localhost:3000/api/vendor/orders \
  -H "Cookie: sessionToken=..."
```

---

## FAQ

### Q: Can vendors change their password?
**A**: Not yet. Password change functionality is a future enhancement. For now, admins can reset via database.

### Q: Can vendors create accounts themselves?
**A**: No. Vendors are created by admins only via `/admin/vendors` UI or database.

### Q: What if vendor password is compromised?
**A**: 
1. Admin deletes user account or changes passwordHash
2. Vendor cannot log in
3. Create new user + vendor with new credentials

### Q: Can vendors access other vendors' data?
**A**: No. Every API call checks `vendorOrder.vendorId === requiredVendorId`. Fails if mismatch.

### Q: What happens if vendor.userId is NULL?
**A**: Vendor cannot log in. requireVendor() fails with 403 Forbidden.

### Q: Can vendors access the database directly?
**A**: No. Vendors have no database credentials. They access data only via API.

### Q: How is vendor identity verified in API calls?
**A**: Via NextAuth session token. Session contains user email. Email maps to user. User.id maps to vendor.

---

## Summary

✅ Vendors authenticate via email + password
✅ No OAuth, no shared credentials
✅ Session-based auth prevents header spoofing
✅ VendorId derived from session (NEVER from request)
✅ Vendors can only access their own data
✅ No vendor has database access
✅ All vendor routes require requireVendor()
✅ Vendor ownership is verified on every operation
