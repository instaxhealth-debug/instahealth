"use client";

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Package, Clock, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function CheckoutSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-50">
      {/* Success Banner */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Confirmed!
          </h1>
          <p className="text-lg text-gray-600">
            Your payment has been processed successfully
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Order Summary Card */}
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="border-b pb-4">
              <p className="text-sm text-gray-600 mb-1">Order Number</p>
              <p className="text-2xl font-bold text-primary">
                #{sessionId ? sessionId.slice(-8).toUpperCase() : 'PENDING'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Status */}
              <div className="flex flex-col items-center text-center">
                <Package className="h-6 w-6 text-blue-600 mb-2" />
                <p className="text-xs text-gray-600">Status</p>
                <p className="text-sm font-medium text-gray-900">Being Prepared</p>
              </div>

              {/* Delivery Time */}
              <div className="flex flex-col items-center text-center">
                <Clock className="h-6 w-6 text-orange-600 mb-2" />
                <p className="text-xs text-gray-600">Delivery</p>
                <p className="text-sm font-medium text-gray-900">Today/Next Day</p>
              </div>

              {/* Tracking */}
              <div className="flex flex-col items-center text-center">
                <MapPin className="h-6 w-6 text-green-600 mb-2" />
                <p className="text-xs text-gray-600">Track</p>
                <p className="text-sm font-medium text-gray-900">View Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What Happens Next */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4">What Happens Next?</h2>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                  1
                </span>
                <div>
                  <p className="font-medium text-gray-900">Order Confirmation Email</p>
                  <p className="text-sm text-gray-600">You&apos;ll receive an email with your order details shortly</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                  2
                </span>
                <div>
                  <p className="font-medium text-gray-900">Preparation</p>
                  <p className="text-sm text-gray-600">Your items are being prepared for delivery</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                  3
                </span>
                <div>
                  <p className="font-medium text-gray-900">Delivery</p>
                  <p className="text-sm text-gray-600">Your order will be delivered to the address provided</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => router.push('/orders')}
            className="w-full h-11 text-base font-medium"
          >
            View My Orders
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push('/marketplace')}
            className="w-full h-11 text-base font-medium"
          >
            Continue Shopping
          </Button>

          <Link
            href="/"
            className="block text-center text-primary hover:underline text-sm py-2"
          >
            Back to Home
          </Link>
        </div>

        {/* Support Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg text-center text-sm text-gray-700">
          <p className="mb-1">
            <strong>Need help?</strong> Our customer support team is here to assist.
          </p>
          <Link href="/support" className="text-primary hover:underline font-medium">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
