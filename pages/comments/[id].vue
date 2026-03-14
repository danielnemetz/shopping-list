<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  MessageCircle as LucideMessageCircle,
  ChevronLeft as LucideChevronLeft,
  Send as LucideSend,
  Loader as LucideLoader,
  CloudUpload as LucideCloudUpload,
} from "lucide-vue-next";

definePageMeta({
  middleware: "auth",
});

const router = useRouter();
const route = useRoute();
const { connect, on, disconnect, isOnline, setTyping, queueAction, state: syncState } = useSync();
const itemId = route.params.id as string;

const item = ref<any>(null);
const comments = ref<any[]>([]);
const newComment = ref("");
const isLoading = ref(true);
const isSending = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);
const typingUsers = ref<{ id: string, name: string }[]>([]);
const currentUser = ref<any>(null);

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

  const text = newComment.value.trim();
  const tempId = 'c_temp_' + Date.now();
  
  const optimisticComment = {
    id: tempId,
    text,
    createdAt: new Date().toISOString(),
    user: {
      id: currentUser.value?.id,
      name: currentUser.value?.name || "Ich"
    }
  };

  // Optimistic UI
  comments.value.push(optimisticComment);
  newComment.value = "";
  await scrollToBottom();

  try {
    queueAction(`/api/items/${itemId}/comments`, "POST", { text, tempId });
  } catch (e) {
    console.error("Failed to send comment", e);
    // Remove optimistic comment on definitive error? 
    // In our queue system, it will just stay in the queue until success or manual clear.
  }
};

// Handle typing indicators
watch(newComment, (val) => {
  if (val.length > 0) {
    const now = Date.now();
    if (now - lastTypingReport > 3000) {
      lastTypingReport = now;
      setTyping(itemId);
    }
  }
});

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
  try {
    const me = await $fetch<any>("/api/auth/me");
    currentUser.value = me.user;
  } catch (e) {}

  await Promise.all([fetchItem(), fetchComments()]);
  isLoading.value = false;

  // SSE Real-time Sync
  connect();
  on("comments:updated", (data: any) => {
    if (data.itemId === itemId) {
      fetchComments();
    }
  });

  on("typing:updated", (data: any) => {
    if (data.itemId === itemId) {
      // Filter out self
      typingUsers.value = data.users.filter((u: any) => u.id !== currentUser.value?.id && u.id !== 'admin');
    }
  });

  // Also refresh item if it gets updated (e.g. name change or completion)
  on("items:updated", fetchItem);
});

onUnmounted(() => {
  disconnect();
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
          <div v-if="isPending(comment.id)" class="pending-icon" title="Wird synchronisiert...">
             <LucideCloudUpload :size="12" />
          </div>
        </div>
        <div class="message-text" :class="{ 'is-pending': isPending(comment.id) }">{{ comment.text }}</div>
      </div>
    </div>

    <!-- Input -->
    <footer class="comment-input glass-panel">
      <!-- Typing Indicator -->
      <div class="typing-indicator" v-if="typingUsers.length > 0">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
        <span class="typing-text">
          {{ typingUsers.map(u => u.name).join(', ') }} 
          {{ typingUsers.length === 1 ? 'schreibt...' : 'schreiben...' }}
        </span>
      </div>

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
  color: var(--icon-color);
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

.message-text.is-pending {
  opacity: 0.6;
}

.pending-icon {
  color: var(--accent-color);
  display: flex;
  align-items: center;
  opacity: 0.8;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}

.comment-input {
  padding: 0.5rem 1rem 0.75rem;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
  position: relative;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  animation: fade-in 0.3s ease;
}

.typing-dots {
  display: flex;
  gap: 2px;
}

.typing-dots span {
  width: 4px;
  height: 4px;
  background: var(--accent-color);
  border-radius: 50%;
  opacity: 0.4;
  animation: typing-dots 1.4s infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-dots {
  0%, 100% { transform: translateY(0); opacity: 0.4; }
  50% { transform: translateY(-3px); opacity: 1; }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.typing-text {
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
