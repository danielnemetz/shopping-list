import { eq, lt } from 'drizzle-orm';
import { db } from '../../utils/db';
import { users, authCodes } from '../../database/schema';
import { sendLoginCode } from '../../utils/mail';
import crypto from 'node:crypto';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const email = body?.email?.trim().toLowerCase();

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' });
  }

  // Remove expired codes so the table doesn't grow indefinitely
  await db.delete(authCodes).where(lt(authCodes.expiresAt, new Date())).run();

  // Check if user exists (Invited users must exist beforehand)
  const userRecord = await db.select().from(users).where(eq(users.email, email)).get();

  if (!userRecord) {
    console.warn(`[AUTH] Login attempt for non-existent user: ${email}`);
    // For security reasons, don't reveal if user exists or not
    // We can simulate a delay to prevent timing attacks, and then return success.
    await new Promise(r => setTimeout(r, 600));
    return { success: true, message: 'If this email exists, a code was sent.' };
  }

  console.log(`[AUTH] User found: ${userRecord.name} (ID: ${userRecord.id}). Sending code...`);

  // Generate 6 digit crypto random code
  const code = crypto.randomInt(100000, 999999).toString();

  // Expire in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Invalidate any older codes for this user
  await db.delete(authCodes).where(eq(authCodes.userId, userRecord.id)).run();

  // Save new code
  await db.insert(authCodes).values({
    userId: userRecord.id,
    code,
    expiresAt,
  }).run();

  // Send Email
  const emailSent = await sendLoginCode(email, code);

  if (!emailSent) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to send verification code.' });
  }

  return { success: true, message: 'Code sent successfully.' };
});
