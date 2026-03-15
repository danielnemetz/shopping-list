<script setup lang="ts">
import { ref, watch } from "vue";
import {
  GripVertical as LucideGripVertical,
  Check as LucideCheck,
  Trash2 as LucideTrash2,
  Tag as LucideTag,
  X as LucideX,
  CloudUpload as LucideCloudUpload,
  MessageCircle as LucideMessageCircle,
  Edit as LucideEdit,
} from "lucide-vue-next";

const props = defineProps<{
  item: any;
  isPending: boolean;
  isOnline: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle", item: any): void;
  (e: "delete", item: any): void;
  (e: "save-edit", item: any, newText: string): void;
  (e: "save-tags", item: any, tags: string[]): void;
  (e: "open-tag-popover", item: any): void;
  (e: "click-comments", itemId: string): void;
  (e: "reaction"): void;
}>();

// Edit State
const isEditing = ref(false);
const editText = ref(props.item.text);
const editingTags = ref(false);
const editTagInput = ref("");

const startEditing = () => {
  isEditing.value = true;
  editText.value = props.item.text;
};

const saveEdit = () => {
  if (editText.value.trim() && editText.value !== props.item.text) {
    emit("save-edit", props.item, editText.value.trim());
  }
  isEditing.value = false;
};

const handleEditKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter") saveEdit();
  else if (e.key === "Escape") isEditing.value = false;
};

// Tag Editing
const startEditingTags = () => {
  editingTags.value = true;
  editTagInput.value = "";
};

const addTag = () => {
  const trimmed = editTagInput.value.trim();
  if (trimmed) {
    const currentTags = props.item.tags?.map((t: any) => t.name) || [];
    if (!currentTags.includes(trimmed)) {
      emit("save-tags", props.item, [...currentTags, trimmed]);
    }
  }
  editTagInput.value = "";
};

const removeTag = (tagName: string) => {
  const currentTags = props.item.tags?.map((t: any) => t.name) || [];
  emit("save-tags", props.item, currentTags.filter((t: string) => t !== tagName));
};

const handleTagKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    addTag();
  } else if (e.key === "Escape") {
    editingTags.value = false;
  }
};

const tagEditContainer = ref<HTMLElement | null>(null);

const onOutsideClick = (e: MouseEvent) => {
  if (editingTags.value && tagEditContainer.value && !tagEditContainer.value.contains(e.target as Node)) {
    if (editTagInput.value.trim()) {
      addTag();
    } else {
      editingTags.value = false;
    }
  }
};

watch(editingTags, (newVal) => {
  if (import.meta.client) {
    if (newVal) {
      // Small delay to prevent immediate trigger from the click that opened the edit mode
      setTimeout(() => {
        window.addEventListener('click', onOutsideClick);
      }, 0);
    } else {
      window.removeEventListener('click', onOutsideClick);
    }
  }
});

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('click', onOutsideClick);
  }
});

// Swipe Logic
const touchStartX = ref(0);
const swipeOffset = ref(0);
const isSwiping = ref(false);
const swipeThreshold = 100;

const onSwipeStart = (clientX: number, event: UIEvent) => {
  if (isEditing.value || editingTags.value) return;
  const target = event.target as HTMLElement;
  if (target.closest('button') || target.closest('.drag-handle') || target.closest('input')) return;

  touchStartX.value = clientX;
  isSwiping.value = true;
  swipeOffset.value = 0;

  if (event instanceof MouseEvent) {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
};

const onSwipeMove = (clientX: number, event?: UIEvent) => {
  if (!isSwiping.value) return;
  const diff = clientX - touchStartX.value;
  swipeOffset.value = diff;
  
  if (event && event instanceof TouchEvent && Math.abs(diff) > 10 && event.cancelable) {
    event.preventDefault();
  }
};

const onSwipeEnd = () => {
  if (!isSwiping.value) return;

  if (swipeOffset.value > swipeThreshold) {
    emit("toggle", props.item);
  } else if (swipeOffset.value < -swipeThreshold) {
    emit("open-tag-popover", props.item);
  }

  swipeOffset.value = 0;
  isSwiping.value = false;
  
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
};

const onTouchStart = (e: TouchEvent) => {
  if (e.touches && e.touches[0]) {
    onSwipeStart(e.touches[0].clientX, e);
  }
};
const onTouchMove = (e: TouchEvent) => {
  if (e.touches && e.touches[0]) {
    onSwipeMove(e.touches[0].clientX, e);
  }
};
const onTouchEnd = () => onSwipeEnd();
const onMouseDown = (e: MouseEvent) => onSwipeStart(e.clientX, e);
const onMouseMove = (e: MouseEvent) => onSwipeMove(e.clientX);
const onMouseUp = () => onSwipeEnd();

</script>

<template>
  <div 
    class="list-item glass-panel"
    :class="{ 'completed-item': item.isCompleted, 'open-item': !item.isCompleted }"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @mousedown="onMouseDown"
  >
    <!-- Swipe Background -->
    <div 
      class="swipe-background"
      :class="{ 
        tagging: swipeOffset < 0, 
        reverse: item.isCompleted && swipeOffset > 0 
      }"
      v-show="isSwiping"
    >
      <div class="swipe-bg-content" v-if="swipeOffset > 0">
        <template v-if="!item.isCompleted">
          <LucideCheck :size="24" />
          <span>{{ $t('items.complete') }}</span>
        </template>
        <template v-else>
          <LucideX :size="24" />
          <span>{{ $t('items.reopen') }}</span>
        </template>
      </div>
      <div class="swipe-bg-content tagging-content" v-else-if="swipeOffset < 0">
        <span>{{ $t('items.tag') }}</span>
        <LucideTag :size="24" />
      </div>
    </div>

    <!-- Main Content -->
    <div 
      class="item-content"
      :class="{ 'is-swiping': isSwiping }"
      :style="{ 
        transform: isSwiping ? `translateX(${swipeOffset}px)` : 'none',
        transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }"
    >
      <div class="item-row">
        <button v-if="!item.isCompleted" class="drag-handle" :title="$t('items.move')">
          <LucideGripVertical :size="20" />
        </button>

        <button class="checkbox-btn" :class="{ checked: item.isCompleted }" @click="emit('toggle', item)">
          <div class="checkbox">
            <LucideCheck v-if="item.isCompleted" :size="16" />
          </div>
        </button>

        <div class="item-text-wrapper" v-if="isEditing">
          <input
            v-model="editText"
            class="item-edit-input"
            @keydown="handleEditKeydown"
            @blur="saveEdit"
            autofocus
          />
        </div>
        <span 
          v-else
          class="item-text" 
          :class="{ 'is-pending': isPending }"
          @click="startEditing"
        >
          {{ item.text }}
        </span>

        <div class="action-btns" v-if="!isEditing">
          <button class="edit-btn" @click.stop="startEditing" :title="$t('items.edit')">
            <LucideEdit :size="16" />
          </button>
          <button class="delete-btn" @click.stop="emit('delete', item)">
            <LucideTrash2 :size="16" />
          </button>
          <UserBadge :name="item.creatorName" :online="isOnline" />
        </div>
      </div>

      <!-- Secondary Row: Meta & Tags -->
      <div class="item-details-row" v-if="!item.isCompleted">
        <div class="tag-list" v-if="!editingTags" @click.stop="startEditingTags">
          <LucideTag :size="14" class="tag-list-icon" />
          <div v-for="tag in item.tags" :key="tag.id" class="tag-badge">
            {{ tag.name }}
          </div>
          <div class="tag-add-hint" v-if="!item.tags || item.tags.length === 0">
            <!-- Icon only, no text needed as per user request -->
          </div>
        </div>

        <div class="tag-list editing" v-else ref="tagEditContainer" @click.stop>
          <LucideTag :size="14" class="tag-list-icon active" />
          <span
            class="tag-badge removable"
            v-for="tag in item.tags"
            :key="tag.id"
            @click="removeTag(tag.name)"
          >
            {{ tag.name }} <LucideX :size="10" />
          </span>
          <input
            v-model="editTagInput"
            class="tag-inline-input"
            :placeholder="$t('items.tagPlaceholder')"
            @keydown="handleTagKeydown"
            @blur="editTagInput.trim() ? addTag() : (editingTags = false)"
            autofocus
          />
        </div>

        <div class="item-meta-actions">
          <ReactionTrigger
            entity-type="item"
            :entity-id="item.id"
            :reactions="item.reactions ?? []"
            @reaction="emit('reaction')"
          />
          <button
            class="meta-comment-btn"
            @click.stop="emit('click-comments', item.id)"
            :class="{ 'has-comments': item.commentCount > 0, 'empty-comments': !item.commentCount }"
            :title="item.commentCount > 0 ? $t('items.commentsCount', { count: item.commentCount }) : $t('items.startChat')"
          >
            <LucideMessageCircle :size="14" />
            <span v-if="item.commentCount > 0">{{ item.commentCount }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-item {
  position: relative;
  overflow: hidden;
  user-select: none;
  touch-action: pan-y;
  display: flex;
  align-items: flex-start;
  padding: 0;
  transition: all var(--transition-normal);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-sm);
}

.list-item:hover {
  border-color: var(--accent-color);
  box-shadow: var(--shadow-md), var(--shadow-glow);
  transform: translateY(-2px);
}

.swipe-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--success-color);
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  z-index: 0;
  color: white;
  border-radius: var(--border-radius);
  pointer-events: none;
}

.swipe-background.tagging {
  background: var(--accent-gradient);
  justify-content: flex-end;
}

.swipe-background.reverse {
  background: var(--bg-surface-elevated);
  color: var(--text-main);
}

.tagging-content {
  flex-direction: row;
}

.swipe-bg-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.item-content {
  position: relative;
  width: 100%;
  z-index: 1;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
  border-radius: var(--border-radius);
  padding: 1rem 1.25rem;
}

.open-item .item-content {
  background: var(--glass-bg);
}

.completed-item .item-content {
  background: rgba(var(--primary-h), var(--primary-s), 10%, 0.05);
  opacity: var(--opacity-completed);
}

.item-content.is-swiping {
  opacity: var(--opacity-swipe);
  background: var(--bg-surface); /* More solid background during swipe */
  box-shadow: var(--shadow-md), 0 0 20px rgba(0,0,0,0.1);
}

.item-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.item-tags-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-left: 2.75rem;
  margin-top: 0.25rem;
  cursor: pointer;
  min-height: 1.5rem;
}

.drag-handle {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: grab;
  padding: 0;
  opacity: 0.3;
  transition: opacity var(--transition-fast);
}

.list-item:hover .drag-handle {
  opacity: 0.8;
}

.checkbox-btn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  transition: all var(--transition-bounce);
  position: relative;
  overflow: hidden;
}

.checkbox-btn:hover .checkbox {
  border-color: var(--accent-color);
  transform: scale(1.1);
  box-shadow: var(--shadow-glow);
}

.checkbox-btn.checked .checkbox {
  background: var(--accent-gradient);
  border-color: transparent;
  color: white;
  transform: scale(1);
}

.checkbox-btn.checked .checkbox::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(rgba(255,255,255,0.2), transparent);
  pointer-events: none;
}

.item-text {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 500;
  word-break: break-word;
  color: var(--text-main);
  transition: color var(--transition-fast);
}

.completed-item .item-text {
  text-decoration: line-through;
  color: var(--text-muted);
}

.action-btns {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-details-row {
  display: flex;
  align-items: center;
  justify-content: space-between; /* Push comment badge to the right */
  gap: 0.8rem;
  padding-left: 0.35rem; /* Optical alignment with drag handle */
  margin-top: 0.4rem;
}

.tag-list {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  cursor: pointer;
  min-height: 1.5rem;
}

.item-meta-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.meta-comment-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
  transition: all var(--transition-fast);
}

.meta-comment-btn.has-comments {
  color: var(--accent-color);
  background: rgba(99, 102, 241, 0.1);
}

.meta-comment-btn.empty-comments {
  opacity: 0.5;
}

.meta-comment-btn.empty-comments:hover,
.list-item:hover .meta-comment-btn.empty-comments {
  opacity: 1;
  color: var(--text-main);
  background: var(--bg-surface-elevated);
}

.delete-btn, .edit-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 10px;
  opacity: 0.4; /* Mobile-First: Muted but visible */
  transform: scale(0.9);
  transition: all var(--transition-fast);
}

.list-item:hover .delete-btn, .list-item:hover .edit-btn,
.list-item:hover :deep(.reaction-trigger-btn) {
  opacity: 1;
  transform: scale(1);
}

.delete-btn:hover, .edit-btn:hover {
  opacity: 1 !important;
  background: var(--bg-surface-elevated);
  border-color: var(--border-color);
}

.edit-btn:hover {
  color: var(--accent-color);
}

.delete-btn:hover {
  color: var(--danger-color);
}

.item-edit-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--bg-surface-elevated);
  border: 2px solid var(--accent-color);
  border-radius: 12px;
  color: var(--text-main);
  font-size: 1.1rem;
  outline: none;
  box-shadow: var(--shadow-glow);
}

.tag-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.75rem;
  background: var(--accent-gradient);
  color: white;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 800;
  transition: all var(--transition-bounce);
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
  letter-spacing: 0.02em;
}

.tag-badge:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(99, 102, 241, 0.3);
}

.tag-badge.removable {
  cursor: pointer;
  gap: 0.3rem;
}

.tag-badge.removable:hover {
  background: var(--danger-color);
  color: white;
}

.tag-inline-input {
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--accent-color);
  color: var(--text-main);
  font-size: 0.8rem;
  padding: 2px 0;
  width: 120px;
  outline: none;
}

.tag-save-btn {
  background: var(--accent-gradient);
  color: white;
  border: none;
  border-radius: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tag-list-icon {
  color: var(--text-muted);
  opacity: 0.5;
  transition: all var(--transition-fast);
}

.tag-list:hover .tag-list-icon,
.tag-list-icon.active {
  color: var(--accent-color);
  opacity: 1;
}

.tag-add-hint {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  opacity: 0.4;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.list-item:hover .tag-add-hint {
  opacity: 0.8;
  color: var(--accent-color);
}

.pending-badge {
  color: var(--accent-color);
}

.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

@media (hover: none) {
  .delete-btn, .edit-btn, .drag-handle,
  :deep(.reaction-trigger-btn) {
    opacity: 0.8 !important;
  }
}
</style>
