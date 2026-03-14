<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  MessageCircle as LucideMessageCircle,
  ChevronLeft as LucideChevronLeft,
  Send as LucideSend,
  Loader as LucideLoader,
} from "lucide-vue-next";

definePageMeta({
  middleware: "auth",
});

const router = useRouter();
const route = useRoute();
const { connect, on, disconnect, isOnline } = useSync();
const itemId = route.params.id as string;

const item = ref<any>(null);
const comments = ref<any[]>([]);
const newComment = ref("");
const isLoading = ref(true);
const isSending = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const fetchItem = async () => {
  try {
    const items = await $fetch<any[]>("/api/items");
    item.value = items.find((i: any) => i.id === itemId);
  } catch (e) {
    console.error("Failed to fetch item", e);
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

  isSending.value = true;
  try {
    await $fetch(`/api/items/${itemId}/comments`, {
      method: "POST",
      body: { text: newComment.value.trim() },
    });
    newComment.value = "";
    await fetchComments();
  } catch (e) {
    console.error("Failed to send comment", e);
  } finally {
    isSending.value = false;
  }
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes}m`;
  if (hours < 24) return `vor ${hours}h`;
  if (days < 7) return `vor ${days}d`;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
};

const getInitials = (name: string) => {
  return (
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??"
  );
};

onMounted(async () => {
  await Promise.all([fetchItem(), fetchComments()]);
  isLoading.value = false;

  // SSE Real-time Sync
  connect();
  on("comments:updated", (data: any) => {
    if (data.itemId === itemId) {
      fetchComments();
    }
  });
  // Also refresh item if it gets updated (e.g. name change or completion)
  on("items:updated", fetchItem);
});

onUnmounted(() => {
  disconnect();
});
</script>

<template>
  <div class="comments-wrapper animate-fade-in">
    <!-- Header -->
    <header class="comments-header glass-panel">
      <button class="btn-back" @click="router.push('/')">
        <LucideChevronLeft :size="20" />
      </button>
      <div class="header-info">
        <LucideMessageCircle :size="18" />
        <span class="header-title" v-if="item">{{ item.text }}</span>
        <span class="header-title" v-else>Kommentare</span>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">
      <LucideLoader :size="24" class="spin" />
    </div>

    <!-- Messages -->
    <div v-else class="messages-area" ref="messagesContainer">
      <div v-if="comments.length === 0" class="empty-state">
        <LucideMessageCircle :size="48" />
        <p>Noch keine Kommentare.</p>
        <p class="text-muted">Starte die Konversation!</p>
      </div>

      <div v-for="comment in comments" :key="comment.id" class="message-bubble">
        <div class="message-meta">
          <div class="message-avatar" :class="{ online: isOnline(comment.user?.id) }">
            {{ getInitials(comment.user?.name) }}
          </div>
          <span class="message-author">{{ comment.user?.name }}</span>
          <span class="message-time">{{ formatTime(comment.createdAt) }}</span>
        </div>
        <div class="message-text">{{ comment.text }}</div>
      </div>
    </div>

    <!-- Input -->
    <footer class="comment-input glass-panel">
      <form @submit.prevent="sendComment" class="comment-form">
        <input
          v-model="newComment"
          type="text"
          placeholder="Kommentar schreiben..."
          :disabled="isSending"
          class="comment-field"
          enterkeyhint="send"
          autocomplete="off"
        />
        <button
          type="submit"
          class="btn-send"
          :disabled="!newComment.trim() || isSending"
        >
          <LucideSend :size="18" />
        </button>
      </form>
    </footer>
  </div>
</template>

<style scoped>
.comments-wrapper {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  max-width: 600px;
  margin: 0 auto;
  background: var(--bg-primary);
}

.comments-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.btn-back {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0.25rem;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-weight: 600;
  min-width: 0;
}

.header-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  flex: 1;
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

.message-bubble {
  background: var(--glass-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.75rem;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.message-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.message-avatar.online {
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
  border-color: #10b981;
}

.message-author {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.message-time {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-left: auto;
}

.message-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.4;
  padding-left: calc(24px + 0.5rem);
}

.comment-input {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.comment-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.comment-field {
  flex: 1;
  background: var(--glass-bg);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 0.6rem 1rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
  transition: border-color var(--transition-fast);
}

.comment-field:focus {
  border-color: var(--accent-color);
}

.comment-field::placeholder {
  color: var(--text-muted);
}

.btn-send {
  background: var(--accent-color);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity var(--transition-fast);
  flex-shrink: 0;
}

.btn-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
