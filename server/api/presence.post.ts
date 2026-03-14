import { eventHub } from '../utils/events';
import { getAppSession } from '../utils/session';

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event);
  const userId = session.data.userId || 'admin';
  
  const body = await readBody(event);
  
  if (body.action === 'disconnect') {
    const clientId = body.clientId;
    console.log(`[Presence] Manual DISCONNECT for user: ${userId} (Client: ${clientId})`);
    if (clientId) {
      eventHub.setUserOffline(userId, clientId);
    } else {
      // Fallback if client didn't send ID (should not happen with new client)
      console.warn(`[Presence] Manual disconnect without clientId for ${userId}`);
    }
    return { success: true };
  }

  return { success: false };
});
