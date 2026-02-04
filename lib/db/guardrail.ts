/**
 * Database Guardrail
 *
 * Logs database connection details on server boot.
 * Prevents accidental writes to PROD by making the active database obvious.
 *
 * Call this during server initialization (e.g., in middleware.ts or API root)
 */

export function logDatabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL || '';
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set. Database connection will fail.');
    return;
  }

  try {
    const url = new URL(databaseUrl);
    const host = url.hostname || 'unknown';
    const database = url.pathname?.replace(/^\//, '') || 'unknown';
    const isProduction = process.env.NODE_ENV === 'production';
    const environment = process.env.VERCEL_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development');

    const isDev = !isProduction && !host.includes('prod');
    const environmentLabel = isDev ? '🟢 DEV' : '🔴 PROD';

    console.log(
      `\n${'='.repeat(80)}\n` +
      `📊 DATABASE CONNECTION\n` +
      `${'='.repeat(80)}\n` +
      `Environment: ${environmentLabel} (${environment})\n` +
      `Database Host: ${host}\n` +
      `Database Name: ${database}\n` +
      `${!isDev ? '⚠️  WARNING: Connected to PRODUCTION database\n' : ''}\n` +
      `${'='.repeat(80)}\n`
    );
  } catch (error) {
    console.warn('⚠️  Could not parse DATABASE_URL format:', error);
  }
}

/**
 * Synchronously check if we're connected to production
 * Use sparingly - only for critical safety checks
 */
export function isProductionDatabase(): boolean {
  const databaseUrl = process.env.DATABASE_URL || '';
  // Simple heuristic: if URL contains 'prod' or NODE_ENV is production
  return (
    process.env.NODE_ENV === 'production' ||
    databaseUrl.toLowerCase().includes('prod')
  );
}
