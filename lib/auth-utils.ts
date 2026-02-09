import crypto from 'crypto';

/**
 * Generate a secure temporary password
 */
export function generateTemporaryPassword(): string {
  return crypto.randomBytes(12).toString('hex');
}

/**
 * Hash a password using bcryptjs (should be imported separately)
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 10);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}
