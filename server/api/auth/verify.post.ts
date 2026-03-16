import { eq, and } from 'drizzle-orm';
import { db } from '../../utils/db';
import { users, authCodes } from '../../database/schema';

export default defineEventHandler(async (event) => {
  rateLimit(event, { name: 'verify-code', max: 10, windowMs: 15 * 60 * 1000 });

  const body = await readBody(event);
  const email = body?.email?.trim().toLowerCase();
  const code = body?.code?.trim();

  if (!email || !code) {
    throw createError({ statusCode: 400, statusMessage: 'Email and code are required' });
  }

  // Get User
  const userRecord = await db.select().from(users).where(eq(users.email, email)).get();
  
  if (!userRecord) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid code or email' });
  }

  // Find valid code in DB
  const validCodeRecord = await db.select()
    .from(authCodes)
    .where(
      and(
        eq(authCodes.userId, userRecord.id),
        eq(authCodes.code, code)
      )
    )
    .get();

  if (!validCodeRecord) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired code' });
  }

  // Check Expiry
  if (validCodeRecord.expiresAt < new Date()) {
    await db.delete(authCodes).where(eq(authCodes.id, validCodeRecord.id)).run();
    throw createError({ statusCode: 400, statusMessage: 'Code has expired' });
  }

  // Code is valid - clean up the used code
  await db.delete(authCodes).where(eq(authCodes.id, validCodeRecord.id)).run();

  // Establish session - clear first to prevent overlap with any admin session
  const { getAppSession } = await import('../../utils/session');
  const session = await getAppSession(event);

  await session.clear();
  await session.update({
    userId: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
  });

  return { 
    success: true, 
    user: { id: userRecord.id, name: userRecord.name, email: userRecord.email } 
  };
});
