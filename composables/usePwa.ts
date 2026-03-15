import { ref, computed, onMounted } from 'vue';

let earlyPromptEvent: Event | null = null;
let listenerRegistered = false;

function ensureGlobalListener() {
  if (listenerRegistered || typeof window === 'undefined') return;
  listenerRegistered = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    earlyPromptEvent = e;
  }, { once: true });
}

ensureGlobalListener();

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export const usePwa = () => {
  const deferredPrompt = ref<any>(null);
  const isInstallable = ref(false);
  const isInstalled = ref(false);
  const isIos = ref(false);

  if (import.meta.client) {
    ensureGlobalListener();
    isIos.value = isIosDevice();
  }

  onMounted(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      isInstalled.value = true;
      return;
    }

    if (earlyPromptEvent) {
      deferredPrompt.value = earlyPromptEvent;
      isInstallable.value = true;
      earlyPromptEvent = null;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt.value = e;
      isInstallable.value = true;
    });

    window.addEventListener('appinstalled', () => {
      isInstalled.value = true;
      isInstallable.value = false;
      deferredPrompt.value = null;
    });
  });

  const showInstallOption = computed(
    () => !isInstalled.value && (isInstallable.value || isIos.value)
  );

  const install = async () => {
    if (deferredPrompt.value) {
      deferredPrompt.value.prompt();
      const { outcome } = await deferredPrompt.value.userChoice;
      console.log(`[PWA] User response: ${outcome}`);
      deferredPrompt.value = null;
      isInstallable.value = false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    isIos,
    showInstallOption,
    install
  };
};
