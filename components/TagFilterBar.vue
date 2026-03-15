<script setup lang="ts">
import { Tag as LucideTag } from "lucide-vue-next";

defineProps<{
  allTags: any[];
  selectedFilterTags: number[];
}>();

defineEmits<{
  (e: "toggle", tagId: number): void;
}>();
</script>

<template>
  <div class="tag-filter-bar" v-if="allTags.length > 0">
    <div class="tag-filter-sticky-wrapper">
      <LucideTag :size="16" class="tag-filter-icon" />
    </div>
    <button
      v-for="tag in allTags"
      :key="tag.id"
      class="tag-chip"
      :class="{ active: selectedFilterTags.includes(tag.id) }"
      @click="$emit('toggle', tag.id)"
    >
      {{ tag.name }}
    </button>
  </div>
</template>

<style scoped>
.tag-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  overflow-x: auto;
  padding: 1rem 1rem;
  margin: 0 -1rem 0.5rem -1rem;
  padding-left: 0; /* Reset to allow sticky to touch the edge */
  padding-right: 1.5rem;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}

.tag-filter-bar::-webkit-scrollbar {
  display: none;
}

.tag-filter-sticky-wrapper {
  position: sticky;
  left: 0;
  z-index: 10;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  background: var(--bg-color);
  padding: 0.5rem 0.25rem 0.5rem 1.5rem;
  margin-right: -0.1rem;
}

.tag-filter-sticky-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  left: 100%;
  width: 1rem; /* Further reduced from 2rem */
  height: 100%;
  background: linear-gradient(to right, var(--bg-color), transparent);
  pointer-events: none;
}

.tag-filter-icon {
  color: var(--accent-color);
  flex-shrink: 0;
  filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.4));
  transform: translateY(1px); /* Optical alignment */
}

.tag-chip {
  flex-shrink: 0;
  background: var(--bg-surface-elevated);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 0.5rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-bounce);
  white-space: nowrap;
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  letter-spacing: 0.02em;
}

.tag-chip:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
  transform: translateY(-2px);
  background: rgba(99, 102, 241, 0.05);
}

.tag-chip.active {
  background: var(--accent-gradient);
  border-color: transparent;
  color: white;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
  transform: scale(1.08);
}
</style>
