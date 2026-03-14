<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
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
  CloudUpload as LucideCloudUpload,
  CloudOff as LucideCloudOff,
  Sun as LucideSun,
  Moon as LucideMoon,
  Monitor as LucideMonitor,
  Menu as LucideMenu,
  User as LucideUser,
  Tags as LucideTags,
  Download as LucideDownload,
  Edit as LucideEdit,
} from "lucide-vue-next";
import { useClickOutside } from "~/composables/useClickOutside";
import { usePwa } from "~/composables/usePwa";

definePageMeta({
  middleware: "auth",
});

const router = useRouter();
const { connect, on, disconnect, state: syncState, isOnline, queueAction } = useSync();
const { themeMode, toggleTheme } = useTheme();
const { isInstallable, install: installApp } = usePwa();

const isNavOpen = ref(false);
const isUserMenuOpen = ref(false);

const navMenuRef = ref(null);
const userMenuRef = ref(null);

useClickOutside(navMenuRef, () => { isNavOpen.value = false; });
useClickOutside(userMenuRef, () => { isUserMenuOpen.value = false; });

const toggleNav = () => {
  isNavOpen.value = !isNavOpen.value;
  if (isNavOpen.value) isUserMenuOpen.value = false;
};

const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value;
  if (isUserMenuOpen.value) isNavOpen.value = false;
};

const isPending = (itemId: string) => {
  return syncState.pendingActions.some(a => 
    (a.url.includes(`/api/items/${itemId}`) && (a.method === 'PUT' || a.method === 'DELETE')) ||
    (a.method === 'POST' && a.body.tempId === itemId)
  );
};

const user = ref<any>(null);
const items = ref<any[]>([]);
const newItemText = ref("");
const isSubmitting = ref(false);
const newItemInput = ref<HTMLInputElement | null>(null);
const allTags = ref<any[]>([]);
const selectedFilterTags = ref<number[]>([]);
const newItemTags = ref<string[]>([]);
const tagInput = ref("");
const showTagInput = ref(false);

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

const showTagPopover = ref(false);
const activeTaggingItem = ref<any>(null);
const popoverTagInput = ref("");

const openTagPopover = (item: any) => {
  activeTaggingItem.value = JSON.parse(JSON.stringify(item));
  if (!activeTaggingItem.value.tags) activeTaggingItem.value.tags = [];
  popoverTagInput.value = "";
  showTagPopover.value = true;
};

const addTagViaPopover = () => {
  const trimmed = popoverTagInput.value.trim();
  if (trimmed && activeTaggingItem.value) {
    // Add to item
    const lowercaseName = trimmed.toLowerCase();
    if (!activeTaggingItem.value.tags.some((t: any) => t.name.toLowerCase() === lowercaseName)) {
      activeTaggingItem.value.tags.push({ id: -1, name: trimmed });
    }
    
    // Also add to global list if not present so it shows up in the grid immediately
    if (!allTags.value.some((t: any) => t.name.toLowerCase() === lowercaseName)) {
      allTags.value.push({ id: -1, name: trimmed });
    }
    
    popoverTagInput.value = "";
  }
};

const toggleTagInPopover = (tagName: string) => {
  if (!activeTaggingItem.value) return;
  const index = activeTaggingItem.value.tags.findIndex((t: any) => t.name === tagName);
  if (index >= 0) {
    activeTaggingItem.value.tags.splice(index, 1);
  } else {
    activeTaggingItem.value.tags.push({ id: -1, name: tagName });
  }
};

const closeTagPopover = async (save: boolean) => {
  if (save && activeTaggingItem.value) {
    // Save tags to original item and server
    const originalItem = items.value.find(i => i.id === activeTaggingItem.value.id);
    if (originalItem) {
      originalItem.tags = activeTaggingItem.value.tags;
      await saveItemTags(originalItem);
    }
  }
  showTagPopover.value = false;
  activeTaggingItem.value = null;
};

const editingItemId = ref<string | null>(null);
const editText = ref("");

const startEditing = (item: any) => {
  editingItemId.value = item.id;
  editText.value = item.text;
};

const saveEdit = (item: any) => {
  if (!editingItemId.value) return;
  const trimmed = editText.value.trim();
  if (trimmed && trimmed !== item.text) {
    const oldText = item.text;
    item.text = trimmed;
    try {
      queueAction(`/api/items/${item.id}`, "PUT", { text: trimmed });
    } catch (e) {
      item.text = oldText;
      console.error("Failed to save edit", e);
    }
  }
  editingItemId.value = null;
};

const handleEditKeydown = (e: KeyboardEvent, item: any) => {
  if (e.key === "Enter") {
    e.preventDefault();
    saveEdit(item);
  } else if (e.key === "Escape") {
    editingItemId.value = null;
  }
};

const touchStartX = ref(0);
const swipeOffset = ref(0);
const activeSwipeItemId = ref<string | null>(null);
const swipeThreshold = 100; // px to trigger

// Unified start for mouse and touch
const onSwipeStart = (clientX: number, item: any, event: UIEvent) => {
  if (editingItemId.value === item.id || isDragging.value) return;
  
  // Don't start swipe if clicking on a button or the drag handle
  const target = event.target as HTMLElement;
  if (target.closest('button') || target.closest('.drag-handle')) return;

  touchStartX.value = clientX;
  activeSwipeItemId.value = item.id;
  swipeOffset.value = 0;

  if (event instanceof MouseEvent) {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
};

const onTouchStart = (e: TouchEvent, item: any) => {
  const touch = e.touches[0];
  if (touch) {
    onSwipeStart(touch.clientX, item, e);
  }
};

const onMouseDown = (e: MouseEvent, item: any) => {
  onSwipeStart(e.clientX, item, e);
};

// Unified move logic
const onSwipeMove = (clientX: number, item: any, event?: UIEvent) => {
  if (activeSwipeItemId.value !== item.id) return;
  const diff = clientX - touchStartX.value;

  // Allow swiping left and right
  swipeOffset.value = diff;
  
  // Prevent scrolling when swiping horizontally on mobile
  if (event && event instanceof TouchEvent && Math.abs(diff) > 10 && event.cancelable) {
    event.preventDefault();
  }
};

const onTouchMove = (e: TouchEvent, item: any) => {
  const touch = e.touches[0];
  if (touch) {
    onSwipeMove(touch.clientX, item, e);
  }
};

const onMouseMove = (e: MouseEvent) => {
  if (activeSwipeItemId.value) {
    onSwipeMove(e.clientX, { id: activeSwipeItemId.value });
  }
};

// Unified end logic
const onSwipeEnd = (item?: any) => {
  const itemId = item?.id || activeSwipeItemId.value;
  if (!itemId) return;

  if (swipeOffset.value > swipeThreshold) {
    // Right swipe: Toggle complete
    const itemToToggle = items.value.find(i => i.id === itemId);
    if (itemToToggle) {
      toggleItem(itemToToggle);
    }
  } else if (swipeOffset.value < -swipeThreshold) {
    // Left swipe: Open tag popover
    const itemToTag = items.value.find(i => i.id === itemId);
    if (itemToTag) {
      openTagPopover(itemToTag);
    }
  }

  // Finalize state
  swipeOffset.value = 0;
  activeSwipeItemId.value = null;
  
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
};

const onTouchEnd = (e: TouchEvent, item: any) => {
  onSwipeEnd(item);
};

const onMouseUp = () => {
  onSwipeEnd();
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
    if (!isDragging.value && !editingTagsItemId.value) {
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

    // SSE Real-time Sync
    connect();
    on("items:updated", fetchItems);
    on("tags:updated", fetchTags);
    on("comments:updated", fetchItems);
  } catch (e) {
    /* middleware handles redirect */
  }
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
      try {
        queueAction(`/api/items/${item.id}`, "PUT", { position: newPos });
      } catch (err) {
        console.error(err);
      }
    }
  }
};

const addItem = async () => {
  if (!newItemText.value.trim() || isSubmitting.value) return;

  const tempId = 'temp_' + Date.now();
  const newItem = {
    id: tempId,
    text: newItemText.value,
    isCompleted: false,
    createdBy: user.value?.id,
    creatorName: user.value?.name,
    tags: newItemTags.value.map(name => ({ id: -1, name })),
    createdAt: new Date().toISOString(),
    commentCount: 0,
    position: (openItems.value[0]?.position || 0) - 1000,
  };

  // Optimistic UI
  items.value.push(newItem);
  const text = newItemText.value;
  const tags = newItemTags.value;
  newItemText.value = "";
  newItemTags.value = [];
  showTagInput.value = false;

  try {
    queueAction("/api/items", "POST", { text, tags, tempId });
    nextTick(() => {
      newItemInput.value?.focus();
    });
  } catch (error) {
    console.error("Failed to add item", error);
  }
};

const toggleItem = async (item: any) => {
  const previousState = item.isCompleted;
  item.isCompleted = !item.isCompleted;
  
  // Optimistic UI: we already toggled it above
  try {
    queueAction(`/api/items/${item.id}`, "PUT", { isCompleted: item.isCompleted });
  } catch (error) {
    console.error("Failed to toggle", error);
    item.isCompleted = previousState;
  }
};

const deleteItem = async (item: any) => {
  if (!confirm(`Möchtest du "${item.text}" wirklich löschen?`)) {
    return;
  }

  const previousItems = [...items.value];
  items.value = items.value.filter((i) => i.id !== item.id);
  
  try {
    queueAction(`/api/items/${item.id}`, "DELETE", {});
  } catch (error) {
    console.error("Failed to delete", error);
    items.value = previousItems;
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
        <div class="menu-container" ref="navMenuRef">
          <button 
            class="burger-btn" 
            @click.stop="toggleNav" 
            :class="{ 'active': isNavOpen }"
            title="Menu"
          >
            <div class="burger-bar"></div>
            <div class="burger-bar"></div>
            <div class="burger-bar"></div>
          </button>
          
          <Transition name="dropdown">
            <div v-if="isNavOpen" class="dropdown-menu nav-dropdown glass-panel">
              <NuxtLink to="/activity" class="dropdown-item" @click="isNavOpen = false">
                <LucideActivity :size="18" />
                <span>Aktivitäten</span>
              </NuxtLink>
              <NuxtLink to="/tags" class="dropdown-item" @click="isNavOpen = false">
                <LucideTags :size="18" />
                <span>Tags verwalten</span>
              </NuxtLink>
              
              <div v-if="isInstallable" class="dropdown-divider"></div>
              
              <button v-if="isInstallable" class="dropdown-item install-item" @click="installApp(); isNavOpen = false">
                <LucideDownload :size="18" />
                <span>App installieren</span>
              </button>
            </div>
          </Transition>
        </div>

        <div class="header-title">
          <LucideShoppingCart :size="24" class="logo-icon" />
          <h2>Listly</h2>
        </div>

        <div class="sync-status" :class="{ connected: syncState.isConnected }" :title="syncState.isConnected ? 'Online' : 'Offline'">
          <div class="status-dot"></div>
          <span>{{ syncState.isConnected ? "Synced" : "Offline" }}</span>
        </div>
      </div>

      <div class="header-right">
        <div class="user-menu-container" ref="userMenuRef">
          <button class="avatar-btn" @click.stop="toggleUserMenu">
            <div class="avatar" v-if="user">
              {{ user.name?.substring(0, 2).toUpperCase() }}
            </div>
          </button>

          <Transition name="dropdown">
            <div v-if="isUserMenuOpen" class="dropdown-menu user-dropdown glass-panel">
              <div class="dropdown-header">
                <span class="user-name">{{ user?.name }}</span>
                <span class="user-email">{{ user?.email }}</span>
              </div>
              <div class="dropdown-divider"></div>
              
              <button class="dropdown-item" @click.stop="toggleTheme">
                <LucideSun v-if="themeMode === 'light'" :size="18" />
                <LucideMoon v-else-if="themeMode === 'dark'" :size="18" />
                <LucideMonitor v-else :size="18" />
                <span class="flex-1">Darstellung: <strong>{{ themeMode }}</strong></span>
              </button>

              <div class="dropdown-divider"></div>
              
              <button class="dropdown-item logout-item" @click.stop="logout">
                <LucideLogOut :size="18" />
                <span>Abmelden</span>
              </button>
            </div>
          </Transition>
        </div>
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
        <LucideCheckCircle :size="48" />
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
          <div 
            class="list-item open-item glass-panel"
            @touchstart="onTouchStart($event, element)"
            @touchmove="onTouchMove($event, element)"
            @touchend="onTouchEnd($event, element)"
            @mousedown="onMouseDown($event, element)"
            @dragstart.prevent
          >
            <div 
              class="swipe-background"
              :class="{ tagging: swipeOffset < 0 }"
              v-show="activeSwipeItemId === element.id"
            >
              <div class="swipe-bg-content" v-if="swipeOffset > 0">
                <LucideCheck :size="24" />
                <span>Abschließen</span>
              </div>
              <div class="swipe-bg-content tagging-content" v-else-if="swipeOffset < 0">
                <span>Taggen</span>
                <LucideTag :size="24" />
              </div>
            </div>

            <div 
              class="item-content"
              :style="{ 
                transform: activeSwipeItemId === element.id ? `translateX(${swipeOffset}px)` : 'none',
                transition: activeSwipeItemId === element.id ? 'none' : 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
              }"
            >
              <div class="item-row">
                <button class="drag-handle" title="Verschieben">
                  <LucideGripVertical :size="20" />
                </button>

                <button class="checkbox-btn" @click="toggleItem(element)">
                  <div class="checkbox"></div>
                </button>

                <div class="item-text-wrapper" v-if="editingItemId === element.id">
                  <input
                    v-model="editText"
                    class="item-edit-input"
                    @keydown="(e) => handleEditKeydown(e, element)"
                    @blur="saveEdit(element)"
                    autofocus
                  />
                </div>
                <span 
                  v-else
                  class="item-text" 
                  :class="{ 'is-pending': isPending(element.id) }"
                  @click="startEditing(element)"
                >
                  {{ element.text }}
                </span>

                <div class="item-meta">
                  <div class="pending-badge" v-if="isPending(element.id)" title="Wird synchronisiert...">
                    <LucideCloudUpload :size="14" class="pulse" />
                  </div>
                  <button class="edit-btn" @click="startEditing(element)" title="Bearbeiten">
                    <LucideEdit :size="16" />
                  </button>
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
                    :class="{ online: isOnline(element.createdBy) }"
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
          @touchstart="onTouchStart($event, item)"
          @touchmove="onTouchMove($event, item)"
          @touchend="onTouchEnd($event, item)"
          @mousedown="onMouseDown($event, item)"
          @dragstart.prevent
        >
          <div 
            class="swipe-background reverse"
            :class="{ tagging: swipeOffset < 0 }"
            v-show="activeSwipeItemId === item.id"
          >
            <div class="swipe-bg-content" v-if="swipeOffset > 0">
              <LucideX :size="24" />
              <span>Wieder öffnen</span>
            </div>
            <div class="swipe-bg-content tagging-content" v-else-if="swipeOffset < 0">
              <span>Taggen</span>
              <LucideTag :size="24" />
            </div>
          </div>

          <div 
            class="item-content"
            :style="{ 
              transform: activeSwipeItemId === item.id ? `translateX(${swipeOffset}px)` : 'none',
              transition: activeSwipeItemId === item.id ? 'none' : 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
            }"
          >
            <div class="item-row">
              <button class="checkbox-btn checked" @click="toggleItem(item)">
                <div class="checkbox"><LucideCheck :size="16" /></div>
              </button>

              <div class="item-text-wrapper" v-if="editingItemId === item.id">
                <input
                  v-model="editText"
                  class="item-edit-input"
                  @keydown="(e) => handleEditKeydown(e, item)"
                  @blur="saveEdit(item)"
                  autofocus
                />
              </div>
              <span 
                v-else
                class="item-text" 
                :class="{ 'is-pending': isPending(item.id) }"
                @click="startEditing(item)"
              >
                {{ item.text }}
              </span>

              <div class="item-meta">
                <div class="pending-badge" v-if="isPending(item.id)" title="Wird synchronisiert...">
                  <LucideCloudUpload :size="14" class="pulse" />
                </div>
                <button class="edit-btn" @click="startEditing(item)" title="Bearbeiten">
                  <LucideEdit :size="16" />
                </button>
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
          ref="newItemInput"
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

    <!-- Neu: Tag Auswahl Popover -->
    <Transition name="fade">
      <div 
        v-if="showTagPopover" 
        class="tag-popover-overlay"
        @click="closeTagPopover(true)"
      >
        <div class="tag-popover-panel glass-panel" @click.stop>
          <div class="tag-popover-header">
            <h3>Tags für "{{ activeTaggingItem?.text }}"</h3>
            <button class="tag-popover-close" @click="closeTagPopover(true)">
              <LucideX :size="20" />
            </button>
          </div>
          
          <div class="tag-popover-content">
              <div class="popover-input-wrapper">
                <input 
                  v-model="popoverTagInput"
                  type="text"
                  class="popover-tag-input"
                  placeholder="Neuen Tag hinzufügen..."
                  @keydown.enter.prevent="addTagViaPopover"
                />
                <button class="popover-add-btn" @click="addTagViaPopover" :disabled="!popoverTagInput.trim()">
                  <LucidePlus :size="18" />
                </button>
              </div>

            <div class="tag-grid">
              <button 
                v-for="tag in allTags" 
                :key="tag.id"
                class="tag-selection-btn"
                :class="{ active: activeTaggingItem?.tags?.some((t: any) => t.name === tag.name) }"
                @click="toggleTagInPopover(tag.name)"
              >
                <LucideTag :size="14" />
                {{ tag.name }}
              </button>
            </div>
            
            <div class="tag-popover-footer">
              <button class="done-btn" @click="closeTagPopover(true)">Fertig</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
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
  border-top: none;
  background: var(--bg-color);
  z-index: 50;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  color: var(--accent-color);
}

.header-title h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--bg-surface-elevated);
  color: var(--text-muted);
  margin-left: 0.5rem;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.sync-status.connected {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.sync-status.connected .status-dot {
  box-shadow: 0 0 5px currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-btn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 50%;
  transition: transform var(--transition-fast);
}

.avatar-btn:hover {
  transform: scale(1.05);
}

.avatar {
  background-color: var(--accent-color);
  color: white;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  box-shadow: 0 0 0 2px var(--bg-surface);
}

.btn-text.active {
  color: var(--accent-color);
}

/* Burger Button Redesign */
.burger-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  background: var(--bg-surface-elevated);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  padding: 0;
}

.burger-btn:hover {
  transform: translateY(-2px);
  border-color: var(--accent-color);
  box-shadow: var(--shadow-glow);
}

.burger-btn:active {
  transform: scale(0.95);
}

.burger-bar {
  width: 20px;
  height: 2px;
  background-color: var(--text-main);
  border-radius: 2px;
  transition: all var(--transition-bounce);
}

.burger-btn.active .burger-bar:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.burger-btn.active .burger-bar:nth-child(2) {
  opacity: 0;
}
.burger-btn.active .burger-bar:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* Dropdown Menus */
.menu-container, .user-menu-container {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 12px);
  min-width: 240px;
  max-width: 300px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  background: var(--bg-surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  transform-origin: top;
}

.light-theme .dropdown-menu {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.nav-dropdown {
  left: 0;
}

.user-dropdown {
  right: 0;
}

.dropdown-header {
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-main);
}

.user-email {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.dropdown-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 0.5rem 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--border-radius-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  transition: all var(--transition-fast);
}

.dropdown-item:hover {
  background-color: var(--bg-surface-elevated);
  color: var(--text-main);
  transform: translateX(4px);
}

.dropdown-item strong {
  text-transform: capitalize;
}

.logout-item:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.install-item:hover {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success-color);
}

/* Transitions */
.dropdown-enter-active {
  transition: all 0.2s var(--transition-fast);
}

.dropdown-leave-active {
  transition: all 0.15s ease-in;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@keyframes dropdownIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
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
  position: relative;
  overflow: hidden;
  user-select: none;
  touch-action: pan-y;
  display: flex;
  align-items: flex-start;
  padding: 0;
  transition: border-color var(--transition-fast);
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
  background: var(--accent-color);
  justify-content: flex-end;
}

.tagging-content {
  flex-direction: row;
}

.swipe-bg-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.item-text.is-pending {
  opacity: 0.6;
}

.pending-badge {
  color: var(--accent-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse {
  animation: pulse 2s infinite;
}

.item-content {
  position: relative;
  width: 100%;
  z-index: 1;
  background: var(--bg-surface);
  transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  will-change: transform;
  border-radius: var(--border-radius);
  padding: 0.75rem 1rem;
}

.open-item .item-content {
  background: var(--bg-surface);
}

.completed-item .item-content {
  background: var(--bg-surface-elevated);
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
  border-color: var(--accent-color);
  background-color: var(--bg-surface-elevated);
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
  background-color: var(--bg-surface-elevated);
  padding: 0.15rem 0.4rem;
  border-radius: var(--border-radius-sm);
  color: var(--text-muted);
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.creator-badge.online {
  background-color: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.3);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
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

.edit-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--border-radius-sm);
  opacity: 0;
  transition: all var(--transition-fast);
}

.list-item:hover .edit-btn {
  opacity: 1;
}

.edit-btn:hover {
  color: var(--accent-color);
  background-color: rgba(59, 130, 246, 0.1);
}

.item-text-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
}

.item-edit-input {
  width: 100%;
  padding: 4px 8px;
  background: var(--bg-surface-elevated);
  border: 1px solid var(--accent-color);
  border-radius: 4px;
  color: var(--text-main);
  font-size: 1rem;
  font-family: inherit;
  outline: none;
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

.tag-popover-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.tag-popover-panel {
  width: 100%;
  max-width: 500px;
  background: var(--bg-surface-elevated);
  border-radius: 24px 24px 0 0;
  padding: 1.5rem;
  border-left: none;
  border-right: none;
  border-bottom: none;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.tag-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.tag-popover-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-main);
}

.tag-popover-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.5rem;
}

.popover-input-wrapper {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.popover-tag-input {
  flex: 1;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: var(--text-main);
  font-size: 1rem;
  outline: none;
  transition: border-color var(--transition-fast);
}

.popover-tag-input:focus {
  border-color: var(--accent-color);
}

.popover-add-btn {
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.popover-add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.tag-selection-btn {
  background: var(--glass-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.6rem 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all var(--transition-fast);
  cursor: pointer;
}

.tag-selection-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.tag-selection-btn.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.tag-popover-footer {
  display: flex;
  justify-content: center;
}

.done-btn {
  width: 100%;
  padding: 1rem;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.done-btn:active {
  transform: scale(0.98);
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Fallback for touch devices... */
@media (hover: none) {
  .delete-btn {
    opacity: 0.8;
  }
}
</style>
