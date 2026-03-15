<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import EmojiPicker from 'vue3-emoji-picker';
import 'vue3-emoji-picker/css';
import { Smile as LucideSmile, Plus as LucidePlus } from 'lucide-vue-next';
import { useTheme } from '~/composables/useTheme';

const STANDARD_REACTIONS = ['👍', '👎', '❤️', '😂', '😮', '😢'] as const;
const VIEWPORT_PADDING = 8;
const POPUP_GAP = 6;

const props = withDefaults(
  defineProps<{
    entityType: 'comment' | 'item';
    entityId: string;
    itemId?: string;
    reactions?: { emoji: string; count: number; userReacted: boolean }[];
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
  const popup = reactionPopupRef.value.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const centerX = anchor.left + anchor.width / 2;
  let left = centerX - popup.width / 2;
  left = Math.max(VIEWPORT_PADDING, Math.min(vw - popup.width - VIEWPORT_PADDING, left));

  const spaceAbove = anchor.top;
  const spaceBelow = vh - anchor.bottom;
  const goAbove = spaceAbove >= popup.height + POPUP_GAP || spaceAbove >= spaceBelow;

  let top: number;
  if (goAbove) {
    top = anchor.top - popup.height - POPUP_GAP;
  } else {
    top = anchor.bottom + POPUP_GAP;
  }
  top = Math.max(VIEWPORT_PADDING, Math.min(vh - popup.height - VIEWPORT_PADDING, top));

  reactionPopupStyle.value = { top: `${top}px`, left: `${left}px` };
  reactionPopupPositioned.value = true;
}

watch(reactionMenuOpen, (open) => {
  reactionPopupPositioned.value = false;
  if (open) {
    nextTick(() => {
      updatePosition();
      requestAnimationFrame(updatePosition);
    });
  }
});

function onDocumentClick(e: MouseEvent) {
  if (!reactionMenuOpen.value) return;
  const target = e.target as Node;
  if (reactionMenuRef.value?.contains(target) || reactionPopupRef.value?.contains(target)) return;
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
    <button
      type="button"
      class="reaction-trigger-btn"
      :class="{ active: reactionMenuOpen }"
      :title="$t('comments.addReaction')"
      @click="reactionMenuOpen = !reactionMenuOpen"
    >
      <LucideSmile :size="16" />
    </button>

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
          <button
            type="button"
            class="reaction-more-btn"
            :class="{ active: emojiPickerTarget }"
            :title="$t('comments.reactWithEmoji')"
            @click="emojiPickerTarget = !emojiPickerTarget"
          >
            <LucidePlus :size="14" />
          </button>
          <Transition name="picker">
            <div v-if="emojiPickerTarget" class="reaction-picker-dropdown">
              <ClientOnly>
                <EmojiPicker
                  :native="true"
                  :theme="emojiPickerTheme"
                  :hide-search="false"
                  :static-texts="{ placeholder: $t('comments.emojiSearch') }"
                  @select="onSelectReactionEmoji"
                />
                <template #fallback><div class="emoji-picker-placeholder" /></template>
              </ClientOnly>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <div v-if="(reactions?.length ?? 0) > 0" class="reaction-pills-inline">
      <button
        v-for="r of reactions"
        :key="r.emoji"
        type="button"
        class="reaction-pill-inline"
        :class="{ 'user-reacted': r.userReacted }"
        @click="toggleReaction(r.emoji)"
      >
        <span class="reaction-emoji">{{ r.emoji }}</span>
        <span v-if="r.count > 1" class="reaction-count">{{ r.count }}</span>
      </button>
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

.reaction-picker-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 0.35rem;
  z-index: 100;
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
  transform: scale(0.9);
}
</style>
