/**
 * Vendor Login Page
 *
 * Vendors authenticate with email + password.
 * No OAuth. No shared credentials.
 * VendorId is derived from session → userId → vendor lookup.
 *
 * This page is a placeholder for the foundational auth system.
 * Full UI/UX polish is NOT included in this phase.
 */

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VendorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      router.push('/vendor');
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h1>Vendor Login</h1>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px', padding: '10px', border: '1px solid red' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <Link href="/login" style={{ color: '#007bff' }}>
          Back to customer login
        </Link>
      </p>

      {/* DEVELOPMENT ONLY: Remove before production */}
      <div style={{ marginTop: '30px', padding: '10px', backgroundColor: '#f0f0f0', fontSize: '12px' }}>
        <p style={{ margin: '0 0 5px 0' }}>
          <strong>VENDOR AUTH FOUNDATION (WIP)</strong>
        </p>
        <p style={{ margin: '0 0 5px 0' }}>✅ Email + password authentication</p>
        <p style={{ margin: '0 0 5px 0' }}>✅ Session-based (no OAuth)</p>
        <p style={{ margin: '0 0 5px 0' }}>✅ VendorId derived from session</p>
        <p style={{ margin: '0' }}>🔲 Full vendor dashboard (coming)</p>
      </div>
    </div>
  );
}
