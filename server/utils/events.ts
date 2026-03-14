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
  // itemId -> userId -> { name: string, timestamp: number }
  private activeTyping = new Map<string, Map<string, { name: string, timestamp: number }>>();
  // userId -> timer
  private offlineTimers = new Map<string, NodeJS.Timeout>();
  
  private constructor() {
    super();
    this.setMaxListeners(100);
    
    // Background pruning task (cleanup for dead clients AND typing)
    setInterval(() => this.pruneStaleState(), 10000);
    console.log('[EventHub] Initialized with 10s pruning loop');
  }

  public static getInstance(): EventHub {
    const globalKey = '__listly_event_hub';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new EventHub();
    }
    return (globalThis as any)[globalKey];
  }

  public setTyping(itemId: string, userId: string, userName: string) {
    if (!this.activeTyping.has(itemId)) {
      this.activeTyping.set(itemId, new Map());
    }
    const typers = this.activeTyping.get(itemId)!;
    const wasTyping = typers.has(userId);
    typers.set(userId, { name: userName, timestamp: Date.now() });

    if (!wasTyping) {
      this.broadcastTyping(itemId);
    }
  }

  public getTypingUsers(itemId: string) {
    const typers = this.activeTyping.get(itemId);
    if (!typers) return [];
    return Array.from(typers.entries()).map(([userId, info]) => ({
      id: userId,
      name: info.name
    }));
  }

  private broadcastTyping(itemId: string) {
    this.broadcast('typing:updated', { 
      itemId, 
      users: this.getTypingUsers(itemId) 
    });
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
   * Prune clients and typing indicators
   */
  private pruneStaleState() {
    const now = Date.now();
    const presenceTimeout = 45000;
    const typingTimeout = 6000;
    let presenceChanged = false;

    // 1. Prune Presence
    for (const [userId, clients] of this.activeUsers.entries()) {
      const initialSize = clients.size;
      for (const [clientId, info] of clients.entries()) {
        if (now - info.lastSeen > presenceTimeout) {
          console.log(`[Presence] PRUNING dead client ${clientId} for user ${userId}`);
          clients.delete(clientId);
        }
      }
      if (initialSize > 0 && clients.size === 0) {
        console.log(`[Presence] User ${userId} is now OFFLINE (all clients pruned)`);
        presenceChanged = true;
      }
    }

    // 2. Prune Typing
    for (const [itemId, typers] of this.activeTyping.entries()) {
      let typingChanged = false;
      for (const [userId, info] of typers.entries()) {
        if (now - info.timestamp > typingTimeout) {
          typers.delete(userId);
          typingChanged = true;
        }
      }
      if (typingChanged) {
        this.broadcastTyping(itemId);
      }
    }

    if (presenceChanged) {
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
