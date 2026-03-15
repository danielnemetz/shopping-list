<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import {
  Activity as LucideActivity,
  LogOut as LucideLogOut,
  ShoppingCart as LucideShoppingCart,
  Sun as LucideSun,
  Moon as LucideMoon,
  Monitor as LucideMonitor,
  Tags as LucideTags,
  Download as LucideDownload,
  Filter as LucideFilter,
} from "lucide-vue-next";
import { useClickOutside } from "~/composables/useClickOutside";
import { usePwa } from "~/composables/usePwa";

const props = defineProps<{
  user: any;
  syncState: any;
  allTagsCount?: number;
  showFilterBar?: boolean;
}>();

const emit = defineEmits(["toggle-filter"]);

const { themeMode, toggleTheme } = useTheme();
const { isInstallable, install: installApp } = usePwa();
const router = useRouter();

const isNavOpen = ref(false);
const isUserMenuOpen = ref(false);

const navMenuRef = ref(null);
const userMenuRef = ref(null);

useClickOutside(navMenuRef, () => {
  isNavOpen.value = false;
});
useClickOutside(userMenuRef, () => {
  isUserMenuOpen.value = false;
});

const toggleNav = () => {
  isNavOpen.value = !isNavOpen.value;
  if (isNavOpen.value) isUserMenuOpen.value = false;
};

const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value;
  if (isUserMenuOpen.value) isNavOpen.value = false;
};

const logout = async () => {
  await $fetch("/api/auth/logout", { method: "POST" });
  router.push("/login");
};
</script>

<template>
  <header class="list-header glass-panel">
    <div class="header-left">
      <div class="menu-container" ref="navMenuRef">
        <button
          class="burger-btn"
          @click.stop="toggleNav"
          :class="{ active: isNavOpen }"
          title="Menu"
        >
          <div class="burger-bar"></div>
          <div class="burger-bar"></div>
          <div class="burger-bar"></div>
        </button>

        <TheDropdownMenu :show="isNavOpen" align="left">
          <template #header>
            <span class="menu-title">Menü</span>
          </template>

          <TheDropdownItem to="/activity" @click="isNavOpen = false">
            <template #icon><LucideActivity :size="18" /></template>
            Aktivitäten
          </TheDropdownItem>
          
          <TheDropdownItem to="/tags" @click="isNavOpen = false">
            <template #icon><LucideTags :size="18" /></template>
            Tags verwalten
          </TheDropdownItem>

          <TheDropdownItem 
            v-if="isInstallable" 
            variant="success" 
            @click="installApp(); isNavOpen = false"
          >
            <template #icon><LucideDownload :size="18" /></template>
            App installieren
          </TheDropdownItem>
        </TheDropdownMenu>
      </div>

      <div class="header-title">
        <LucideShoppingCart :size="24" class="logo-icon" />
        <h2>Listly</h2>
      </div>

      <div
        class="sync-status"
        :class="{ connected: syncState.isConnected }"
        :title="syncState.isConnected ? 'Online' : 'Offline'"
      >
        <div class="status-dot"></div>
        <span>{{ syncState.isConnected ? "Synced" : "Offline" }}</span>
      </div>
    </div>

    <div class="header-right">
      <button 
        v-if="allTagsCount && allTagsCount > 0"
        class="filter-toggle-btn" 
        :class="{ active: showFilterBar }"
        @click.stop="emit('toggle-filter')"
        title="Tags ein-/ausblenden"
      >
        <LucideFilter :size="18" />
      </button>

      <div class="user-menu-container" ref="userMenuRef">
        <button class="avatar-btn" @click.stop="toggleUserMenu">
          <div class="avatar" v-if="user">
            {{ user.name?.substring(0, 2).toUpperCase() }}
          </div>
        </button>

        <TheDropdownMenu :show="isUserMenuOpen" align="right">
          <template #header>
            <span class="user-name">{{ user?.name }}</span>
            <span class="user-email">{{ user?.email }}</span>
          </template>

          <TheDropdownItem @click.stop="toggleTheme">
            <template #icon>
              <LucideSun v-if="themeMode === 'light'" :size="18" />
              <LucideMoon v-else-if="themeMode === 'dark'" :size="18" />
              <LucideMonitor v-else :size="18" />
            </template>
            Darstellung: <strong>{{ themeMode }}</strong>
          </TheDropdownItem>

          <TheDropdownItem variant="danger" @click.stop="logout">
            <template #icon><LucideLogOut :size="18" /></template>
            Abmelden
          </TheDropdownItem>
        </TheDropdownMenu>
      </div>
    </div>
  </header>
</template>

<style scoped>
.list-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  padding-top: calc(1rem + env(safe-area-inset-top, 0px));
  margin: 1rem;
  margin-bottom: 0.5rem;
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  z-index: 500;
  box-shadow: var(--shadow-md);
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.logo-icon {
  color: var(--accent-color);
  filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.4));
}

.header-title h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 4px 10px;
  border-radius: 99px;
  background: var(--bg-surface-elevated);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  transition: all var(--transition-normal);
}

.sync-status.connected {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.sync-status.connected .status-dot {
  box-shadow: 0 0 8px currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.filter-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-surface-elevated);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  transition: all var(--transition-normal);
  cursor: pointer;
}

.filter-toggle-btn.active {
  color: var(--accent-color);
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
}

.filter-toggle-btn:hover {
  transform: translateY(-1px);
  color: var(--accent-light);
}

.avatar-btn {
  background: var(--accent-gradient);
  border: 2px solid var(--glass-border);

  padding: 2px;
  cursor: pointer;
  border-radius: 99px;
  transition: all var(--transition-bounce);
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.avatar-btn:hover {
  transform: scale(1.1) rotate(5deg);
  box-shadow: var(--shadow-glow);
}

.avatar {
  background-color: var(--bg-surface);
  color: var(--text-main);
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
}

/* Burger Button Redesign */
.burger-btn {
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  cursor: pointer;
  transition: all var(--transition-bounce);
  padding: 0;
}

.burger-btn:hover {
  transform: translateY(-2px);
  border-color: var(--accent-color);
  background: var(--bg-surface);
  box-shadow: var(--shadow-glow);
}

.burger-bar {
  width: 18px;
  height: 2.5px;
  background-color: var(--text-main);
  border-radius: 4px;
  transition: all var(--transition-premium);
}

.burger-btn.active .burger-bar:nth-child(1) {
  transform: translateY(6.5px) rotate(45deg);
  width: 22px;
}
.burger-btn.active .burger-bar:nth-child(2) {
  opacity: 0;
}
.burger-btn.active .burger-bar:nth-child(3) {
  transform: translateY(-6.5px) rotate(-45deg);
  width: 22px;
}

.menu-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  font-weight: 800;
}

.user-name {
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

.user-email {
  font-size: 0.75rem;
  color: var(--text-muted);
}
</style>
