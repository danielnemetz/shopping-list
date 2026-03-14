import { ref, onMounted } from 'vue';

export const usePwa = () => {
  const deferredPrompt = ref<any>(null);
  const isInstallable = ref(false);
  const isInstalled = ref(false);

  onMounted(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      isInstalled.value = true;
    }

    // Listen for installable event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      deferredPrompt.value = e;
      isInstallable.value = true;
      console.log('[PWA] App is installable');
    });

    window.addEventListener('appinstalled', () => {
      isInstalled.value = true;
      isInstallable.value = false;
      deferredPrompt.value = null;
      console.log('[PWA] App installed successfully');
    });
  });

  const install = async () => {
    if (!deferredPrompt.value) return;

    // Show the prompt
    deferredPrompt.value.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.value.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    deferredPrompt.value = null;
    isInstallable.value = false;
  };

  return {
    isInstallable,
    isInstalled,
    install
  };
};
