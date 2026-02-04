/*
  Summary:
  - Add VENDOR role to Role enum
  - This allows vendors to authenticate via email + password
  - Vendors are linked to Vendor model via Vendor.userId = User.id

  Security:
  - Vendors authenticate via email + password (no OAuth)
  - Vendor identity is enforced via session-based auth (requireVendor middleware)
  - No vendor has direct database access
  - Vendors can only access their own orders/products via API
*/

ALTER TYPE "Role" ADD VALUE 'VENDOR';
