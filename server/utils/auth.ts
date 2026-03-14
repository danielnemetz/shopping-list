import { createError } from '#imports';
import { getAppSession } from './session';
import { db } from './db';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';
import type { H3Event } from 'h3';

export const requireUserSession = async (event: H3Event) => {
  const session = await getAppSession(event);

  // Admin accounts must NOT access the regular app
  if (session.data.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Admin accounts cannot access the app. Please log in as a regular user.' });
  }

  // Regular user check
  if (session.data.userId) {
    const user = await db.select()
      .from(users)
      .where(eq(users.id, session.data.userId as string))
      .get();

    if (user) {
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        isAdmin: false,
      };
    }

    // If userId exists in session but not in database, clear session
    await session.clear();
  }

  throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Please login.' });
};
