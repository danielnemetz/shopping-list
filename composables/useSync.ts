import { ref, onMounted, onUnmounted, reactive, nextTick } from 'vue';

interface PendingAction {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: any;
  timestamp: number;
}

interface SyncState {
  isConnected: boolean;
  onlineUsers: string[];
  lastEvent: string | null;
  lastEventData: any | null;
  pendingActions: PendingAction[];
}

const syncState = reactive<SyncState>({
  isConnected: false,
  onlineUsers: [],
  lastEvent: null,
  lastEventData: null,
  pendingActions: [],
});

type RefreshCallback = (data?: any) => void;
const listeners = new Map<string, Set<RefreshCallback>>();

let globalEventSource: EventSource | null = null;
let reconnectTimer: any = null;
let isProcessingQueue = false;

// Initialize queue from localStorage
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('ls_pending_actions');
  if (saved) {
    try {
      syncState.pendingActions = JSON.parse(saved);
    } catch (e) {
      localStorage.removeItem('ls_pending_actions');
    }
  }
}

const saveQueue = () => {
  localStorage.setItem('ls_pending_actions', JSON.stringify(syncState.pendingActions));
};

export const useSync = () => {
  const getClientId = () => {
    if (import.meta.server) return '';
    let cid = sessionStorage.getItem('ls_client_id');
    if (!cid) {
      cid = 'c_' + Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('ls_client_id', cid);
    }
    return cid;
  };

  const on = (eventType: string, callback: RefreshCallback) => {
    if (!listeners.has(eventType)) listeners.set(eventType, new Set());
    listeners.get(eventType)?.add(callback);
  };

  const off = (eventType: string, callback: RefreshCallback) => {
    listeners.get(eventType)?.delete(callback);
  };

  const trigger = (eventType: string, data?: any) => {
    syncState.lastEvent = eventType;
    syncState.lastEventData = data;
    listeners.get(eventType)?.forEach(cb => cb(data));
  };

  const connect = () => {
    if (import.meta.server) return;
    
    // Recovery from HMR
    if (!globalEventSource && process.dev && (window as any).__ls_sync) {
      console.log('[Sync] Recovering connection from window');
      globalEventSource = (window as any).__ls_sync;
      if (globalEventSource?.readyState === EventSource.OPEN) syncState.isConnected = true;
    }

    if (globalEventSource && globalEventSource.readyState !== EventSource.CLOSED) return;

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    const cid = getClientId();
    console.log(`[Sync] Connecting as ${cid}...`);
    
    const source = new EventSource(`/api/events?clientId=${cid}&t=${Date.now()}`);
    globalEventSource = source;
    if (process.dev) (window as any).__ls_sync = source;

    source.onopen = () => {
      console.log('[Sync] Connected');
      syncState.isConnected = true;
    };

    source.onerror = () => {
      syncState.isConnected = false;
      source.close();
      if (globalEventSource === source) {
        globalEventSource = null;
        if (process.dev) (window as any).__ls_sync = null;
      }
      reconnectTimer = setTimeout(connect, 5000);
    };

    // Unload management
    const onUnload = () => {
      const data = JSON.stringify({ action: 'disconnect', clientId: cid });
      const blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon('/api/presence', blob);
    };
    
    window.removeEventListener('beforeunload', (window as any).__ls_unload);
    (window as any).__ls_unload = onUnload;
    window.addEventListener('beforeunload', onUnload);

    const handle = (type: string) => (msg: MessageEvent) => {
      try {
        const data = JSON.parse(msg.data);
        trigger(type, data);
      } catch (e) {
        trigger(type);
      }
    };

    source.addEventListener('items:updated', handle('items:updated'));
    source.addEventListener('tags:updated', handle('tags:updated'));
    source.addEventListener('comments:updated', handle('comments:updated'));
    
    source.addEventListener('typing:updated', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        trigger('typing:updated', data);
      } catch (err) {}
    });

    source.addEventListener('app:reload', () => {
      console.log('[Sync] Received global reload signal. Refreshing client...');
      window.location.reload();
    });

    source.addEventListener('presence:updated', (e: any) => {
      try {
        syncState.onlineUsers = JSON.parse(e.data) || [];
      } catch (err) {}
    });

    source.addEventListener('connected', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.onlineUsers) syncState.onlineUsers = data.onlineUsers;
        // Try to sync whenever we connect
        processQueue();
      } catch (err) {}
    });

    // Handle browser online event
    if (import.meta.client) {
      window.addEventListener('online', processQueue);
    }
  };

  const queueAction = (url: string, method: 'POST' | 'PUT' | 'DELETE', body: any) => {
    const action: PendingAction = {
      id: 'a_' + Math.random().toString(36).substring(2, 10),
      url,
      method,
      body,
      timestamp: Date.now(),
    };
    syncState.pendingActions.push(action);
    saveQueue();
    processQueue(); // Try immediately
    return action.id;
  };

  const processQueue = async () => {
    if (isProcessingQueue || syncState.pendingActions.length === 0) return;
    if (!navigator.onLine) return; // Simple check

    isProcessingQueue = true;
    console.log(`[Sync] Processing ${syncState.pendingActions.length} pending actions...`);

    while (syncState.pendingActions.length > 0) {
      // Re-check online status each time
      if (!navigator.onLine) break;

      const action = syncState.pendingActions[0];
      if (!action) break;

      try {
        await $fetch(action.url as any, {
          method: action.method,
          body: action.body,
        });
        
        // Success: remove from queue
        syncState.pendingActions.shift();
        saveQueue();
        console.log(`[Sync] Action ${action.id} synced successfully`);
        
        // Small delay to prevent hammering or give server a breather
        await new Promise(r => setTimeout(r, 100));
      } catch (err: any) {
        console.warn(`[Sync] Failed to sync action ${action.id}, will retry later`, err);
        // If it's a 4xx error (client error), maybe remove it? 
        // For now, stop processing the queue and wait for next online/reconnect
        break;
      }
    }

    isProcessingQueue = false;
  };

  const setTyping = async (itemId: string) => {
    if (import.meta.server) return;
    await $fetch('/api/typing', {
      method: 'POST',
      body: { itemId }
    }).catch(() => {});
  };

  const disconnect = async () => {
    const cid = getClientId();
    await $fetch('/api/presence', {
      method: 'POST',
      body: { action: 'disconnect', clientId: cid }
    }).catch(() => {});

    if (globalEventSource) {
      globalEventSource.close();
      globalEventSource = null;
      if (process.dev) (window as any).__ls_sync = null;
      syncState.isConnected = false;
      syncState.onlineUsers = [];
    }
  };

  const isOnline = (id: string | number | null | undefined) => {
    if (!id) return false;
    return syncState.onlineUsers.includes(String(id));
  };

  return {
    state: syncState,
    connect,
    disconnect,
    on,
    off,
    isOnline,
    setTyping,
    queueAction,
    processQueue
  };
};
