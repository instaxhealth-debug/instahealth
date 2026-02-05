import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: { orderId?: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center space-y-3">
          <h1 className="text-xl font-semibold text-gray-900">Payment Cancelled</h1>
          <p className="text-sm text-gray-600">
            Your payment was cancelled. You can retry checkout at any time.
          </p>
          {searchParams.orderId && (
            <p className="text-xs text-gray-500">Order ID: {searchParams.orderId}</p>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/cart" className="text-primary hover:underline text-sm">
              Return to Cart
            </Link>
            <Link href="/checkout" className="text-primary hover:underline text-sm">
              Try Checkout Again
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
