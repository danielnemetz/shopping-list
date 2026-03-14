import { EventEmitter } from 'events';

/**
 * Central EventHub for Server-Sent Events (SSE).
 * This singleton allows different API routes to broadcast events to connected clients.
 */
class EventHub extends EventEmitter {
  private static instance: EventHub;

  private constructor() {
    super();
    // Increase max listeners to avoid warnings when many clients connect
    this.setMaxListeners(100);
  }

  public static getInstance(): EventHub {
    if (!EventHub.instance) {
      EventHub.instance = new EventHub();
    }
    return EventHub.instance;
  }

  /**
   * Broadcast an event to all connected clients.
   * @param type The type of event (e.g., 'items:updated', 'tags:updated')
   * @param data Optional data payload
   */
  public broadcast(type: string, data?: any) {
    this.emit('event', { type, data, timestamp: new Date().toISOString() });
  }
}

export const eventHub = EventHub.getInstance();
