import { createError } from '#imports';
import { getAppSession } from './session';
import type { H3Event } from 'h3';

export const requireUserSession = async (event: H3Event) => {
  const session = await getAppSession(event);

  if (!session.data.userId && !session.data.isAdmin) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Please login.' });
  }

  return {
    userId: (session.data.userId as string) || 'admin',
    name: (session.data.name as string) || 'Administrator',
    email: (session.data.email as string) || 'admin@local',
    isAdmin: !!session.data.isAdmin,
  };
};
