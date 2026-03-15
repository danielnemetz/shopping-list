import { db } from '../../../../../utils/db';
import { comments } from '../../../../../database/schema';
import { requireUserSession } from '../../../../../utils/auth';
import { eventHub } from '../../../../../utils/events';
import { toggleReaction } from '../../../../../utils/reactions';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event);

  const itemId = getRouterParam(event, 'id');
  const commentIdParam = getRouterParam(event, 'commentId');
  if (!itemId || !commentIdParam) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID and Comment ID are required' });
  }
  const commentId = parseInt(commentIdParam, 10);
  if (Number.isNaN(commentId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid comment ID' });
  }

  const body = await readBody(event);
  const emoji = typeof body?.emoji === 'string' ? body.emoji.trim() : '';
  if (!emoji) {
    throw createError({ statusCode: 400, statusMessage: 'Emoji is required' });
  }

  const comment = await db.select().from(comments).where(eq(comments.id, commentId)).get();
  if (!comment || comment.itemId !== itemId) {
    throw createError({ statusCode: 404, statusMessage: 'Comment not found' });
  }

  const { added } = toggleReaction('comment', String(commentId), user.userId, emoji);
  eventHub.broadcast('comments:updated', { itemId });

  return { success: true, added };
});
