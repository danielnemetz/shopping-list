import { createEventStream } from 'h3';
import { eventHub } from '../utils/events';
import { getAppSession } from '../utils/session';

export default defineEventHandler(async (event) => {
  // Security: Ensure user is logged in
  const session = await getAppSession(event);
  if (!session.data.userId && !session.data.isAdmin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized. Please login to receive real-time updates.',
    });
  }

  const eventStream = createEventStream(event);

  // Define the event listener
  const onEvent = async (data: any) => {
    await eventStream.push({
      event: data.type,
      data: JSON.stringify(data.data || {}),
    });
  };

  // Register listener
  eventHub.on('event', onEvent);

  // Send initial connected event
  await eventStream.push({
    event: 'connected',
    data: JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
  });

  // Setup heartbeat to keep connection alive (every 20 seconds)
  const heartbeat = setInterval(async () => {
    try {
      await eventStream.push({
        event: 'heartbeat',
        data: JSON.stringify({ t: Date.now() }),
      });
    } catch (err) {
      // Stream likely closed
      clearInterval(heartbeat);
    }
  }, 20000);

  // Cleanup on close
  eventStream.onClosed(() => {
    clearInterval(heartbeat);
    eventHub.off('event', onEvent);
  });

  return eventStream.send();
});
