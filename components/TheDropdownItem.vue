<script setup lang="ts">
defineProps<{
  to?: string;
  variant?: "default" | "danger" | "success";
}>();
</script>

<template>
  <NuxtLink
    v-if="to"
    v-bind="$attrs"
    :to="to"
    class="dropdown-item"
    :class="[variant]"
    role="menuitem"
  >
    <div class="icon-wrapper" v-if="$slots.icon">
      <slot name="icon" />
    </div>
    <span class="label">
      <slot />
    </span>
  </NuxtLink>
  
  <button
    v-else
    v-bind="$attrs"
    class="dropdown-item"
    :class="[variant]"
    role="menuitem"
  >
    <div class="icon-wrapper" v-if="$slots.icon">
      <slot name="icon" />
    </div>
    <span class="label">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  text-decoration: none;
  transition: all var(--transition-normal);
  outline: none;
}

.dropdown-item:hover,
.dropdown-item:focus-visible {
  background: rgba(var(--primary-h), var(--primary-s), 50%, 0.1);
  color: var(--accent-color);
  transform: translateX(6px);
}

.dropdown-item:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: -2px;
}

.dropdown-item.danger:hover,
.dropdown-item.danger:focus-visible {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.dropdown-item.danger:focus-visible {
  outline-color: var(--danger-color);
}

.dropdown-item.success:hover,
.dropdown-item.success:focus-visible {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success-color);
}

.dropdown-item.success:focus-visible {
  outline-color: var(--success-color);
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Specific styles for strong text within the label */
:deep(strong) {
  font-weight: 800;
  color: var(--text-main);
}
</style>
