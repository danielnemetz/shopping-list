<script setup lang="ts">
import { ref, computed } from "vue";
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
  Globe as LucideGlobe,
} from "lucide-vue-next";
import type { ThemeMode } from "~/composables/useTheme";
import { useClickOutside } from "~/composables/useClickOutside";
import { usePwa } from "~/composables/usePwa";

const props = defineProps<{
  user: any;
  allTagsCount?: number;
  showFilterBar?: boolean;
}>();

const emit = defineEmits(["toggle-filter"]);

const { t } = useI18n();
const { themeMode } = useTheme();
const { isInstallable, isIos, showInstallOption, install: installApp } = usePwa();
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

const handleInstallClick = () => {
  if (isInstallable.value) {
    installApp();
  } else if (isIos.value) {
    alert(t('header.installAppIosHint'));
  }
};
</script>

<template>
  <div class="header-container">
    <header class="list-header glass-panel" id="app-header">
    <div class="header-left">
      <div class="menu-container" ref="navMenuRef">
        <button
          class="burger-btn"
          @click.stop="toggleNav"
          :class="{ active: isNavOpen }"
          :title="$t('header.menu')"
        >
          <div class="burger-bar"></div>
          <div class="burger-bar"></div>
          <div class="burger-bar"></div>
        </button>

        <TheDropdownMenu :show="isNavOpen" align="left">
          <template #header>
            <span class="menu-title">{{ $t('header.menu') }}</span>
          </template>

          <TheDropdownItem to="/activity" @click="isNavOpen = false">
            <template #icon><LucideActivity :size="18" /></template>
            {{ $t('header.activities') }}
          </TheDropdownItem>
          
          <TheDropdownItem to="/tags" @click="isNavOpen = false">
            <template #icon><LucideTags :size="18" /></template>
            {{ $t('header.manageTags') }}
          </TheDropdownItem>

          <TheDropdownItem 
            v-if="showInstallOption" 
            variant="success" 
            @click="handleInstallClick(); isNavOpen = false"
          >
            <template #icon><LucideDownload :size="18" /></template>
            {{ $t('header.installApp') }}
          </TheDropdownItem>
        </TheDropdownMenu>
      </div>

      <div class="header-title">
        <LucideShoppingCart :size="24" class="logo-icon" />
        <h2>Listly</h2>
      </div>
    </div>

    <div class="header-right">
      <button 
        v-if="allTagsCount && allTagsCount > 0"
        class="filter-toggle-btn" 
        :class="{ active: showFilterBar }"
        @click.stop="emit('toggle-filter')"
        :title="$t('header.toggleFilter')"
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

          <div class="user-menu-row">
            <div class="icon-wrapper">
              <LucideSun v-if="themeMode === 'light'" :size="18" />
              <LucideMoon v-else-if="themeMode === 'dark'" :size="18" />
              <LucideMonitor v-else :size="18" />
            </div>
            <span class="row-label">{{ $t('header.theme') }}:</span>
            <ThemeSelector />
          </div>

          <div class="user-menu-row">
            <div class="icon-wrapper"><LucideGlobe :size="18" /></div>
            <span class="row-label">{{ $t('header.language') }}:</span>
            <LanguageSelector />
          </div>

          <TheDropdownItem variant="danger" @click.stop="logout">
            <template #icon><LucideLogOut :size="18" /></template>
            {{ $t('header.logout') }}
          </TheDropdownItem>
        </TheDropdownMenu>
      </div>
    </div>
  </header>
  </div>
</template>

<style scoped>
.header-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

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

.user-menu-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 1rem;
}

.user-menu-row .icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  flex-shrink: 0;
  width: 18px;
}

.user-menu-row .row-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>
