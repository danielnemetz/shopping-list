import { eventHub } from '../utils/events';
import { getAppSession } from '../utils/session';

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event);
  const userId = session.data.userId || 'admin';
  
  const body = await readBody(event);
  const { itemId } = body;
  
  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing itemId' });
  }

  const userName = session.data.name || userId;
  
  // console.log(`[Typing] User ${userId} (${userName}) typing in item ${itemId}`);
  eventHub.setTyping(itemId, userId, userName);

  return { success: true };
});
