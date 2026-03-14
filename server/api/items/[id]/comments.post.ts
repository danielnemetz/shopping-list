import { db } from '../../../utils/db';
import { comments } from '../../../database/schema';
import { requireUserSession } from '../../../utils/auth';

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event);

  const itemId = getRouterParam(event, 'id');
  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID is required' });
  }

  const body = await readBody(event);
  if (!body?.text?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Comment text is required' });
  }

  await db.insert(comments).values({
    itemId,
    userId: user.userId,
    text: body.text.trim(),
    createdAt: new Date(),
  }).run();

  return { success: true };
});
