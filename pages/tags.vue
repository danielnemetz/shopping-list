<script setup lang="ts">
import {
  LucideArrowLeft,
  LucideTag,
  LucideLoader,
  LucideCheck,
  LucideX,
  LucidePencil,
  LucideTrash2,
  LucideCheckCircle,
  LucideAlertTriangle,
  LucidePlus,
} from "lucide-vue-next";

const { data: user } = await useFetch("/api/auth/me");
if (!user.value) {
  await navigateTo("/login");
}

const tags = ref<any[]>([]);
const isLoading = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const isEditingId = ref<number | null>(null);
const editName = ref("");
const newTagName = ref("");
const isCreating = ref(false);

const { t } = useI18n();
const { connect, on } = useSync();

const fetchTags = async () => {
  isLoading.value = true;
  try {
    const data = await $fetch<any>("/api/tags");
    tags.value = data.tags;
  } catch (err: any) {
    errorMessage.value = t('tags.loadError');
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchTags();
  connect();
  on("tags:updated", fetchTags);
});

const startEdit = (tag: any) => {
  isEditingId.value = tag.id;
  editName.value = tag.name;
};

const cancelEdit = () => {
  isEditingId.value = null;
  editName.value = "";
};

const saveEdit = async (tag: any) => {
  if (!editName.value.trim() || editName.value === tag.name) {
    cancelEdit();
    return;
  }

  try {
    await $fetch(`/api/tags/${tag.id}`, {
      method: "PUT",
      body: { name: editName.value.trim() },
    });
    tag.name = editName.value.trim();
    successMessage.value = t('tags.updated');
    setTimeout(() => (successMessage.value = ""), 3000);
    cancelEdit();
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || t('tags.saveError');
    setTimeout(() => (errorMessage.value = ""), 4000);
  }
};

const deleteTag = async (id: number) => {
  if (!confirm(t('tags.deleteConfirm'))) {
    return;
  }

  try {
    await $fetch(`/api/tags/${id}`, { method: "DELETE" });
    tags.value = tags.value.filter((t) => t.id !== id);
    successMessage.value = t('tags.deleted');
    setTimeout(() => (successMessage.value = ""), 3000);
  } catch (err: any) {
    errorMessage.value = t('tags.deleteError');
    setTimeout(() => (errorMessage.value = ""), 4000);
  }
};

const createTag = async () => {
  const name = newTagName.value.trim();
  if (!name) {
    errorMessage.value = t('tags.nameRequired');
    setTimeout(() => (errorMessage.value = ""), 4000);
    return;
  }
  const exists = tags.value.some((tag) => tag.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    errorMessage.value = t('tags.alreadyExists');
    setTimeout(() => (errorMessage.value = ""), 4000);
    return;
  }

  isCreating.value = true;
  try {
    const res = await $fetch<{ success: boolean; tag: { id: number; name: string } }>("/api/tags", {
      method: "POST",
      body: { name },
    });
    if (res.tag) {
      tags.value = [...tags.value, res.tag].sort((a, b) => a.name.localeCompare(b.name));
      newTagName.value = "";
      successMessage.value = t('tags.created');
      setTimeout(() => (successMessage.value = ""), 3000);
    }
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || t('tags.createError');
    setTimeout(() => (errorMessage.value = ""), 4000);
  } finally {
    isCreating.value = false;
  }
};
</script>

<template>
  <div class="tag-mgmt-wrapper animate-fade-in">
    <header class="list-header glass-panel">
      <div class="container-centered header-content">
        <div class="header-left">
          <NuxtLink to="/" class="btn-icon" :title="$t('common.back')">
            <LucideArrowLeft :size="24" />
          </NuxtLink>
          <h2><LucideTag :size="20" class="mr-2 inline" />{{ $t('tags.title') }}</h2>
        </div>
      </div>
    </header>

    <main class="list-content p-4">
      <div class="container-centered">
        <div v-if="isLoading" class="loading-state">
          <LucideLoader class="spin" :size="32" />
          <p>{{ $t('tags.loading') }}</p>
        </div>

        <div v-else class="tag-list-card">
          <div v-if="tags.length === 0" class="empty-state glass-panel">
            <LucideTag :size="48" class="text-muted mb-4" />
            <p>{{ $t('tags.empty') }}</p>
          </div>

          <ul v-else class="tag-list">
            <li v-for="tag in tags" :key="tag.id" class="tag-item glass-panel">
              <div v-if="isEditingId === tag.id" class="edit-mode">
                <input
                  v-model="editName"
                  v-focus
                  class="input-base"
                  @keyup.enter="saveEdit(tag)"
                  @keyup.esc="cancelEdit"
                />
                <div class="edit-actions">
                  <button
                    @click="saveEdit(tag)"
                    class="btn-icon success"
                    :title="$t('tags.save')"
                  >
                    <LucideCheck :size="18" />
                  </button>
                  <button
                    @click="cancelEdit"
                    class="btn-icon danger"
                    :title="$t('tags.cancel')"
                  >
                    <LucideX :size="18" />
                  </button>
                </div>
              </div>
              <div v-else class="view-mode">
                <span class="tag-label">
                  <LucideTag :size="14" class="mr-2 opacity-50 icon-inline" />
                  {{ tag.name }}
                </span>
                <div class="tag-actions">
                  <button
                    @click="startEdit(tag)"
                    class="btn-icon"
                    :title="$t('tags.edit')"
                  >
                    <LucidePencil :size="16" />
                  </button>
                  <button
                    @click="deleteTag(tag.id)"
                    class="btn-icon danger"
                    :title="$t('tags.delete')"
                  >
                    <LucideTrash2 :size="16" />
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Toast Messages -->
      <Transition name="fade">
        <div v-if="successMessage" class="toast success">
          <LucideCheckCircle :size="18" />
          {{ successMessage }}
        </div>
      </Transition>
      <Transition name="fade">
        <div v-if="errorMessage" class="toast error">
          <LucideAlertTriangle :size="18" />
          {{ errorMessage }}
        </div>
      </Transition>
    </main>

    <footer class="tags-footer glass-panel">
      <div class="container-centered">
        <form @submit.prevent="createTag" class="add-form">
          <div class="input-wrapper">
            <input
              v-model="newTagName"
              type="text"
              class="input-base"
              :placeholder="$t('tags.addPlaceholder')"
              :disabled="isCreating"
            />
          </div>
          <button
            type="submit"
            class="footer-btn add-btn"
            :disabled="isCreating || !newTagName.trim()"
            :title="$t('tags.create')"
          >
            <LucidePlus :size="24" v-if="!isCreating" />
            <LucideLoader :size="24" class="spin" v-else />
          </button>
        </form>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.tag-mgmt-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  background-color: var(--bg-color);
}

.list-header {
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 10;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
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
}

.header-left h2 {
  margin: 0;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.tag-list-card {
  width: 100%;
}

.tags-footer {
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
}

.tags-footer .add-form {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tags-footer .input-wrapper {
  flex: 1;
  position: relative;
}

.tags-footer .input-base {
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
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.03);
}

.tags-footer .input-base:focus {
  border-color: var(--accent-color);
  background: var(--bg-surface);
  box-shadow: 0 0 0 5px rgba(99, 102, 241, 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.01);
}

.tags-footer .footer-btn {
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  cursor: pointer;
  transition: all var(--transition-bounce);
  border: none;
  background: var(--accent-gradient);
  color: white;
  box-shadow: 0 6px 15px rgba(99, 102, 241, 0.25);
}

.tags-footer .footer-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  background: var(--accent-gradient-hover);
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
}

.tags-footer .footer-btn:active:not(:disabled) {
  transform: translateY(-1px) scale(0.95);
}

.tags-footer .footer-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none;
}

.tag-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tag-item {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  transition: transform var(--transition-fast);
}

.tag-item:hover {
  transform: translateY(-2px);
}

.view-mode,
.edit-mode {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.tag-label {
  display: flex;
  align-items: center;
  font-weight: 500;
  color: var(--text-main);
}

.icon-inline {
  display: inline-flex;
}

.tag-actions,
.edit-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input-base {
  flex: 1;
  padding: 0.5rem 1rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--text-muted);
  gap: 1rem;
}

.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 1.5rem;
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.toast.success {
  background: var(--accent-color);
  color: white;
}

.toast.error {
  background: var(--danger-color);
  color: white;
}

.opacity-50 {
  opacity: 0.5;
}
.mr-2 {
  margin-right: 0.5rem;
}

.btn-icon.success:hover {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 1rem);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.p-4 {
  padding: 1rem;
}
.inline {
  display: inline;
}
.mb-4 {
  margin-bottom: 1rem;
}
</style>
