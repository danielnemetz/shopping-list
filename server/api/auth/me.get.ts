import { getAppSession } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event);

  // Admin session
  if (session.data.isAdmin) {
    return {
      user: null,
      isAdmin: true,
    };
  }

  // Regular user session
  if (session.data.userId) {
    return {
      user: {
        id: session.data.userId,
        name: session.data.name,
        email: session.data.email,
      },
      isAdmin: false,
    };
  }

  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
});
