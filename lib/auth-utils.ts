import crypto from 'crypto';

/**
 * Generate a secure random token and return both plain and hashed versions
 */
export function generateInviteToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/**
 * Verify token against stored hash
 */
export function verifyInviteToken(token: string, storedHash: string): boolean {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

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
