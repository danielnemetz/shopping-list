<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import EmojiPicker from "vue3-emoji-picker";
import "vue3-emoji-picker/css";
import {
  MessageCircle as LucideMessageCircle,
  ChevronLeft as LucideChevronLeft,
  Send as LucideSend,
  Loader as LucideLoader,
  CloudUpload as LucideCloudUpload,
  Smile as LucideSmile,
  Plus as LucidePlus,
} from "lucide-vue-next";

const STANDARD_REACTIONS = ['👍', '👎', '❤️', '😂', '😮', '😢'] as const;
import { useClickOutside } from "~/composables/useClickOutside";
import { useTheme } from "~/composables/useTheme";

definePageMeta({
  middleware: "auth",
  // Avoid SSR for this page to prevent Vite worker crash (IPC connection closed)
  ssr: false,
});

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();
const { connect, on, isOnline, setTyping, queueAction, state: syncState } = useSync();
const itemId = route.params.id as string;

const item = ref<any>(null);
const comments = ref<any[]>([]);
const newComment = ref("");
const isLoading = ref(true);
const isSending = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);
const commentInput = ref<HTMLInputElement | null>(null);
const typingUsers = ref<{ id: string, name: string }[]>([]);
const currentUser = ref<any>(null);
const showEmojiPicker = ref(false);
const emojiPickerWrapRef = ref<HTMLElement | null>(null);
const emojiPickerTarget = ref<number | null>(null);
const reactionPickerWrapRef = ref<HTMLElement | null>(null);
const reactionMenuOpen = ref<number | null>(null);
const reactionMenuRef = ref<HTMLElement | null>(null);
const reactionPopupRef = ref<HTMLElement | null>(null);
const reactionPopupStyle = ref<Record<string, string>>({});
const reactionPopupPositioned = ref(false);
const VIEWPORT_PADDING = 8;
const POPUP_GAP = 6;

const { themeMode } = useTheme();
const emojiPickerTheme = computed(() =>
  themeMode.value === "dark" ? "dark" : themeMode.value === "light" ? "light" : "auto"
);

useClickOutside(emojiPickerWrapRef, () => {
  showEmojiPicker.value = false;
});
useClickOutside(reactionPickerWrapRef, () => {
  emojiPickerTarget.value = null;
});
function updateReactionPopupPosition() {
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

  reactionPopupStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  };
  reactionPopupPositioned.value = true;
}

watch(reactionMenuOpen, (id) => {
  reactionPopupPositioned.value = false;
  if (id != null) {
    nextTick(() => {
      updateReactionPopupPosition();
      requestAnimationFrame(updateReactionPopupPosition);
    });
  }
});

function onReactionDocumentClick(e: MouseEvent) {
  if (reactionMenuOpen.value == null) return;
  const target = e.target as Node;
  if (reactionMenuRef.value?.contains(target) || reactionPopupRef.value?.contains(target)) return;
  reactionMenuOpen.value = null;
  emojiPickerTarget.value = null;
}

if (import.meta.client) {
  onMounted(() => document.addEventListener("click", onReactionDocumentClick, true));
  onUnmounted(() => document.removeEventListener("click", onReactionDocumentClick, true));
}

const onSelectEmoji = (emoji: { i: string }) => {
  newComment.value += emoji.i;
  showEmojiPicker.value = false;
};

const isPending = (commentId: number | string) => {
  return syncState.pendingActions.some(a => 
    a.url.includes(`/api/items/${itemId}/comments`) && 
    a.method === 'POST' && 
    a.body.tempId === commentId
  );
};

let lastTypingReport = 0;

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const fetchItem = async () => {
  try {
    item.value = await $fetch<any>(`/api/items/${itemId}`);
  } catch (e) {
    console.error("Failed to fetch item", e);
    item.value = null;
  }
};

const fetchComments = async () => {
  try {
    const data = await $fetch<{ comments: any[] }>(`/api/items/${itemId}/comments`);
    comments.value = data.comments;
    await scrollToBottom();
  } catch (e) {
    console.error("Failed to fetch comments", e);
  }
};

const sendComment = async () => {
  if (!newComment.value.trim() || isSending.value) return;

  const text = newComment.value.trim();
  const tempId = 'c_temp_' + Date.now();
  
  const optimisticComment = {
    id: tempId,
    text,
    createdAt: new Date().toISOString(),
    user: {
      id: currentUser.value?.id,
      name: currentUser.value?.name || t('comments.me')
    },
    reactions: [],
  };

  comments.value.push(optimisticComment);
  newComment.value = "";
  await scrollToBottom();

  nextTick(() => {
    commentInput.value?.focus();
  });

  try {
    queueAction(`/api/items/${itemId}/comments`, "POST", { text, tempId });
  } catch (e) {
    console.error("Failed to send comment", e);
  }
};

watch(newComment, (val) => {
  if (val.length > 0) {
    const now = Date.now();
    if (now - lastTypingReport > 3000) {
      lastTypingReport = now;
      setTyping(itemId);
    }
  }
});

const localeTag = computed(() => {
  if (locale.value === 'de') return 'de-DE';
  if (locale.value === 'pl') return 'pl-PL';
  return 'en-US';
});
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('comments.justNow');
  if (minutes < 60) return t('comments.minutesAgo', { minutes });
  if (hours < 24) return t('comments.hoursAgo', { hours });
  if (days < 7) return t('comments.daysAgo', { days });
  return date.toLocaleDateString(localeTag.value, { day: "2-digit", month: "2-digit" });
};

const typingText = computed(() => {
  if (typingUsers.value.length === 0) return '';
  const names = typingUsers.value.map(u => u.name).join(', ');
  return typingUsers.value.length === 1
    ? t('comments.typing_one', { name: names })
    : t('comments.typing_other', { names });
});

const isOwnMessage = (comment: any) => comment.user?.id === currentUser.value?.id;

const canReact = (comment: any) => typeof comment.id === 'number';

const toggleReaction = async (commentId: number, emoji: string) => {
  try {
    await $fetch(`/api/items/${itemId}/comments/${commentId}/reactions`, {
      method: 'POST',
      body: { emoji },
    });
    await fetchComments();
  } catch (e) {
    console.error('Failed to toggle reaction', e);
  }
};

const onSelectReactionEmoji = (emoji: { i: string }) => {
  const cid = emojiPickerTarget.value;
  if (cid != null) {
    toggleReaction(cid, emoji.i);
    emojiPickerTarget.value = null;
    reactionMenuOpen.value = null;
  }
};

const pickReactionAndClose = (emoji: string) => {
  const cid = reactionMenuOpen.value;
  if (cid != null) {
    toggleReaction(cid, emoji);
    reactionMenuOpen.value = null;
  }
};

const showAvatar = (index: number) => {
  if (index === comments.value.length - 1) return true;
  return comments.value[index].user?.id !== comments.value[index + 1]?.user?.id;
};

onMounted(async () => {
  connect();
  on("comments:updated", (data: any) => {
    if (data.itemId === itemId) {
      fetchComments();
    }
  });

  on("typing:updated", (data: any) => {
    if (data.itemId === itemId) {
      typingUsers.value = data.users.filter((u: any) => u.id !== currentUser.value?.id && u.id !== 'admin');
    }
  });
  on("items:updated", fetchItem);

  try {
    const me = await $fetch<any>("/api/auth/me");
    currentUser.value = me.user;
  } catch (e) {}

  await Promise.all([fetchItem(), fetchComments()]);
  isLoading.value = false;
});
</script>

<template>
  <div class="comments-wrapper animate-fade-in">
    <!-- Header (same style as Activity & Tags) -->
    <header class="list-header glass-panel">
      <div class="container-centered header-content">
        <div class="header-left">
          <NuxtLink to="/" class="btn-icon" :title="$t('comments.back')">
            <LucideChevronLeft :size="24" />
          </NuxtLink>
          <h2>
            <LucideMessageCircle :size="20" class="mr-2 inline" />
            <span class="header-title">{{ item ? item.text : $t('comments.title') }}</span>
          </h2>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">
      <LucideLoader :size="24" class="spin" />
    </div>

    <!-- Messages -->
    <div v-else class="messages-area" ref="messagesContainer">
      <div class="messages-spacer" />

      <div v-if="comments.length === 0" class="empty-state">
        <LucideMessageCircle :size="48" />
        <p>{{ $t('comments.noComments') }}</p>
        <p class="text-muted">{{ $t('comments.startConversation') }}</p>
      </div>

      <div 
        v-for="(comment, index) in comments" 
        :key="comment.id" 
        class="message-row"
        :class="{ 'own': isOwnMessage(comment) }"
      >
        <!-- Avatar for other users (left side) -->
        <div class="avatar-slot" v-if="!isOwnMessage(comment)">
          <UserBadge
            v-if="showAvatar(index)"
            :name="comment.user?.name"
            :online="isOnline(comment.user?.id)"
          />
        </div>

        <div class="message-content">
          <!-- Author name (only for others, only on first message in group) -->
          <div 
            class="message-author" 
            v-if="!isOwnMessage(comment) && (index === 0 || comments[index - 1]?.user?.id !== comment.user?.id)"
          >
            {{ comment.user?.name || $t('comments.unknown') }}
          </div>

          <div class="message-bubble-row">
            <div class="message-bubble" :class="{ 'is-pending': isPending(comment.id) }">
              {{ comment.text }}
            </div>
            <div v-if="isPending(comment.id)" class="pending-icon" :title="$t('comments.syncing')">
              <LucideCloudUpload :size="12" />
            </div>
            <!-- Reaction trigger (popup is teleported to body) -->
            <div
              v-if="canReact(comment)"
              class="reaction-anchor"
              :ref="el => { if (reactionMenuOpen === comment.id) reactionMenuRef = el as HTMLElement }"
            >
              <button
                type="button"
                class="reaction-trigger"
                :class="{ active: reactionMenuOpen === comment.id }"
                :title="$t('comments.addReaction')"
                @click="reactionMenuOpen = reactionMenuOpen === comment.id ? null : comment.id"
              >
                <LucideSmile :size="16" />
              </button>
            </div>
          </div>

          <!-- Reaction pills (existing reactions) -->
          <div v-if="canReact(comment) && (comment.reactions?.length ?? 0) > 0" class="reaction-pills">
            <TheTooltip
              v-for="r of comment.reactions"
              :key="r.emoji"
              :content="r.userNames?.length ? r.userNames.join(', ') : (r.count > 1 ? `${r.emoji} ${r.count}` : r.emoji)"
              :long-press-ms="500"
              @long-press="toggleReaction(comment.id, r.emoji)"
            >
              <button
                type="button"
                class="reaction-pill"
                :class="{ 'user-reacted': r.userReacted }"
                @click="toggleReaction(comment.id, r.emoji)"
              >
                <span class="reaction-emoji">{{ r.emoji }}</span>
                <span v-if="r.count > 1" class="reaction-count">{{ r.count }}</span>
              </button>
            </TheTooltip>
          </div>

          <div class="message-time">{{ formatTime(comment.createdAt) }}</div>
        </div>
      </div>

      <!-- Typing Indicator (inside message area, at the bottom) -->
      <div class="typing-row" v-if="typingUsers.length > 0">
        <div class="typing-bubble">
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
          <span class="typing-text">{{ typingText }}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="chat-footer glass-panel">
      <div class="emoji-picker-anchor" ref="emojiPickerWrapRef">
        <Transition name="picker">
          <div v-if="showEmojiPicker" class="emoji-picker-dropdown">
            <ClientOnly>
              <EmojiPicker
                :native="true"
                :theme="emojiPickerTheme"
                :hide-search="false"
                :static-texts="{ placeholder: $t('comments.emojiSearch') }"
                @select="onSelectEmoji"
              />
              <template #fallback><div class="emoji-picker-placeholder" /></template>
            </ClientOnly>
          </div>
        </Transition>
        <form @submit.prevent="sendComment" class="add-form">
          <div class="input-wrapper">
            <input
              ref="commentInput"
              v-model="newComment"
              type="text"
              class="input-base"
              :placeholder="$t('comments.messagePlaceholder')"
              :disabled="isSending"
              enterkeyhint="send"
              autocomplete="off"
            />
          </div>
          <div class="action-buttons">
            <button
              type="button"
              class="footer-btn emoji-btn"
              :class="{ active: showEmojiPicker }"
              @click="showEmojiPicker = !showEmojiPicker"
              :title="$t('comments.emojiInsert')"
            >
              <LucideSmile :size="20" />
            </button>
            <button
              type="submit"
              class="footer-btn send-btn"
              :disabled="!newComment.trim() || isSending"
            >
              <LucideSend :size="20" v-if="!isSending" />
              <LucideLoader :size="20" class="spin" v-else />
            </button>
          </div>
        </form>
      </div>
    </footer>

    <!-- Reaction popup (teleported so it is not clipped by overflow) -->
    <Teleport to="body">
      <Transition name="reaction-popup">
        <div
          v-if="reactionMenuOpen != null"
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
            @click="pickReactionAndClose(emoji)"
          >
            {{ emoji }}
          </button>
          <button
            type="button"
            class="reaction-more-btn"
            :class="{ active: emojiPickerTarget === reactionMenuOpen }"
            :title="$t('comments.reactWithEmoji')"
            @click="emojiPickerTarget = emojiPickerTarget === reactionMenuOpen ? null : reactionMenuOpen"
          >
            <LucidePlus :size="14" />
          </button>
          <Transition name="picker">
            <div v-if="emojiPickerTarget === reactionMenuOpen" class="reaction-picker-dropdown">
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
  </div>
</template>

<style scoped>
.comments-wrapper {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  max-width: 600px;
  margin: 0 auto;
  background: var(--bg-color);
  overflow: hidden;
}

/* ── Header (same as Activity & Tags) ── */
.list-header {
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 10;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
  flex-shrink: 0;
}

.container-centered {
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
  padding: 0 1.5rem;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.header-left h2 {
  margin: 0;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  min-width: 0;
}

.header-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mr-2 {
  margin-right: 0.5rem;
}

.inline {
  display: inline;
}

/* ── Messages Area ── */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.messages-spacer {
  flex: 1;
}

.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--text-muted);
  padding: 2rem;
}

.empty-state .text-muted {
  font-size: 0.85rem;
  opacity: 0.6;
}

/* ── Message Row ── */
.message-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  max-width: 85%;
  align-self: flex-start;
  animation: msg-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.message-row.own {
  align-self: flex-end;
  flex-direction: row-reverse;
}

/* Reserve space for the avatar so messages stay aligned even without one */
.avatar-slot {
  width: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.message-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.own .message-content {
  align-items: flex-end;
}

/* ── Author Name ── */
.message-author {
  font-weight: 600;
  font-size: 0.7rem;
  color: var(--text-muted);
  padding: 0 0.25rem;
  margin-bottom: 0.15rem;
  margin-top: 0.5rem;
}

/* ── Bubble ── */
.message-bubble-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.own .message-bubble-row {
  flex-direction: row-reverse;
}

.message-bubble {
  background: var(--glass-bg);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  padding: 0.6rem 1rem;
  font-size: 0.95rem;
  color: var(--text-main);
  line-height: 1.45;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  word-break: break-word;
}

.own .message-bubble {
  background: var(--accent-gradient);
  color: white;
  border: none;
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 4px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.message-bubble.is-pending {
  opacity: 0.6;
}

.pending-icon {
  color: var(--accent-color);
  display: flex;
  align-items: center;
  opacity: 0.8;
  animation: pulse 2s infinite;
}

/* ── Timestamp ── */
.message-time {
  font-size: 0.65rem;
  color: var(--text-muted);
  padding: 0.1rem 0.25rem 0;
  opacity: 0.7;
}

/* ── Reaction anchor (wraps trigger + popup) ── */
.reaction-anchor {
  position: relative;
  flex-shrink: 0;
}

/* ── Reaction trigger (smiley next to bubble) ── */
.reaction-trigger {
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
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}

.message-row:hover .reaction-trigger,
.reaction-trigger.active {
  opacity: 1;
}

/* On touch devices, always show the trigger */
@media (hover: none) {
  .reaction-trigger {
    opacity: 0.5;
  }
}

.reaction-trigger:hover,
.reaction-trigger.active {
  background: var(--glass-bg);
  color: var(--accent-color);
}

/* ── Reaction popup (quick-pick bar) ── */
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

.reaction-quick-btn:active {
  transform: scale(0.95);
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

.reaction-popup-enter-active,
.reaction-popup-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.reaction-popup-enter-from,
.reaction-popup-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ── Reaction pills (existing reactions below bubble) ── */
.reaction-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.2rem;
  padding: 0 0.15rem;
}

.reaction-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.5rem;
  font-size: 0.8rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--glass-bg);
  color: var(--text-main);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.reaction-pill:hover {
  background: var(--bg-surface-elevated);
  border-color: var(--accent-color);
}

.reaction-pill.user-reacted {
  border-color: var(--accent-color);
  background: rgba(99, 102, 241, 0.12);
}

.reaction-emoji {
  line-height: 1;
}

.reaction-count {
  font-size: 0.7rem;
  opacity: 0.9;
}

/* ── Reaction picker dropdown (from popup) ── */
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

/* ── Typing Indicator ── */
.typing-row {
  padding-left: 36px;
  animation: msg-in 0.3s ease;
}

.typing-bubble {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  background: var(--glass-bg);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.typing-dots {
  display: flex;
  gap: 3px;
}

.typing-dots span {
  width: 5px;
  height: 5px;
  background: var(--accent-color);
  border-radius: 50%;
  opacity: 0.4;
  animation: typing-dots 1.4s infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

.typing-text {
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Footer (matches AddItemFooter) ── */
.chat-footer {
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
  flex-shrink: 0;
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

.input-base::placeholder {
  color: var(--text-muted);
}

.emoji-picker-anchor {
  position: relative;
}

.emoji-picker-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 0.5rem;
  z-index: 100;
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.emoji-picker-placeholder {
  min-height: 280px;
  background: var(--bg-surface-elevated);
}

.picker-enter-active,
.picker-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.picker-enter-from,
.picker-leave-to {
  opacity: 0;
  transform: translateY(8px);
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
  border: none;
}

.send-btn {
  background: var(--accent-gradient);
  color: white;
  box-shadow: 0 6px 15px rgba(99, 102, 241, 0.25);
}

.send-btn:hover:not(:disabled) {
  background: var(--accent-gradient-hover);
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
}

.send-btn:active:not(:disabled) {
  transform: translateY(-1px) scale(0.95);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none;
}

.emoji-btn {
  background: var(--bg-surface-elevated);
  color: var(--text-secondary);
  border: 1.5px solid var(--border-color);
}

.emoji-btn:hover:not(:disabled) {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.emoji-btn.active {
  background: var(--accent-color);
  color: white;
  border-color: transparent;
}

/* ── Animations ── */
@keyframes msg-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}

@keyframes typing-dots {
  0%, 100% { transform: translateY(0); opacity: 0.4; }
  50% { transform: translateY(-3px); opacity: 1; }
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
