/**
 * Vendor Dashboard
 *
 * Protected vendor portal. Only vendors (role=VENDOR with valid Vendor.userId) can access.
 *
 * This is a placeholder shell for the foundational auth system.
 * Full features like order management, product management, etc., will be added later.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function VendorDashboard() {
  const session = await auth();

  // Require authentication
  if (!session?.user?.email) {
    redirect('/vendor/login');
  }

  // Require VENDOR role
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || (user.role as string) !== 'VENDOR') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <h1>Access Denied</h1>
        <p>Only vendors can access this page.</p>
        <Link href="/login" style={{ color: '#007bff' }}>
          Back to login
        </Link>
      </div>
    );
  }

  // Find vendor linked to this user
  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
  });

  if (!vendor) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <h1>Vendor Account Not Found</h1>
        <p>Your user account is not linked to a vendor account.</p>
        <p>Contact support: support@instahealth.ae</p>
        <Link href="/vendor/login" style={{ color: '#007bff' }}>
          Back to vendor login
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Vendor Dashboard</h1>
        <form
          action={async () => {
            'use server';
            const { signOut } = await import('@/lib/auth');
            await signOut({ redirectTo: '/' });
          }}
        >
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </form>
      </div>

      {/* Vendor Info */}
      <div style={{ border: '1px solid #ddd', padding: '20px', marginBottom: '20px', borderRadius: '4px' }}>
        <h2>Vendor Information</h2>
        <p>
          <strong>Name:</strong> {vendor.name}
        </p>
        <p>
          <strong>Email:</strong> {vendor.email || 'Not set'}
        </p>
        <p>
          <strong>Slug:</strong> {vendor.slug}
        </p>
        <p>
          <strong>Status:</strong> {vendor.status === 'active' ? '✅ Active' : '❌ Inactive'}
        </p>
        <p>
          <strong>Verified:</strong> {vendor.verified ? '✅ Yes' : '❌ No'}
        </p>
      </div>

      {/* Foundation Status */}
      <div style={{ border: '1px solid #ddd', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <h2>Authentication Foundation Status</h2>
        <p style={{ margin: '0 0 10px 0' }}>✅ Email + password authentication</p>
        <p style={{ margin: '0 0 10px 0' }}>✅ Session-based (NextAuth)</p>
        <p style={{ margin: '0 0 10px 0' }}>✅ VendorId derived from session → userId → vendor lookup</p>
        <p style={{ margin: '0 0 10px 0' }}>✅ No header-based vendor ID spoofing</p>
        <p style={{ margin: '0 0 10px 0' }}>✅ Protected route with role=VENDOR check</p>
        <p style={{ margin: '0 0 10px 0' }}>
          ⏳ <strong>Coming Soon:</strong> Order management, product management, vendor dashboard UI
        </p>
      </div>

      {/* Available Endpoints (for reference) */}
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', fontSize: '12px', borderRadius: '4px' }}>
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Available API Endpoints:</p>
        <p style={{ margin: '0 0 5px 0' }}>GET /api/vendor/orders - List vendor orders</p>
        <p style={{ margin: '0 0 5px 0' }}>GET /api/vendor/orders/[id]/details - Get order details</p>
        <p style={{ margin: '0 0 5px 0' }}>POST /api/vendor/orders/[id]/accept - Accept order</p>
        <p style={{ margin: '0 0 5px 0' }}>POST /api/vendor/orders/[id]/reject - Reject order</p>
        <p style={{ margin: '0 0 5px 0' }}>POST /api/vendor/orders/[id]/cancel - Cancel order</p>
        <p style={{ margin: '0' }}>POST /api/vendor/orders/[id]/update-status - Update order status</p>
      </div>
    </div>
  );
}
