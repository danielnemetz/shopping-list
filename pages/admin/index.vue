<template>
  <div class="list-wrapper animate-fade-in">
    <header class="list-header glass-panel">
      <div class="header-left">
        <LucideShield :size="24" class="logo-icon admin" />
        <h2>Listly <span class="admin-badge">Admin</span></h2>
      </div>
      <div class="header-right">
        <NuxtLink to="/tags" class="btn-text" title="Tags verwalten">
          <LucideTags :size="20" />
        </NuxtLink>
        <button class="btn-text" @click="handleLogout" title="Logout">
          <LucideLogOut :size="20" />
        </button>
      </div>
    </header>

    <main class="list-content">
      <section class="admin-section glass-panel">
        <div class="section-title">
          <LucideUserPlus class="section-icon" :size="16" />
          Invite User
        </div>
        <form @submit.prevent="inviteUser" class="add-form mt-4">
          <div class="input-group flex-1">
            <LucideUser class="input-icon" :size="18" />
            <input
              id="name"
              v-model="newName"
              type="text"
              class="input-base with-icon"
              placeholder="Name"
              required
              :disabled="isInviting"
            />
          </div>
          <div class="input-group flex-1">
            <LucideMail class="input-icon" :size="18" />
            <input
              id="email"
              v-model="newEmail"
              type="email"
              class="input-base with-icon"
              placeholder="Email"
              required
              :disabled="isInviting"
            />
          </div>
          <button
            type="submit"
            class="btn-primary invite-btn"
            :disabled="isInviting || !newName || !newEmail"
          >
            <LucideSend :size="18" v-if="!isInviting" />
            <LucideLoader :size="18" class="spin" v-else />
            <span>{{ isInviting ? "Inviting..." : "Invite" }}</span>
          </button>
        </form>

        <p
          v-if="inviteMessage"
          :class="['status-message', inviteSuccess ? 'success' : 'error']"
        >
          {{ inviteMessage }}
        </p>
      </section>

      <section class="admin-section mt-8">
        <div class="section-title mb-4">
          <LucideUsers class="section-icon" :size="16" />
          Registered Users ({{ users.length }})
        </div>

        <div v-if="isLoadingUsers" class="empty-state">
          <LucideLoader :size="32" class="spin" />
          <p>Loading users...</p>
        </div>
        <div v-else-if="users.length === 0" class="empty-state">
          <LucideUsers :size="48" />
          <p>No users registered yet.</p>
        </div>
        <div v-else class="items-list">
          <div
            v-for="user in users"
            :key="user.id"
            class="list-item glass-panel"
          >
            <div class="avatar">{{ getInitials(user.name) }}</div>
            <div class="user-details">
              <span class="item-text">{{ user.name }}</span>
              <span class="user-email">{{ user.email }}</span>
            </div>
            <div class="item-meta">
              <span class="creator-badge" title="Joined Date">
                {{ new Date(user.createdAt).toLocaleDateString() }}
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  LucideLogOut,
  LucideUsers,
  LucideUserPlus,
  LucideUser,
  LucideMail,
  LucideSend,
  LucideLoader,
  LucideShield,
  LucideTags,
} from "lucide-vue-next";

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

const router = useRouter();
const users = ref<User[]>([]);
const isLoadingUsers = ref(true);

const newName = ref("");
const newEmail = ref("");
const isInviting = ref(false);
const inviteMessage = ref("");
const inviteSuccess = ref(false);

const checkAdminAccess = async () => {
  try {
    const response = await $fetch("/api/auth/me");
    if (!response.isAdmin) {
      router.push("/admin/login");
    }
  } catch {
    router.push("/admin/login");
  }
};

const fetchUsers = async () => {
  isLoadingUsers.value = true;
  try {
    const data = await $fetch("/api/users");
    if (data.success) {
      // Sort users by name alphabetically
      users.value = data.users.sort((a: User, b: User) =>
        a.name.localeCompare(b.name),
      );
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      router.push("/admin/login");
    }
    console.error("Failed to fetch users:", error);
  } finally {
    isLoadingUsers.value = false;
  }
};

const inviteUser = async () => {
  isInviting.value = true;
  inviteMessage.value = "";

  try {
    const response = await $fetch("/api/users/invite", {
      method: "POST",
      body: {
        name: newName.value,
        email: newEmail.value,
      },
    });

    if (response.success) {
      inviteSuccess.value = true;
      inviteMessage.value = `Successfully invited ${newName.value}!`;
      newName.value = "";
      newEmail.value = "";
      // Refresh the user list
      await fetchUsers();
    }
  } catch (error: any) {
    inviteSuccess.value = false;
    inviteMessage.value =
      error.response?._data?.statusMessage || "Failed to send invite.";
  } finally {
    isInviting.value = false;
  }
};

const handleLogout = async () => {
  await $fetch("/api/auth/logout", { method: "POST" });
  router.push("/admin/login");
};

const getInitials = (name: string) => {
  if (!name) return "?";
  return name.substring(0, 2).toUpperCase();
};

onMounted(async () => {
  await checkAdminAccess();
  await fetchUsers();
});
</script>

<style scoped>
.list-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  /* Red tinted gradient for admin area */
  background:
    radial-gradient(
      circle at top right,
      rgba(239, 68, 68, 0.15),
      transparent 50%
    ),
    radial-gradient(
      circle at bottom left,
      rgba(59, 130, 246, 0.1),
      transparent 50%
    );
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  position: sticky;
  top: 0;
  z-index: 10;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon.admin {
  color: var(--danger-color);
  filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.5));
}

.header-left h2 {
  margin: 0;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
}

.admin-badge {
  font-size: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
  padding: 4px 8px;
  border-radius: 6px;
  vertical-align: middle;
  margin-left: 8px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-text {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color var(--transition-fast);
}

.btn-text:hover {
  color: var(--danger-color);
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
}

.admin-section {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  font-weight: 600;
}

.section-icon {
  color: var(--danger-color);
}

.add-form {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.flex-1 {
  flex: 1;
  min-width: 200px;
}

.invite-btn {
  flex: 1;
  min-width: 100%;
}

@media (min-width: 480px) {
  .invite-btn {
    min-width: auto;
    flex: 0 0 auto;
    width: auto;
  }
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  color: var(--text-muted);
  pointer-events: none;
}

.input-base.with-icon {
  padding-left: 2.75rem;
}

.status-message {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  text-align: center;
}

.status-message.success {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.status-message.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-muted);
  padding: 3rem 1rem;
  text-align: center;
  opacity: 0.7;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.list-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  gap: 1rem;
  transition: border-color var(--transition-fast);
}

.list-item:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.avatar {
  background-color: var(--accent-color);
  color: white;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.item-text {
  font-weight: 500;
  color: var(--text-main);
}

.user-email {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.item-meta {
  display: flex;
  align-items: center;
}

.creator-badge {
  font-size: 0.75rem;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius-sm);
  color: var(--text-muted);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
