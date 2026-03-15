<script setup lang="ts">
import { ref, computed } from "vue";
import { ChevronDown as LucideChevronDown } from "lucide-vue-next";
import { useClickOutside } from "~/composables/useClickOutside";

const { locale, t, setLocale } = useI18n();

const options: { code: string; flag: string; label: string }[] = [
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "pl", flag: "🇵🇱", label: "Polski" },
];

const isOpen = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);

useClickOutside(wrapperRef, () => {
  isOpen.value = false;
});

const current = computed(() =>
  options.find((o) => o.code === locale.value) ?? options[0]
);

async function select(code: string) {
  isOpen.value = false;
  await setLocale(code);
}
</script>

<template>
  <div class="language-selector" ref="wrapperRef">
    <button
      type="button"
      class="selector-trigger"
      :class="{ open: isOpen }"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
      @click.stop="isOpen = !isOpen"
    >
      <span class="flag">{{ current.flag }}</span>
      <span class="label">{{ current.label }}</span>
      <LucideChevronDown :size="16" class="chevron" />
    </button>

    <Transition name="dropdown">
      <div v-if="isOpen" class="selector-dropdown" role="menu">
        <button
          v-for="opt in options"
          :key="opt.code"
          type="button"
          role="menuitem"
          class="selector-option"
          :class="{ active: locale === opt.code }"
          @click.stop="select(opt.code)"
        >
          <span class="flag">{{ opt.flag }}</span>
          <span class="label">{{ opt.label }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.language-selector {
  position: relative;
}

.selector-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.85rem 1rem;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.selector-trigger:hover {
  background: var(--bg-surface-hover);
  color: var(--text-main);
}

.selector-trigger .flag {
  font-size: 1.25rem;
  line-height: 1;
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

.selector-option .flag {
  font-size: 1.1rem;
  line-height: 1;
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
