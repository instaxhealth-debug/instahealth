/**
 * Environment Variable Validation
 * 
 * This file validates required environment variables at runtime.
 * It will NOT crash the build if variables are missing, but will
 * log warnings to help debug production issues.
 */

const requiredForProduction = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
] as const;

const optionalButRecommended = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const;

export function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const missingOptional: string[] = [];

  // Check required variables
  for (const key of requiredForProduction) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check optional variables
  for (const key of optionalButRecommended) {
    if (!process.env[key]) {
      missingOptional.push(key);
    }
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    if (isProduction) {
      console.error(`❌ ${message}`);
      // Don't throw in production to allow deployment, but log clearly
    } else {
      console.warn(`⚠️  ${message}`);
    }
  }

  if (missingOptional.length > 0 && isProduction) {
    console.warn(`⚠️  Missing optional environment variables: ${missingOptional.join(', ')}`);
  }

  // Validate database URL format
  if (process.env.DATABASE_URL && isProduction) {
    if (!process.env.DATABASE_URL.startsWith('postgres://') && !process.env.DATABASE_URL.startsWith('postgresql://')) {
      console.error('❌ DATABASE_URL must use postgres:// or postgresql:// protocol in production');
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    missingOptional,
  };
}

// Auto-validate on import (but only log, don't throw)
if (typeof window === 'undefined') {
  validateEnvironment();
}
