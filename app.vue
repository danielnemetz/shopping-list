<script setup lang="ts">
import { computed, ref } from "vue";
import { WifiOff as LucideWifiOff } from "lucide-vue-next";
import { useTheme } from "~/composables/useTheme";

const route = useRoute();
const { connect, state: syncState } = useSync();
const { applyTheme } = useTheme();

const isPublicRoute = computed(() => {
  const path = route.path;
  return path === "/login" || path.startsWith("/auth/");
});

// Grace period so we don't flash the offline banner on initial load/reload (connection needs a moment).
const offlineBannerGracePeriodMs = 1200;
const gracePeriodPassed = ref(false);
let graceTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  applyTheme();
  connect();
  graceTimer = setTimeout(() => {
    gracePeriodPassed.value = true;
    graceTimer = null;
  }, offlineBannerGracePeriodMs);
});

onUnmounted(() => {
  if (graceTimer) clearTimeout(graceTimer);
});

// Only show when: not on public route, currently disconnected, AND (we've been connected before = real offline, or grace period passed = still no connection after load).
const showOfflineBanner = computed(
  () =>
    !isPublicRoute.value &&
    !syncState.isConnected &&
    (syncState.hasConnectedOnce || gracePeriodPassed.value)
);
</script>

<template>
  <div :class="route.path === '/api-docs' ? 'api-docs-root' : 'app-container'">
    <VitePwaManifest />
    <div class="offline-global-banner" v-if="showOfflineBanner">
      <LucideWifiOff :size="14" />
      <span>{{ $t('common.offlineBanner') }}</span>
    </div>
    <NuxtPage />
    <TheConfirmDialog />
  </div>
</template>

<style>
/* Font import for Inter */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

.offline-global-banner {
  background-color: var(--danger-color);
  color: white;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
  z-index: 501;
}
</style>
