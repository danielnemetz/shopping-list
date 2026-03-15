<script setup lang="ts">
defineProps<{
  show: boolean;
  align?: "left" | "right";
}>();
</script>

<template>
  <Transition name="dropdown">
    <div 
      v-if="show" 
      class="dropdown-menu" 
      :class="[align === 'right' ? 'align-right' : 'align-left']"
    >
      <div class="dropdown-header" v-if="$slots.header">
        <slot name="header" />
      </div>
      
      <div class="dropdown-divider" v-if="$slots.header"></div>
      
      <div class="dropdown-content">
        <slot />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dropdown-menu {
  position: absolute;
  top: calc(100% + 15px);
  min-width: 240px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  padding: 0.65rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md), 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: dropdownIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.align-left {
  left: 0;
  transform-origin: top left;
}

.align-right {
  right: 0;
  transform-origin: top right;
}

.dropdown-header {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  align-items: flex-start;
}

.dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.5rem;
  opacity: 0.6;
}

.dropdown-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

@keyframes dropdownIn {
  from { opacity: 0; transform: scale(0.95) translateY(-10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* Core transition for Vue Transition component */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>
