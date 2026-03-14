import { useSession } from '#imports';
import type { H3Event } from 'h3';

/**
 * Central session helper. All endpoints MUST use this to get/create sessions.
 * This ensures consistent cookie settings across the entire app.
 */
export const getAppSession = (event: H3Event) => {
  return useSession(event, {
    password: process.env.AUTH_SECRET || 'fallback-secret-key-must-be-min-32-chars',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  });
};
