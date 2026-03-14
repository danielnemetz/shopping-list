import { requireUserSession } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event);

  return {
    user: {
      id: user.userId,
      name: user.name,
      email: user.email,
    },
    isAdmin: user.isAdmin
  };
});
