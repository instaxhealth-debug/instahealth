'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [vendorInfo, setVendorInfo] = useState<{ email: string; businessName: string } | null>(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link - token missing');
    }
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.password || !formData.confirmPassword) {
      setError('Both password fields are required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid invite link');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/vendor/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to activate account');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setVendorInfo(result.vendor);
      setLoading(false);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/vendor/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setLoading(false);
    }
  };

  if (success && vendorInfo) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-green-700">
              Account Activated!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-green-700">
              Welcome to InstaHealth Vendors!
            </p>
            <p className="text-sm text-green-600">
              Your vendor account has been successfully created.
            </p>
            <p className="text-gray-700">
              You can now log in with your email and password.
            </p>
            <p className="text-xs text-gray-600 mt-4">
              Redirecting to login page...
            </p>
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
            Activate Your Vendor Account
          </CardTitle>
          <p className="text-center text-sm text-gray-600 mt-2">
            Set your password to get started
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {!token ? (
            <div className="space-y-4 text-center">
              <p className="text-gray-700">
                This invite link appears to be invalid or expired.
              </p>
              <Link href="/vendor/login">
                <Button className="w-full">Back to Vendor Login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password *
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-500">
                  Minimum 8 characters
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password *
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Activating...' : 'Set Password'}
              </Button>

              <p className="text-center text-sm text-gray-600 pt-2">
                <Link href="/vendor/login" className="text-[#41a59b] hover:underline">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
