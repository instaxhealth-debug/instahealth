'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, ShoppingCart } from 'lucide-react';

export default function CheckoutCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Cancel Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-gray-600 mb-4">
            Your payment has been cancelled. Your items remain in your cart and are ready for checkout.
          </p>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <p className="font-medium mb-2">What happens now?</p>
            <ul className="text-left space-y-1 text-xs">
              <li>• Your cart items are saved</li>
              <li>• No payment has been processed</li>
              <li>• You can try checkout again anytime</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/cart')}
              className="w-full h-10 bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Return to Cart
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/checkout')}
              className="w-full h-10 flex items-center justify-center gap-2"
            >
              Try Checkout Again
            </Button>

            <Button
              variant="ghost"
              onClick={() => router.push('/marketplace')}
              className="w-full h-10 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Button>
          </div>

          {/* Support Link */}
          <p className="text-xs text-gray-500 mt-6">
            Having issues?{' '}
            <Link href="/support" className="text-primary hover:underline font-medium">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
