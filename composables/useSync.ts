import { ref, onMounted, onUnmounted, reactive } from 'vue';

interface SyncState {
  isConnected: boolean;
  lastEvent: string | null;
  lastEventData: any | null;
}

// Global state for sync to share across components
const syncState = reactive<SyncState>({
  isConnected: false,
  lastEvent: null,
  lastEventData: null,
});

// Simple event bus for components to listen to refreshes
type RefreshCallback = (data?: any) => void;
const listeners = new Map<string, Set<RefreshCallback>>();

export const useSync = () => {
  const eventSource = ref<EventSource | null>(null);

  const on = (eventType: string, callback: RefreshCallback) => {
    if (!listeners.has(eventType)) {
      listeners.set(eventType, new Set());
    }
    listeners.get(eventType)?.add(callback);
  };

  const off = (eventType: string, callback: RefreshCallback) => {
    listeners.get(eventType)?.delete(callback);
  };

  const trigger = (eventType: string, data?: any) => {
    syncState.lastEvent = eventType;
    syncState.lastEventData = data;
    listeners.get(eventType)?.forEach(callback => callback(data));
  };

  const connect = () => {
    if (import.meta.server || eventSource.value) return;

    console.log('[Sync] Connecting to SSE...');
    eventSource.value = new EventSource('/api/events');

    eventSource.value.onopen = () => {
      console.log('[Sync] Connected');
      syncState.isConnected = true;
    };

    eventSource.value.onerror = (err) => {
      console.error('[Sync] Error/Disconnected', err);
      syncState.isConnected = false;
      eventSource.value?.close();
      eventSource.value = null;
      // Reconnect after 5 seconds
      setTimeout(connect, 5000);
    };

    // Generic event handler for known event types
    const handleEvent = (type: string) => {
      return (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`[Sync] Event: ${type}`, data);
          trigger(type, data);
        } catch (e) {
          console.warn(`[Sync] Failed to parse event data for ${type}`, e);
          trigger(type);
        }
      };
    };

    eventSource.value.addEventListener('items:updated', handleEvent('items:updated'));
    eventSource.value.addEventListener('tags:updated', handleEvent('tags:updated'));
    eventSource.value.addEventListener('comments:updated', handleEvent('comments:updated'));
    eventSource.value.addEventListener('connected', (e) => console.log('[Sync] Server Handshake:', e.data));
    eventSource.value.addEventListener('heartbeat', () => { /* Just stay alive */ });
  };

  const disconnect = () => {
    if (eventSource.value) {
      eventSource.value.close();
      eventSource.value = null;
      syncState.isConnected = false;
    }
  };

  return {
    state: syncState,
    connect,
    disconnect,
    on,
    off,
    trigger // useful for local optimistic updates if needed
  };
};
