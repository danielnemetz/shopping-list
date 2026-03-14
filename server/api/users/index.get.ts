import { defineEventHandler, createError } from '#imports';
import { db } from '../../utils/db';
import { users } from '../../database/schema';
import { getAppSession } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event);

  // Verify that the user is an admin
  if (!session.data.isAdmin) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Admin access required.' });
  }

  // Fetch all users
  const allUsers = await db.select().from(users).all();
  
  return {
    success: true,
    users: allUsers,
  };
});
