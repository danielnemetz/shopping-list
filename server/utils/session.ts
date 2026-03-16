import { useSession } from '#imports';
import type { H3Event } from 'h3';

const DEV_FALLBACK_SECRET = 'dev-only-fallback-secret-key-min-32-chars!!';

function getSessionPassword(): string {
  const secret = process.env.AUTH_SECRET || process.env.NUXT_AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SECURITY] NUXT_AUTH_SECRET is not set or too short (min 32 chars). '
      + 'The app will not start without a secure session secret in production. '
      + 'Generate one with: openssl rand -hex 32',
    );
  }

  return DEV_FALLBACK_SECRET;
}

/**
 * Central session helper. All endpoints MUST use this to get/create sessions.
 * This ensures consistent cookie settings across the entire app.
 */
export const getAppSession = (event: H3Event) => {
  const isProduction = process.env.NODE_ENV === 'production';
  return useSession(event, {
    password: getSessionPassword(),
    maxAge: 60 * 60 * 24 * 30, // 30 days
    cookie: {
      secure: isProduction, // only in production, so local dev works without HTTPS
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  });
};
