import { onMounted, onUnmounted, type Ref } from 'vue';

export const useClickOutside = (elRef: Ref<HTMLElement | null>, callback: () => void) => {
  const handler = (event: MouseEvent) => {
    if (!elRef.value || elRef.value.contains(event.target as Node)) {
      return;
    }
    callback();
  };

  onMounted(() => {
    window.addEventListener('click', handler);
  });

  onUnmounted(() => {
    window.removeEventListener('click', handler);
  });
};
