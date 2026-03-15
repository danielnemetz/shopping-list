import { requireUserSession } from '../../../utils/auth';
import { eventHub } from '../../../utils/events';
import { toggleReaction } from '../../../utils/reactions';

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event);

  const itemId = getRouterParam(event, 'id');
  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID is required' });
  }

  const body = await readBody(event);
  const emoji = typeof body?.emoji === 'string' ? body.emoji.trim() : '';
  if (!emoji) {
    throw createError({ statusCode: 400, statusMessage: 'Emoji is required' });
  }

  const { added } = toggleReaction('item', itemId, user.userId, emoji);
  eventHub.broadcast('items:updated');

  return { success: true, added };
});
