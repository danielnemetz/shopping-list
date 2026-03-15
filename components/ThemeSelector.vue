<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Sun as LucideSun,
  Moon as LucideMoon,
  Monitor as LucideMonitor,
  ChevronDown as LucideChevronDown,
} from "lucide-vue-next";
import { useClickOutside } from "~/composables/useClickOutside";
import { type ThemeMode } from "~/composables/useTheme";

const { t } = useI18n();
const { themeMode, setTheme } = useTheme();

const options: { code: ThemeMode; labelKey: string }[] = [
  { code: "light", labelKey: "header.themeLight" },
  { code: "dark", labelKey: "header.themeDark" },
  { code: "auto", labelKey: "header.themeAuto" },
];

const isOpen = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);

useClickOutside(wrapperRef, () => {
  isOpen.value = false;
});

const current = computed(() =>
  options.find((o) => o.code === themeMode.value) ?? options[2]
);

function select(code: ThemeMode) {
  setTheme(code);
  isOpen.value = false;
}
</script>

<template>
  <div class="theme-selector" ref="wrapperRef">
    <button
      type="button"
      class="selector-trigger"
      :class="{ open: isOpen }"
      @click.stop="isOpen = !isOpen"
    >
      <LucideSun v-if="themeMode === 'light'" :size="15" />
      <LucideMoon v-else-if="themeMode === 'dark'" :size="15" />
      <LucideMonitor v-else :size="15" />
      <span class="label">{{ t(current.labelKey) }}</span>
      <LucideChevronDown :size="14" class="chevron" />
    </button>

    <Transition name="dropdown">
      <div v-if="isOpen" class="selector-dropdown" role="menu">
        <button
          v-for="opt in options"
          :key="opt.code"
          type="button"
          role="menuitem"
          class="selector-option"
          :class="{ active: themeMode === opt.code }"
          @click.stop="select(opt.code)"
        >
          <LucideSun v-if="opt.code === 'light'" :size="15" />
          <LucideMoon v-else-if="opt.code === 'dark'" :size="15" />
          <LucideMonitor v-else :size="15" />
          <span class="label">{{ t(opt.labelKey) }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.theme-selector {
  position: relative;
}

.selector-trigger {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-surface-elevated);
  color: var(--text-main);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.selector-trigger:hover {
  background: var(--bg-surface-hover);
  border-color: var(--accent-color);
}

.selector-trigger .label {
  flex: 1;
}

.selector-trigger .chevron {
  flex-shrink: 0;
  opacity: 0.7;
  transition: transform var(--transition-fast);
}

.selector-trigger.open .chevron {
  transform: rotate(180deg);
}

.selector-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  padding: 0.35rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  z-index: 1001;
}

.selector-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.selector-option:hover {
  background: var(--bg-surface-hover);
  color: var(--text-main);
}

.selector-option.active {
  background: var(--accent-color);
  color: white;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
