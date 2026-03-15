<script setup lang="ts">
import { computed } from "vue";
import { WifiOff as LucideWifiOff } from "lucide-vue-next";
import { useTheme } from "~/composables/useTheme";

const route = useRoute();
const { connect, state: syncState } = useSync();
const { applyTheme } = useTheme();

const isPublicRoute = computed(() => {
  const path = route.path;
  return path === "/login" || path.startsWith("/auth/");
});

const showOfflineBanner = computed(
  () => !isPublicRoute.value && !syncState.isConnected
);

onMounted(() => {
  applyTheme();
  connect();
});
</script>

<template>
  <div class="app-container">
    <VitePwaManifest />
    <div class="offline-global-banner" v-if="showOfflineBanner">
      <LucideWifiOff :size="14" />
      <span>{{ $t('common.offlineBanner') }}</span>
    </div>
    <NuxtPage />
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
