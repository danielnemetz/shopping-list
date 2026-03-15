<script setup lang="ts">
import { ref, watch } from "vue";
import {
  X as LucideX,
  Plus as LucidePlus,
} from "lucide-vue-next";

const props = defineProps<{
  show: boolean;
  item: any | null;
  allTags: any[];
}>();

const emit = defineEmits<{
  (e: "close", save: boolean, updatedItem: any): void;
  (e: "add-global-tag", name: string): void;
}>();

const localItem = ref<any>(null);
const popoverTagInput = ref("");

watch(() => props.item, (newVal) => {
  if (newVal) {
    localItem.value = JSON.parse(JSON.stringify(newVal));
    if (!localItem.value.tags) localItem.value.tags = [];
  } else {
    localItem.value = null;
  }
}, { immediate: true });

const toggleTag = (tagName: string) => {
  if (!localItem.value) return;
  const index = localItem.value.tags.findIndex((t: any) => t.name === tagName);
  if (index >= 0) {
    localItem.value.tags.splice(index, 1);
  } else {
    localItem.value.tags.push({ id: -1, name: tagName });
  }
};

const addTag = () => {
  const trimmed = popoverTagInput.value.trim();
  if (trimmed && localItem.value) {
    if (!localItem.value.tags.some((t: any) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      localItem.value.tags.push({ id: -1, name: trimmed });
      emit("add-global-tag", trimmed);
    }
    popoverTagInput.value = "";
  }
};

const close = (save: boolean) => {
  emit("close", save, localItem.value);
};
</script>

<template>
  <Transition name="fade">
    <div 
      v-if="show" 
      class="tag-popover-overlay"
      @click="close(true)"
    >
      <div class="tag-popover-panel glass-panel" @click.stop>
        <div class="tag-popover-header">
          <h3>Tags für "{{ item?.text }}"</h3>
          <button class="tag-popover-close" @click="close(true)">
            <LucideX :size="20" />
          </button>
        </div>
        
        <div class="tag-popover-content">
          <div class="popover-input-wrapper">
            <input 
              v-model="popoverTagInput"
              type="text"
              class="popover-tag-input"
              placeholder="Neuen Tag hinzufügen..."
              @keydown.enter.prevent="addTag"
            />
            <button class="popover-add-btn" @click="addTag" :disabled="!popoverTagInput.trim()">
              <LucidePlus :size="18" />
            </button>
          </div>

          <div class="tag-grid">
            <button 
              v-for="tag in allTags" 
              :key="tag.id"
              class="tag-selection-btn"
              :class="{ active: localItem?.tags?.some((t: any) => t.name === tag.name) }"
              @click="toggleTag(tag.name)"
            >
              {{ tag.name }}
            </button>
          </div>
          
          <div class="tag-popover-footer">
            <button class="done-btn" @click="close(true)">Fertig</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.tag-popover-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.tag-popover-panel {
  width: 100%;
  max-width: 500px;
  background: var(--bg-surface);
  border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
  padding: 2rem;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
  border: 1px solid var(--border-color);
  border-bottom: none;
  box-shadow: 0 -20px 50px rgba(0, 0, 0, 0.4);
  animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.tag-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.tag-popover-header h3 {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

.tag-popover-close {
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.6rem;
  border-radius: 12px;
  display: flex;
  transition: all var(--transition-fast);
}

.tag-popover-close:hover {
  background: var(--bg-surface);
  color: var(--danger-color);
  transform: rotate(90deg);
}

.popover-input-wrapper {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.popover-tag-input {
  flex: 1;
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 1rem 1.25rem;
  color: var(--text-main);
  font-size: 1rem;
  outline: none;
  transition: all var(--transition-normal);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

.popover-tag-input:focus {
  border-color: var(--accent-color);
  background: var(--bg-surface);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
}

.popover-add-btn {
  background: var(--accent-gradient);
  color: white;
  border: none;
  border-radius: 16px;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-bounce);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.popover-add-btn:hover:not(:disabled) {
  transform: scale(1.05) rotate(5deg);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
}

.popover-add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin-bottom: 2.5rem;
  max-height: 45vh;
  overflow-y: auto;
  padding-right: 8px;
}

.tag-grid::-webkit-scrollbar {
  width: 4px;
}

.tag-grid::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 10px;
}

.tag-selection-btn {
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.65rem 1.15rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  transition: all var(--transition-bounce);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.tag-selection-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
}

.tag-selection-btn.active {
  background: var(--accent-gradient);
  border-color: transparent;
  color: white;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
  transform: scale(1.05);
}

.done-btn {
  width: 100%;
  padding: 1.15rem;
  background: var(--accent-gradient);
  color: white;
  border: none;
  border-radius: 18px;
  font-weight: 800;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all var(--transition-bounce);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
}

.done-btn:hover {
  background: var(--accent-gradient-hover);
  transform: translateY(-3px);
  box-shadow: 0 15px 30px rgba(99, 102, 241, 0.4);
}

.done-btn:active {
  transform: translateY(-1px);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s var(--transition-premium);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
