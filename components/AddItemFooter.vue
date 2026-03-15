<script setup lang="ts">
import { ref, nextTick } from "vue";
import {
  Plus as LucidePlus,
  Loader as LucideLoader,
  Tag as LucideTag,
  X as LucideX,
} from "lucide-vue-next";

const props = defineProps<{
  isSubmitting: boolean;
}>();

const emit = defineEmits<{
  (e: "add-item", data: { text: string; tags: string[] }): void;
}>();

const newItemText = ref("");
const newItemTags = ref<string[]>([]);
const tagInput = ref("");
const showTagInput = ref(false);
const newItemInput = ref<HTMLInputElement | null>(null);

const addTagToNewItem = (tagName: string) => {
  const trimmed = tagName.trim();
  if (trimmed && !newItemTags.value.includes(trimmed)) {
    newItemTags.value.push(trimmed);
  }
  tagInput.value = "";
};

const removeTagFromNewItem = (tag: string) => {
  newItemTags.value = newItemTags.value.filter((t) => t !== tag);
};

const handleTagInputKeydown = (e: KeyboardEvent) => {
  if ((e.key === "Enter" || e.key === ",") && tagInput.value.trim()) {
    e.preventDefault();
    addTagToNewItem(tagInput.value);
  }
};

const handleAddItem = () => {
  if (!newItemText.value.trim() || props.isSubmitting) return;
  
  emit("add-item", {
    text: newItemText.value,
    tags: [...newItemTags.value]
  });
  
  newItemText.value = "";
  newItemTags.value = [];
  showTagInput.value = false;
  
  nextTick(() => {
    newItemInput.value?.focus();
  });
};
</script>

<template>
  <footer class="add-item-footer glass-panel">
    <!-- Tag Input Row -->
    <Transition name="slide">
      <div class="tag-input-area" v-if="showTagInput">
        <div class="new-item-tags">
          <span
            class="tag-badge removable"
            v-for="tag in newItemTags"
            :key="tag"
            @click="removeTagFromNewItem(tag)"
          >
            {{ tag }} <LucideX :size="12" />
          </span>
          <input
            v-model="tagInput"
            type="text"
            class="tag-inline-input"
            :placeholder="$t('addItem.tagPlaceholder')"
            @keydown="handleTagInputKeydown"
            @blur="tagInput.trim() && addTagToNewItem(tagInput)"
          />
        </div>
      </div>
    </Transition>
    
    <form @submit.prevent="handleAddItem" class="add-form">
      <div class="input-wrapper">
        <input
          ref="newItemInput"
          v-model="newItemText"
          type="text"
          class="input-base"
          :placeholder="$t('addItem.addPlaceholder')"
          :disabled="isSubmitting"
        />
      </div>

      <div class="action-buttons">
        <button
          type="button"
          class="footer-btn tag-toggle-btn"
          :class="{ active: showTagInput }"
          @click="showTagInput = !showTagInput"
          :title="$t('addItem.addTags')"
        >
          <LucideTag :size="20" />
        </button>
        <button
          type="submit"
          class="footer-btn add-btn"
          :disabled="!newItemText.trim() || isSubmitting"
        >
          <LucidePlus :size="24" v-if="!isSubmitting" />
          <LucideLoader :size="24" class="spin" v-else />
        </button>
      </div>
    </form>
  </footer>
</template>

<style scoped>
.add-item-footer {
  margin: 1rem;
  margin-top: 0.5rem;
  padding: 1rem 1.25rem;
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  z-index: 500;
  box-shadow: var(--shadow-md);
  position: relative;
}

.tag-input-area {
  margin-bottom: 1.25rem;
  overflow: hidden;
}

.new-item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  padding: 1rem;
  background: var(--bg-surface-elevated);
  border-radius: 18px;
  border: 1px solid var(--border-color);
  transition: all var(--transition-normal);
}

.add-form {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.input-wrapper {
  flex: 1;
  position: relative;
}

.input-base {
  width: 100%;
  height: 2.75rem;
  background: var(--bg-surface-elevated);
  border: 1.5px solid var(--border-color);
  padding: 0 1.25rem;
  border-radius: 14px;
  color: var(--text-main);
  font-size: 0.95rem;
  font-weight: 500;
  outline: none;
  transition: all var(--transition-normal);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.03);
}

.input-base:focus {
  border-color: var(--accent-color);
  background: var(--bg-surface);
  box-shadow: 0 0 0 5px rgba(99, 102, 241, 0.1), inset 0 2px 4px rgba(0,0,0,0.01);
}

.action-buttons {
  display: flex;
  gap: 0.65rem;
}

.footer-btn {
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  cursor: pointer;
  transition: all var(--transition-bounce);
  border: 1.5px solid var(--border-color);
  background: var(--bg-surface-elevated);
  color: var(--text-secondary);
}

.footer-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  border-color: var(--accent-color);
  color: var(--accent-color);
  box-shadow: 0 8px 15px rgba(0,0,0,0.08);
}

.footer-btn:active:not(:disabled) {
  transform: translateY(-1px) scale(0.95);
}

.add-btn {
  background: var(--accent-gradient);
  color: white;
  border: none;
  box-shadow: 0 6px 15px rgba(99, 102, 241, 0.25);
}

.add-btn:hover:not(:disabled) {
  background: var(--accent-gradient-hover);
  color: white;
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
}

.add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none;
}

.tag-toggle-btn.active {
  background: var(--accent-color);
  color: white;
  border-color: transparent;
  box-shadow: 0 8px 15px rgba(99, 102, 241, 0.3);
}

.tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.85rem;
  background: var(--accent-gradient);
  color: white;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
  transition: all var(--transition-fast);
  letter-spacing: 0.02em;
}

.tag-badge:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 14px rgba(99, 102, 241, 0.3);
}

.tag-badge.removable {
  cursor: pointer;
}

.tag-inline-input {
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.5rem;
  outline: none;
  min-width: 140px;
}

.tag-inline-input::placeholder {
  color: var(--text-muted);
  opacity: 0.7;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Transitions */
.slide-enter-active, .slide-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
