import crypto from 'node:crypto';

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Always takes the same time regardless of where strings differ.
 */
export function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');

  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
