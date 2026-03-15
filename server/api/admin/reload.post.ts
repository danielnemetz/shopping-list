import { eventHub } from '../../utils/events';
import { getAppSession } from '../../utils/session';
import { secureCompare } from '../../utils/crypto';

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event);
  
  if (!session.data.isAdmin) {
    const authHeader = getRequestHeader(event, 'Authorization') || '';
    const config = useRuntimeConfig();
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token || !secureCompare(token, config.adminPassword)) {
       throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }
  }

  console.log('[Admin] Triggering global app reload...');
  
  // Broadcast reload event to all connected clients
  eventHub.broadcast('app:reload', { timestamp: Date.now() });

  return { success: true, message: 'Reload signal broadcasted to all clients.' };
});
