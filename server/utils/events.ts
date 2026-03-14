import { EventEmitter } from 'events';

interface ClientInfo {
  lastSeen: number;
}

/**
 * Robust EventHub for SSE.
 * Identifies clients by a unique ID to handle HMR and reconnects idempotently.
 */
class EventHub extends EventEmitter {
  private static instance: EventHub;
  
  // userId -> Map<clientId, ClientInfo>
  private activeUsers = new Map<string, Map<string, ClientInfo>>();
  // userId -> timer
  private offlineTimers = new Map<string, NodeJS.Timeout>();
  
  private constructor() {
    super();
    this.setMaxListeners(100);
    
    // Background pruning task (cleanup for dead clients)
    setInterval(() => this.pruneDeadConnections(), 30000);
    console.log('[EventHub] Initialized with 30s pruning loop');
  }

  public static getInstance(): EventHub {
    const globalKey = '__listly_event_hub';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new EventHub();
    }
    return (globalThis as any)[globalKey];
  }

  public setUserOnline(userId: string, clientId: string) {
    // Cancel any pending offline broadcast for this user
    if (this.offlineTimers.has(userId)) {
      clearTimeout(this.offlineTimers.get(userId) as NodeJS.Timeout);
      this.offlineTimers.delete(userId);
    }

    if (!this.activeUsers.has(userId)) {
      this.activeUsers.set(userId, new Map());
    }
    
    const clients = this.activeUsers.get(userId)!;
    const isNewUser = clients.size === 0;
    
    clients.set(clientId, { lastSeen: Date.now() });

    if (isNewUser) {
      console.log(`[Presence] User ${userId} came ONLINE (First client: ${clientId})`);
      this.broadcastPresence();
    }
  }

  public setUserOffline(userId: string, clientId: string) {
    const clients = this.activeUsers.get(userId);
    if (!clients || !clients.has(clientId)) return;

    clients.delete(clientId);
    console.log(`[Presence] Client ${clientId} left for user ${userId}. Remaining: ${clients.size}`);

    if (clients.size === 0) {
      // Delay the global "offline" broadcast to allow for reloads/HMR
      const timer = setTimeout(() => {
        const currentClients = this.activeUsers.get(userId);
        if (!currentClients || currentClients.size === 0) {
          console.log(`[Presence] User ${userId} confirmed OFFLINE after grace period`);
          this.broadcastPresence();
        }
        this.offlineTimers.delete(userId);
      }, 2000);
      
      this.offlineTimers.set(userId, timer);
    }
  }

  /**
   * Prune clients who haven't sent a heartbeat for > 45 seconds
   */
  private pruneDeadConnections() {
    const now = Date.now();
    const timeout = 45000;
    let changed = false;

    for (const [userId, clients] of this.activeUsers.entries()) {
      const initialSize = clients.size;
      
      for (const [clientId, info] of clients.entries()) {
        if (now - info.lastSeen > timeout) {
          console.log(`[Presence] PRUNING dead client ${clientId} for user ${userId}`);
          clients.delete(clientId);
        }
      }

      if (initialSize > 0 && clients.size === 0) {
        // When pruning leads to 0 clients, we also want to wait for grace period?
        // Actually, if they haven't been seen for 45s, they are definitely gone.
        console.log(`[Presence] User ${userId} is now OFFLINE (all clients pruned)`);
        changed = true;
      }
    }

    if (changed) {
      this.broadcastPresence();
    }
  }

  public getOnlineUsers(): string[] {
    const online: string[] = [];
    for (const [userId, clients] of this.activeUsers.entries()) {
      if (clients.size > 0) {
        online.push(userId);
      }
    }
    return online;
  }

  private broadcastPresence() {
    this.broadcast('presence:updated', this.getOnlineUsers());
  }

  public broadcast(type: string, data?: any) {
    this.emit('event', { type, data, timestamp: new Date().toISOString() });
  }
}

export const eventHub = EventHub.getInstance();
