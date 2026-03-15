import { eventHub } from '../../utils/events';
import { getAppSession } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const session = await getAppSession(event);
  
  // Require valid session and admin privileges
  if (!session.data.userId || !session.data.isAdmin) {
    // Alternatively, allow a Bearer token matching the admin password for API-only access
    const authHeader = getRequestHeader(event, 'Authorization');
    const config = useRuntimeConfig();
    
    if (!authHeader || authHeader !== `Bearer ${config.adminPassword}`) {
       throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }
  }

  console.log('[Admin] Triggering global app reload...');
  
  // Broadcast reload event to all connected clients
  eventHub.broadcast('app:reload', { timestamp: Date.now() });

  return { success: true, message: 'Reload signal broadcasted to all clients.' };
});
