import type { H3Event } from 'h3';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Map<string, RateLimitEntry>>();

function getBucket(name: string): Map<string, RateLimitEntry> {
  let bucket = buckets.get(name);
  if (!bucket) {
    bucket = new Map();
    buckets.set(name, bucket);
  }
  return bucket;
}

function getClientIp(event: H3Event): string {
  return (
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0].trim() ||
    getRequestHeader(event, 'x-real-ip') ||
    'unknown'
  );
}

/**
 * Simple in-memory rate limiter. Suitable for single-server deployments.
 * Throws a 429 error if the limit is exceeded.
 */
export function rateLimit(
  event: H3Event,
  opts: { name: string; max: number; windowMs: number },
): void {
  const bucket = getBucket(opts.name);
  const ip = getClientIp(event);
  const now = Date.now();

  // Lazy cleanup: remove expired entries on each call
  for (const [key, entry] of bucket) {
    if (entry.resetAt <= now) bucket.delete(key);
  }

  const entry = bucket.get(ip);

  if (!entry || entry.resetAt <= now) {
    bucket.set(ip, { count: 1, resetAt: now + opts.windowMs });
    return;
  }

  entry.count++;

  if (entry.count > opts.max) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    throw createError({
      statusCode: 429,
      statusMessage: `Too many requests. Try again in ${retryAfterSec}s.`,
    });
  }
}
