import { useRuntimeConfig, defineEventHandler, readBody, createError } from '#imports';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  
  const body = await readBody(event);
  const { password } = body;

  if (!password) {
    throw createError({ statusCode: 400, statusMessage: 'Password is required' });
  }

  // Check if password matches the configured admin password
  const adminPassword = process.env.ADMIN_PASSWORD || config.adminPassword;
  if (password !== adminPassword) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid password' });
  }

  // Get current session, clear it first to prevent overlap with any user session
  const { getAppSession } = await import('../../utils/session');
  const session = await getAppSession(event);

  await session.clear();
  await session.update({
    isAdmin: true,
  });

  return { success: true, message: 'Admin logged in successfully' };
});
