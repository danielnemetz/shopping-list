import { ref, watch, onMounted, type Ref } from 'vue';

const PREFIX = 'listly_';

function storageKey(key: string): string {
  return key.startsWith(PREFIX) ? key : `${PREFIX}${key}`;
}

function read<T extends string | boolean | number>(key: string, defaultValue: T): T {
  if (!import.meta.client) return defaultValue;
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (raw === null) return defaultValue;
    if (typeof defaultValue === 'boolean') return (raw === 'true') as T;
    if (typeof defaultValue === 'number') return Number(raw) as T;
    return raw as T;
  } catch {
    return defaultValue;
  }
}

function write(key: string, value: string | number | boolean): void {
  if (!import.meta.client) return;
  try {
    localStorage.setItem(storageKey(key), String(value));
  } catch {
    // ignore
  }
}

/**
 * Reactive ref backed by localStorage. Use for UI preferences that should persist.
 * Key is stored with prefix `listly_` if not already present.
 * Value is read from localStorage on client after mount to avoid hydration mismatch.
 */
export function useUiStorage<T extends string | boolean | number>(
  key: string,
  defaultValue: T
): Ref<T> {
  const value = ref<T>(defaultValue) as Ref<T>;

  onMounted(() => {
    value.value = read(key, defaultValue);
  });

  watch(
    value,
    (v) => {
      write(key, v as string | number | boolean);
    },
    { flush: 'post' }
  );

  return value;
}
