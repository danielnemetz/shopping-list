<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
// @ts-ignore
import draggable from "vuedraggable";
import {
  Activity as LucideActivity,
  LogOut as LucideLogOut,
  MessageCircle as LucideMessageCircle,
  ShoppingCart as LucideShoppingCart,
  GripVertical as LucideGripVertical,
  Check as LucideCheck,
  CheckCircle as LucideCheckCircle,
  Trash2 as LucideTrash2,
  Plus as LucidePlus,
  Loader as LucideLoader,
  ChevronDown as LucideChevronDown,
  Tag as LucideTag,
  X as LucideX,
} from "lucide-vue-next";

definePageMeta({
  middleware: "auth",
});

const router = useRouter();
const user = ref<any>(null);
const items = ref<any[]>([]);
const newItemText = ref("");
const isSubmitting = ref(false);
const allTags = ref<any[]>([]);
const selectedFilterTags = ref<number[]>([]);
const newItemTags = ref<string[]>([]);
const tagInput = ref("");
const showTagInput = ref(false);
let fetchInterval: any = null;

const fetchTags = async () => {
  try {
    const data = await $fetch<any>("/api/tags");
    allTags.value = data.tags;
  } catch (e) {
    /* ignore */
  }
};

const toggleFilterTag = (tagId: number) => {
  const idx = selectedFilterTags.value.indexOf(tagId);
  if (idx >= 0) {
    selectedFilterTags.value.splice(idx, 1);
  } else {
    selectedFilterTags.value.push(tagId);
  }
};

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

const filteredItems = (list: any[]) => {
  if (selectedFilterTags.value.length === 0) return list;
  return list.filter((item) =>
    item.tags?.some((t: any) => selectedFilterTags.value.includes(t.id)),
  );
};

const editingTagsItemId = ref<string | null>(null);
const editTagInput = ref("");

const startEditingTags = (item: any) => {
  editingTagsItemId.value = item.id;
  editTagInput.value = "";
};

const addTagToItem = (item: any, tagName: string) => {
  const trimmed = tagName.trim();
  if (
    trimmed &&
    !item.tags?.some((t: any) => t.name.toLowerCase() === trimmed.toLowerCase())
  ) {
    if (!item.tags) item.tags = [];
    item.tags.push({ id: -1, name: trimmed });
  }
  editTagInput.value = "";
};

const removeTagFromItem = (item: any, tagName: string) => {
  item.tags = item.tags.filter((t: any) => t.name !== tagName);
};

const handleEditTagKeydown = (e: KeyboardEvent, item: any) => {
  if ((e.key === "Enter" || e.key === ",") && editTagInput.value.trim()) {
    e.preventDefault();
    addTagToItem(item, editTagInput.value);
  } else if (e.key === "Escape") {
    saveItemTags(item);
  }
};

const saveItemTags = async (item: any) => {
  editingTagsItemId.value = null;
  try {
    await $fetch(`/api/items/${item.id}`, {
      method: "PUT",
      body: { tags: item.tags.map((t: any) => t.name) },
    });
    await Promise.all([fetchItems(), fetchTags()]);
  } catch (e) {
    console.error("Failed to save tags", e);
  }
};

const fetchItems = async () => {
  try {
    const data = await $fetch<any[]>("/api/items");
    // Only update if array actually changed (prevent jumping while dragging)
    // For a real app, we'd sync more carefully, but here we replace unless user is actively dragging
    if (!isDragging.value) {
      items.value = data;
    }
  } catch (err) {
    console.error("Failed to fetch items", err);
  }
};

onMounted(async () => {
  try {
    const res = await $fetch("/api/auth/me");
    user.value = res.user;
    await Promise.all([fetchItems(), fetchTags()]);
    fetchInterval = setInterval(fetchItems, 5000);
  } catch (e) {
    /* middleware handles redirect */
  }
});

onUnmounted(() => {
  if (fetchInterval) clearInterval(fetchInterval);
});

const isDragging = ref(false);

const openItems = computed({
  get: () =>
    filteredItems(items.value.filter((i) => !i.isCompleted)).sort(
      (a, b) => a.position - b.position,
    ),
  set: (val) => {
    // This setter is called by vuedraggable when array order changes
    // We visually update immediately, then calculate new positions and send to server

    // We need to re-merge the openItems into the full items array to maintain state
    const completedItems = items.value.filter((i) => i.isCompleted);
    items.value = [...val, ...completedItems];

    // Calculate and save new positions
    updatePositions(val);
  },
});

const completedItems = computed(() => {
  return filteredItems(
    items.value
      .filter((i) => i.isCompleted)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
  );
});

const completedItemsLimit = ref(5);
const visibleCompletedItems = computed(() =>
  completedItems.value.slice(0, completedItemsLimit.value),
);
const hasMoreCompleted = computed(
  () => completedItems.value.length > completedItemsLimit.value,
);
const loadMoreCompleted = () => {
  completedItemsLimit.value += 5;
};

const updatePositions = async (sortedArray: any[]) => {
  // Update positions: space them by 1000 to allow inserting between easily
  for (let i = 0; i < sortedArray.length; i++) {
    const item = sortedArray[i];
    const newPos = (i + 1) * 1000;
    if (item.position !== newPos) {
      item.position = newPos;
      $fetch(`/api/items/${item.id}`, {
        method: "PUT",
        body: { position: newPos },
      }).catch(console.error);
    }
  }
};

const addItem = async () => {
  if (!newItemText.value.trim() || isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    const added = await $fetch("/api/items", {
      method: "POST",
      body: { text: newItemText.value, tags: newItemTags.value },
    });
    items.value.push(added);
    newItemText.value = "";
    newItemTags.value = [];
    showTagInput.value = false;
    await fetchTags();
  } catch (error) {
    console.error("Failed to add item", error);
  } finally {
    isSubmitting.value = false;
  }
};

const toggleItem = async (item: any) => {
  item.isCompleted = !item.isCompleted;
  try {
    await $fetch(`/api/items/${item.id}`, {
      method: "PUT",
      body: { isCompleted: item.isCompleted },
    });
  } catch (error) {
    console.error("Failed to toggle", error);
    // Revert on fail
    item.isCompleted = !item.isCompleted;
  }
};

const deleteItem = async (item: any) => {
  if (!confirm(`Möchtest du "${item.text}" wirklich löschen?`)) {
    return;
  }

  items.value = items.value.filter((i) => i.id !== item.id);
  try {
    await $fetch(`/api/items/${item.id}`, { method: "DELETE" });
  } catch (error) {
    console.error("Failed to delete", error);
    fetchItems(); // revert
  }
};

const logout = async () => {
  await $fetch("/api/auth/logout", { method: "POST" });
  router.push("/login");
};

const getInitials = (name: string) => {
  if (!name) return "?";
  return name.substring(0, 2).toUpperCase();
};
</script>

<template>
  <div class="list-wrapper animate-fade-in">
    <!-- Header -->
    <header class="list-header glass-panel">
      <div class="header-left">
        <LucideShoppingCart :size="24" class="logo-icon" />
        <h2>Listly</h2>
      </div>
      <div class="header-right">
        <button
          class="btn-text"
          @click="router.push('/activity')"
          title="Aktivitäten"
        >
          <LucideActivity :size="20" />
        </button>
        <button
          class="btn-text"
          @click="router.push('/tags')"
          title="Tags verwalten"
        >
          <LucideTag :size="20" />
        </button>
        <div class="avatar" v-if="user" :title="user.name">
          {{ getInitials(user.name) }}
        </div>
        <button class="btn-text" @click="logout" title="Abmelden">
          <LucideLogOut :size="20" />
        </button>
      </div>
    </header>

    <main class="list-content">
      <!-- Tag-Filter -->
      <div class="tag-filter-bar" v-if="allTags.length > 0">
        <LucideTag :size="14" class="tag-filter-icon" />
        <button
          v-for="tag in allTags"
          :key="tag.id"
          class="tag-chip"
          :class="{ active: selectedFilterTags.includes(tag.id) }"
          @click="toggleFilterTag(tag.id)"
        >
          {{ tag.name }}
        </button>
      </div>

      <!-- Offene Einträge mit Drag & Drop -->
      <div class="section-title" v-if="openItems.length > 0">
        Zu erledigen ({{ openItems.length }})
      </div>

      <div class="empty-state" v-if="items.length === 0">
        <LucideCheckCircle size="48" />
        <p>Alles erledigt! Zeit, die Beine hochzulegen.</p>
      </div>

      <draggable
        v-model="openItems"
        group="items"
        item-key="id"
        handle=".drag-handle"
        @start="isDragging = true"
        @end="isDragging = false"
        class="items-list"
        animation="200"
        ghost-class="ghost-item"
        v-if="openItems.length > 0"
      >
        <template #item="{ element }">
          <div class="list-item open-item glass-panel">
            <button class="drag-handle" title="Verschieben">
              <LucideGripVertical :size="20" />
            </button>

            <div class="item-content">
              <div class="item-row">
                <button class="checkbox-btn" @click="toggleItem(element)">
                  <div class="checkbox"></div>
                </button>

                <span class="item-text">{{ element.text }}</span>

                <div class="item-meta">
                  <button
                    class="comment-btn"
                    @click="router.push(`/comments/${element.id}`)"
                    :title="
                      element.commentCount
                        ? `${element.commentCount} Kommentare`
                        : 'Kommentar schreiben'
                    "
                  >
                    <LucideMessageCircle :size="16" />
                    <span v-if="element.commentCount" class="comment-badge">{{
                      element.commentCount
                    }}</span>
                  </button>
                  <span
                    class="creator-badge"
                    :title="'Hinzugefügt von ' + element.creatorName"
                  >
                    {{ getInitials(element.creatorName) }}
                  </span>
                  <button class="delete-btn" @click="deleteItem(element)">
                    <LucideTrash2 :size="16" />
                  </button>
                </div>
              </div>

              <div
                class="item-tags-row"
                v-if="editingTagsItemId !== element.id"
                @click.stop="startEditingTags(element)"
              >
                <span
                  class="tag-badge"
                  v-for="tag in element.tags"
                  :key="tag.id"
                  >{{ tag.name }}</span
                >
                <span class="tag-add-hint"
                  ><LucideTag :size="12" />
                  <span v-if="!element.tags?.length">Tags</span></span
                >
              </div>
              <div class="item-tags-row editing" v-else @click.stop>
                <span
                  class="tag-badge removable"
                  v-for="tag in element.tags"
                  :key="tag.name"
                  @click="removeTagFromItem(element, tag.name)"
                >
                  {{ tag.name }} <LucideX :size="10" />
                </span>
                <input
                  v-model="editTagInput"
                  class="tag-inline-input"
                  placeholder="Tag hinzufügen..."
                  @keydown="(e) => handleEditTagKeydown(e, element)"
                  @blur="
                    editTagInput.trim()
                      ? addTagToItem(element, editTagInput)
                      : saveItemTags(element)
                  "
                  autofocus
                />
                <button class="tag-save-btn" @click="saveItemTags(element)">
                  <LucideCheck :size="12" />
                </button>
              </div>
            </div>
          </div>
        </template>
      </draggable>

      <!-- Erledigte Einträge -->
      <div class="section-title mt-8" v-if="completedItems.length > 0">
        Erledigt ({{ completedItems.length }})
      </div>

      <div class="items-list" v-if="completedItems.length > 0">
        <div
          class="list-item completed-item glass-panel"
          v-for="item in visibleCompletedItems"
          :key="item.id"
        >
          <div class="item-content">
            <div class="item-row">
              <button class="checkbox-btn checked" @click="toggleItem(item)">
                <div class="checkbox"><LucideCheck :size="16" /></div>
              </button>

              <span class="item-text">{{ item.text }}</span>

              <div class="item-meta">
                <button
                  class="comment-btn"
                  @click="router.push(`/comments/${item.id}`)"
                  :title="
                    item.commentCount
                      ? `${item.commentCount} Kommentare`
                      : 'Kommentar schreiben'
                  "
                >
                  <LucideMessageCircle :size="16" />
                  <span v-if="item.commentCount" class="comment-badge">{{
                    item.commentCount
                  }}</span>
                </button>
                <button class="delete-btn" @click="deleteItem(item)">
                  <LucideTrash2 :size="16" />
                </button>
              </div>
            </div>

            <div
              class="item-tags-row"
              v-if="editingTagsItemId !== item.id"
              @click.stop="startEditingTags(item)"
            >
              <span class="tag-badge" v-for="tag in item.tags" :key="tag.id">{{
                tag.name
              }}</span>
              <span class="tag-add-hint"
                ><LucideTag :size="12" />
                <span v-if="!item.tags?.length">Tags</span></span
              >
            </div>
            <div class="item-tags-row editing" v-else @click.stop>
              <span
                class="tag-badge removable"
                v-for="tag in item.tags"
                :key="tag.name"
                @click="removeTagFromItem(item, tag.name)"
              >
                {{ tag.name }} <LucideX :size="10" />
              </span>
              <input
                v-model="editTagInput"
                class="tag-inline-input"
                placeholder="Tag hinzufügen..."
                @keydown="(e) => handleEditTagKeydown(e, item)"
                @blur="
                  editTagInput.trim()
                    ? addTagToItem(item, editTagInput)
                    : saveItemTags(item)
                "
                autofocus
              />
              <button class="tag-save-btn" @click="saveItemTags(item)">
                <LucideCheck :size="12" />
              </button>
            </div>
          </div>
        </div>

        <button
          v-if="hasMoreCompleted"
          class="load-more-btn glass-panel"
          @click="loadMoreCompleted"
        >
          <LucideChevronDown :size="16" />
          Mehr laden ({{ completedItems.length - completedItemsLimit }} weitere)
        </button>
      </div>
    </main>

    <!-- Hinzufügen Bereich (fixed-bottom) -->
    <footer class="add-container glass-panel">
      <!-- Tag Input Row -->
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
            placeholder="Tag eingeben..."
            @keydown="handleTagInputKeydown"
            @blur="tagInput.trim() && addTagToNewItem(tagInput)"
          />
        </div>
      </div>
      <form @submit.prevent="addItem" class="add-form">
        <input
          v-model="newItemText"
          type="text"
          class="input-base"
          placeholder="Neuen Eintrag hinzufügen..."
          :disabled="isSubmitting"
        />
        <button
          type="button"
          class="btn-icon tag-toggle-btn"
          :class="{ active: showTagInput }"
          @click="showTagInput = !showTagInput"
          title="Tags hinzufügen"
        >
          <LucideTag :size="18" />
        </button>
        <button
          type="submit"
          class="btn-icon add-btn"
          :disabled="!newItemText.trim() || isSubmitting"
        >
          <LucidePlus :size="20" v-if="!isSubmitting" />
          <LucideLoader :size="20" class="spin" v-else />
        </button>
      </form>
    </footer>
  </div>
</template>

<style scoped>
.list-wrapper {
  display: flex;
  flex-direction: column;
  /* Use dynamic viewport height for mobile browser address bar handling */
  height: 100vh;
  height: 100dvh;
  position: relative;
  background-color: var(--bg-color);
  overflow: hidden; /* Prevent body scroll, use .list-content for scrolling */
}

.list-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  padding-top: calc(1rem + env(safe-area-inset-top, 0px));
  position: relative;
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

.logo-icon {
  color: var(--accent-color);
}

.header-left h2 {
  margin: 0;
  font-size: 1.25rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar {
  background-color: var(--accent-color);
  color: white;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.btn-text {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color var(--transition-fast);
  padding: 0.25rem;
}

.btn-text:hover {
  color: var(--danger-color);
}

.list-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
  font-weight: 600;
  padding-left: 0.5rem;
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
  align-items: flex-start;
  padding: 0.75rem 1rem;
  gap: 0.75rem;
  transition: border-color var(--transition-fast);
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.item-tags-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
  padding-left: 2.25rem;
  cursor: pointer;
  min-height: 1.2rem;
}

.item-tags-row.editing {
  cursor: default;
}

.list-item.open-item:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.drag-handle {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: grab;
  padding: 0;
  opacity: 0.5;
  transition: opacity var(--transition-fast);
}

.drag-handle:hover,
.open-item:hover .drag-handle {
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
}

.checkbox-btn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
}

.checkbox {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  border: 2px solid var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  transition: all var(--transition-fast);
}

.checkbox-btn:hover .checkbox {
  border-color: var(--accent-color);
}

.checkbox-btn.checked .checkbox {
  background-color: var(--success-color);
  border-color: var(--success-color);
  color: white;
}

.item-text {
  flex: 1;
  font-size: 1rem;
  word-break: break-word;
}

.completed-item {
  opacity: 0.6;
}

.completed-item .item-text {
  text-decoration: line-through;
  color: var(--text-muted);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.creator-badge {
  font-size: 0.65rem;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 0.15rem 0.4rem;
  border-radius: var(--border-radius-sm);
  color: var(--text-muted);
}

.comment-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  gap: 0.2rem;
  transition: all var(--transition-fast);
  position: relative;
}

.comment-btn:hover {
  color: var(--accent-color);
}

.comment-badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent-color);
  min-width: 14px;
  text-align: center;
}

.delete-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--border-radius-sm);
  opacity: 0;
  transition: all var(--transition-fast);
}

.list-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: var(--danger-color);
  background-color: rgba(239, 68, 68, 0.1);
}

.load-more-btn {
  width: 100%;
  padding: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px dashed var(--border-color);
  border-radius: var(--border-radius);
  background: transparent;
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.load-more-btn:hover {
  color: var(--accent-color);
  border-color: var(--accent-color);
}

.ghost-item {
  opacity: 0.3;
  background-color: var(--bg-surface-elevated);
}

.tag-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0;
  flex-wrap: wrap;
}

.tag-filter-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.tag-chip {
  background: var(--glass-bg);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tag-chip:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.tag-chip.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

.tag-badge {
  background: rgba(99, 102, 241, 0.15);
  color: var(--accent-color);
  border-radius: 10px;
  padding: 0.1rem 0.45rem;
  font-size: 0.65rem;
  font-weight: 600;
  white-space: nowrap;
}

.tag-badge.removable {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.tag-badge.removable:hover {
  background: rgba(239, 68, 68, 0.2);
  color: var(--danger-color);
}

.tag-input-area {
  padding: 0 0 0.5rem 0;
}

.new-item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
}

.tag-inline-input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 0.8rem;
  outline: none;
  min-width: 80px;
  flex: 1;
  padding: 0.2rem;
}

.tag-inline-input::placeholder {
  color: var(--text-muted);
}

.tag-toggle-btn {
  flex-shrink: 0;
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.tag-toggle-btn:hover,
.tag-toggle-btn.active {
  color: var(--accent-color);
  border-color: var(--accent-color);
}

.item-tags {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  cursor: pointer;
}

.tag-add-hint {
  color: var(--text-muted);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.list-item:hover .tag-add-hint {
  opacity: 0.5;
}

.item-tags-editor {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  align-items: center;
}

.tag-save-btn {
  background: var(--accent-color);
  border: none;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.add-container {
  flex-shrink: 0;
  padding: 1rem;
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-bottom: none;
  z-index: 10;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.add-form {
  display: flex;
  gap: 0.75rem;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

.add-btn {
  flex-shrink: 0;
  background-color: var(--accent-color);
  color: white;
  border: none;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Fallback for touch devices to always show delete btn since hover doesn't work well */
@media (hover: none) {
  .delete-btn {
    opacity: 0.8;
  }
}
</style>
