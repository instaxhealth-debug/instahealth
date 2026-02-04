/**
 * Vendor Login Page
 *
 * Vendors authenticate with email + password.
 * No OAuth. No shared credentials.
 * VendorId is derived from session → userId → vendor lookup.
 *
 * Redirects to /vendor dashboard after successful login.
 */

'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function VendorLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in as vendor
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'VENDOR') {
      router.replace('/vendor');
    }
  }, [status, session?.user?.role, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (!result?.ok) {
        setError(result?.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Check if user is vendor
      const sessionRes = await fetch('/api/vendor/session');
      if (!sessionRes.ok) {
        setError('You do not have vendor access');
        setLoading(false);
        return;
      }

      // Redirect to vendor dashboard
      router.push('/vendor');
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  }

  const isResolving = status === 'loading' || (status === 'authenticated' && session?.user?.role === 'VENDOR');

  if (isResolving) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Redirecting to dashboard...
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-gray-600">
            Please wait.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Vendor Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="vendor@email.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            <Link href="/login" className="text-[#41a59b] hover:underline">
              Back to customer login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

