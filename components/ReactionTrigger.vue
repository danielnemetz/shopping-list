<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import EmojiPicker from 'vue3-emoji-picker';
import 'vue3-emoji-picker/css';
import { Smile as LucideSmile, Plus as LucidePlus } from 'lucide-vue-next';
import { useTheme } from '~/composables/useTheme';
import { useFloatingPosition } from '~/composables/useFloatingPosition';

const STANDARD_REACTIONS = ['👍', '👎', '❤️', '😂', '😮', '😢'] as const;

const { position: positionFloating } = useFloatingPosition({ padding: 8, gap: 6 });

const props = withDefaults(
  defineProps<{
    entityType: 'comment' | 'item';
    entityId: string;
    itemId?: string;
    reactions?: { emoji: string; count: number; userReacted: boolean; userNames?: string[] }[];
  }>(),
  { reactions: () => [] },
);

const emit = defineEmits<{ (e: 'reaction'): void }>();

const reactionMenuOpen = ref(false);
const reactionMenuRef = ref<HTMLElement | null>(null);
const reactionPopupRef = ref<HTMLElement | null>(null);
const reactionPopupStyle = ref<Record<string, string>>({});
const reactionPopupPositioned = ref(false);
const emojiPickerTarget = ref(false);
const pickerDropdownRef = ref<HTMLElement | null>(null);
const pickerDropdownStyle = ref<Record<string, string>>({});

const { themeMode } = useTheme();
const emojiPickerTheme = computed(() =>
  themeMode.value === 'dark' ? 'dark' : themeMode.value === 'light' ? 'light' : 'auto',
);

function reactionUrl() {
  if (props.entityType === 'item') {
    return `/api/items/${props.entityId}/reactions`;
  }
  if (props.entityType === 'comment' && props.itemId != null) {
    return `/api/items/${props.itemId}/comments/${props.entityId}/reactions`;
  }
  return '';
}

async function toggleReaction(emoji: string) {
  const url = reactionUrl();
  if (!url) return;
  try {
    await $fetch(url, { method: 'POST', body: { emoji } });
    reactionMenuOpen.value = false;
    emojiPickerTarget.value = false;
    emit('reaction');
  } catch (e) {
    console.error('Failed to toggle reaction', e);
  }
}

function onSelectReactionEmoji(emoji: { i: string }) {
  toggleReaction(emoji.i);
}

function updatePosition() {
  if (!reactionMenuRef.value || !reactionPopupRef.value || !import.meta.client) return;
  const anchor = reactionMenuRef.value.getBoundingClientRect();
  const popupEl = reactionPopupRef.value;
  const popup = new DOMRect(0, 0, popupEl.offsetWidth, popupEl.offsetHeight);
  const { top, left } = positionFloating(anchor, popup);
  reactionPopupStyle.value = { top: `${top}px`, left: `${left}px` };
  reactionPopupPositioned.value = true;
}

function updatePickerDropdownPosition() {
  if (!reactionPopupRef.value || !import.meta.client) return;
  const barRect = reactionPopupRef.value.getBoundingClientRect();
  const pickerWidth = 280;
  const pickerHeight = 320;
  const padding = 8;
  const gap = 6;

  const container = document.querySelector('.app-container');
  const cr = container?.getBoundingClientRect();
  const boundsLeft = cr ? cr.left : 0;
  const boundsRight = cr ? cr.right : window.innerWidth;
  const boundsTop = cr ? cr.top : 0;
  const boundsBottom = cr ? cr.bottom : window.innerHeight;

  let left = barRect.left;
  left = Math.max(boundsLeft + padding, Math.min(boundsRight - pickerWidth - padding, left));

  const spaceAbove = barRect.top - boundsTop;
  const spaceBelow = boundsBottom - barRect.bottom;
  let top: number;
  if (spaceAbove >= pickerHeight + gap) {
    top = barRect.top - pickerHeight - gap;
  } else if (spaceBelow >= pickerHeight + gap) {
    top = barRect.bottom + gap;
  } else {
    top = Math.max(boundsTop + padding, boundsBottom - pickerHeight - padding);
  }

  pickerDropdownStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: '10000',
  };
}

watch(reactionMenuOpen, (open) => {
  reactionPopupPositioned.value = false;
  if (open) {
    nextTick(() => {
      updatePosition();
      requestAnimationFrame(() => {
        updatePosition();
        // Focus first reaction button for keyboard users
        const firstBtn = reactionPopupRef.value?.querySelector<HTMLButtonElement>('.reaction-quick-btn');
        firstBtn?.focus();
      });
    });
  }
});

watch(emojiPickerTarget, (open) => {
  if (open) {
    nextTick(() => {
      updatePickerDropdownPosition();
      requestAnimationFrame(updatePickerDropdownPosition);
    });
  }
});

function onDocumentClick(e: MouseEvent) {
  if (!reactionMenuOpen.value) return;
  const target = e.target as Node;
  if (
    reactionMenuRef.value?.contains(target) ||
    reactionPopupRef.value?.contains(target) ||
    pickerDropdownRef.value?.contains(target)
  ) return;
  reactionMenuOpen.value = false;
  emojiPickerTarget.value = false;
}

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('click', onDocumentClick, true);
  }
});
onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('click', onDocumentClick, true);
  }
});
</script>

<template>
  <div class="reaction-trigger-wrap" ref="reactionMenuRef">
    <TheTooltip :content="$t('messages.addReaction')">
      <button
        type="button"
        class="reaction-trigger-btn"
        :class="{ active: reactionMenuOpen }"
        @click="reactionMenuOpen = !reactionMenuOpen"
      >
        <LucideSmile :size="16" />
      </button>
    </TheTooltip>

    <Teleport to="body">
      <Transition name="reaction-popup">
        <div
          v-if="reactionMenuOpen"
          ref="reactionPopupRef"
          class="reaction-popup reaction-popup-fixed"
          :class="{ positioned: reactionPopupPositioned }"
          :style="reactionPopupStyle"
        >
          <button
            v-for="emoji of STANDARD_REACTIONS"
            :key="emoji"
            type="button"
            class="reaction-quick-btn"
            @click="toggleReaction(emoji)"
          >
            {{ emoji }}
          </button>
          <TheTooltip :content="$t('messages.reactWithEmoji')">
            <button
              type="button"
              class="reaction-more-btn"
              :class="{ active: emojiPickerTarget }"
              @click="emojiPickerTarget = !emojiPickerTarget"
            >
              <LucidePlus :size="14" />
            </button>
          </TheTooltip>
        </div>
      </Transition>
      <Transition name="picker">
        <div v-if="emojiPickerTarget" ref="pickerDropdownRef" class="reaction-picker-dropdown" :style="pickerDropdownStyle">
          <ClientOnly>
            <EmojiPicker
              :native="true"
              :theme="emojiPickerTheme"
              :hide-search="false"
              :static-texts="{ placeholder: $t('messages.emojiSearch') }"
              @select="onSelectReactionEmoji"
            />
            <template #fallback><div class="emoji-picker-placeholder" /></template>
          </ClientOnly>
        </div>
      </Transition>
    </Teleport>

    <div v-if="(reactions?.length ?? 0) > 0" class="reaction-pills-inline">
      <TheTooltip
        v-for="r of reactions"
        :key="r.emoji"
        :content="r.userNames?.length ? r.userNames.join(', ') : null"
        :long-press-ms="500"
        @long-press="toggleReaction(r.emoji)"
      >
        <button
          type="button"
          class="reaction-pill-inline"
          :class="{ 'user-reacted': r.userReacted }"
          @click="toggleReaction(r.emoji)"
        >
          <span class="reaction-emoji">{{ r.emoji }}</span>
          <span v-if="r.count > 1" class="reaction-count">{{ r.count }}</span>
        </button>
      </TheTooltip>
    </div>
  </div>
</template>

<style scoped>
.reaction-trigger-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.reaction-trigger-btn {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0.4;
  transform: scale(0.9);
  transition: all var(--transition-fast);
}

.reaction-trigger-btn:hover,
.reaction-trigger-btn.active {
  opacity: 1;
  transform: scale(1);
  background: var(--bg-surface-elevated);
  color: var(--accent-color);
}

.reaction-trigger-btn:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.reaction-popup {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.35rem 0.5rem;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  box-shadow: var(--shadow-md);
  width: max-content;
}

.reaction-popup-fixed {
  position: fixed;
  z-index: 9999;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.reaction-popup-fixed.positioned {
  opacity: 1;
}

.reaction-quick-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  font-size: 1.15rem;
  transition: transform 0.15s ease, background 0.15s ease;
}

.reaction-quick-btn:hover {
  transform: scale(1.25);
  background: var(--bg-surface-elevated);
}

.reaction-quick-btn:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.reaction-more-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.reaction-more-btn:hover {
  background: var(--bg-surface-elevated);
  color: var(--text-main);
}

.reaction-more-btn.active {
  background: var(--accent-color);
  color: white;
}

.reaction-more-btn:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.reaction-picker-dropdown {
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.reaction-pills-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
}

.reaction-pill-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.1rem 0.4rem;
  font-size: 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--glass-bg);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
}

.reaction-pill-inline:hover {
  background: var(--bg-surface-elevated);
  border-color: var(--accent-color);
}

.reaction-pill-inline:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.reaction-pill-inline.user-reacted {
  border-color: var(--accent-color);
  background: rgba(99, 102, 241, 0.12);
}

.reaction-popup-enter-active,
.reaction-popup-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.reaction-popup-enter-from,
.reaction-popup-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
