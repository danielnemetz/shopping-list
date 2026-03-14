import { getAppSession } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event);

  if (!session.data.userId && !session.data.isAdmin) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  return {
    user: session.data.userId ? {
      id: session.data.userId,
      name: session.data.name,
      email: session.data.email,
    } : (session.data.isAdmin ? {
      id: 'admin',
      name: 'Administrator',
      email: 'admin@local',
    } : null),
    isAdmin: !!session.data.isAdmin
  };
});
