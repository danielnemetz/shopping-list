import { createEventStream } from 'h3';
import { eventHub } from '../utils/events';
import { getAppSession } from '../utils/session';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const clientId = (query.clientId as string) || `anon_${Math.random().toString(36).substring(2, 8)}`;
  const connId = Math.random().toString(36).substring(2, 6);
  
  const session = await getAppSession(event);
  if (!session.data.userId && !session.data.isAdmin) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const userId = session.data.userId || 'admin';
  console.log(`[SSE] [${connId}] CONNECT: User=${userId}, Client=${clientId}`);

  // Register presence
  eventHub.setUserOnline(userId, clientId);

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const eventStream = createEventStream(event);

  const onEvent = (data: any) => {
    eventStream.push({
      event: data.type,
      data: JSON.stringify(data.data || {}),
    }).catch(() => cleanup('PUSH_ERR'));
  };

  eventHub.on('event', onEvent);

  // Initial Sync
  setTimeout(() => {
    eventStream.push(':\n\n').catch(() => {}); // Basic preamble
    eventStream.push({
      event: 'connected',
      data: JSON.stringify({ onlineUsers: eventHub.getOnlineUsers() }),
    }).catch(() => cleanup('INIT_ERR'));
  }, 50);

  // Heartbeat loop (every 15s to keep within 45s pruning window)
  const heartbeat = setInterval(() => {
    // Refresh lastSeen on every heartbeat attempt
    eventHub.setUserOnline(userId, clientId);
    
    eventStream.push({
      event: 'heartbeat',
      data: Date.now().toString(),
    }).catch(() => cleanup('HB_ERR'));
  }, 15000);

  let closed = false;
  const cleanup = (source: string) => {
    if (closed) return;
    closed = true;
    
    console.log(`[SSE] [${connId}] DISCONNECT: ${userId} (${source})`);
    
    clearInterval(heartbeat);
    eventHub.off('event', onEvent);
    eventHub.setUserOffline(userId, clientId);
    
    try { eventStream.close(); } catch (e) {}
  };

  event.node.res.on('close', () => cleanup('RES_CLOSE'));
  event.node.req.on('close', () => cleanup('REQ_CLOSE'));
  eventStream.onClosed(() => cleanup('STRM_CLOSE'));

  return eventStream.send();
});
