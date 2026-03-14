import { defineEventHandler, readBody, createError } from '#imports';
import { eq } from 'drizzle-orm';
import { db } from '../../utils/db';
import { users, authCodes } from '../../database/schema';
import { sendLoginCode } from '../../utils/mail';
import crypto from 'node:crypto';
import { getAppSession } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event);

  // Protect route - requires Admin flag
  if (!session.data.isAdmin) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Admin access required.' });
  }

  const body = await readBody(event);
  const email = body?.email?.trim().toLowerCase();
  const name = body?.name?.trim();

  if (!email || !name) {
    throw createError({ statusCode: 400, statusMessage: 'Email and name are required' });
  }

  // Check if user already exists
  const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
  if (existingUser) {
    throw createError({ statusCode: 400, statusMessage: 'User already exists' });
  }

  const newId = crypto.randomUUID();

  // Create user
  await db.insert(users).values({
    id: newId,
    name,
    email,
    createdAt: new Date()
  }).run();

  // Generate 6 digit crypto random code for their first login 
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Save new code
  await db.insert(authCodes).values({
    userId: newId,
    code,
    expiresAt,
  }).run();

  // Send Welcome Email
  const emailSent = await sendLoginCode(email, code);

  if (!emailSent) {
    console.error('User was created but welcome email failed to send');
    return { success: true, message: 'User invited, but email sending failed. They can request a new code manually.', user: { id: newId, name, email } };
  }

  return { success: true, message: 'User invited successfully and welcome email sent', user: { id: newId, name, email } };
});
