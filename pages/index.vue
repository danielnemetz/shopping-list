<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
// @ts-ignore
import draggable from "vuedraggable";
import { 
  CheckCircle as LucideCheckCircle, 
  ChevronDown as LucideChevronDown 
} from "lucide-vue-next";

definePageMeta({
  middleware: "auth",
});

const router = useRouter();
const { t } = useI18n();
const { connect, on, state: syncState, isOnline, queueAction } = useSync();

const user = ref<any>(null);
const items = ref<any[]>([]);
const isSubmitting = ref(false);
const allTags = ref<any[]>([]);
const selectedFilterTags = ref<number[]>([]);

const showTagPopover = ref(false);
const activeTaggingItem = ref<any>(null);

const showTagFilterBar = useUiStorage('show_filterbar', true);

const fetchTags = async () => {
  try {
    const data = await $fetch<any>("/api/tags");
    allTags.value = data.tags;
  } catch (e) { /* ignore */ }
};

const fetchItems = async () => {
  try {
    const data = await $fetch<any[]>("/api/items");
    if (!isDragging.value && !showTagPopover.value) {
      items.value = data;
    }
  } catch (err) {
    console.error("Failed to fetch items", err);
  }
};

const completedItemsList = ref<any[]>([]);
const completedTotal = ref(0);
const completedPage = ref(1);
const COMPLETED_PAGE_SIZE = 20;

const fetchCompletedItems = async (append: boolean) => {
  try {
    const page = append ? completedPage.value + 1 : 1;
    const data = await $fetch<{ items: any[]; pagination: { total: number } }>(
      `/api/items?completed=1&page=${page}&limit=${COMPLETED_PAGE_SIZE}`,
    );
    if (append) {
      completedItemsList.value = [...completedItemsList.value, ...data.items];
      completedPage.value = page;
    } else {
      completedItemsList.value = data.items;
      completedTotal.value = data.pagination?.total ?? 0;
      completedPage.value = 1;
    }
  } catch (err) {
    console.error("Failed to fetch completed items", err);
  }
};

const refreshAllItems = () => {
  fetchItems();
  fetchCompletedItems(false);
};

onMounted(async () => {
  try {
    const res = await $fetch("/api/auth/me");
    user.value = res.user;
    await Promise.all([fetchItems(), fetchTags(), fetchCompletedItems(false)]);

    connect();
    on("items:updated", refreshAllItems);
    on("tags:updated", fetchTags);
    on("comments:updated", refreshAllItems);
  } catch (e) { /* handles redirect */ }
});

const isPending = (itemId: string) => {
  return syncState.pendingActions.some(a => 
    (a.url.includes(`/api/items/${itemId}`) && (a.method === 'PUT' || a.method === 'DELETE')) ||
    (a.method === 'POST' && a.body.tempId === itemId)
  );
};

const toggleFilterTag = (tagId: number) => {
  const idx = selectedFilterTags.value.indexOf(tagId);
  if (idx >= 0) selectedFilterTags.value.splice(idx, 1);
  else selectedFilterTags.value.push(tagId);
};

const filteredItems = (list: any[]) => {
  if (selectedFilterTags.value.length === 0) return list;
  return list.filter((item) =>
    item.tags?.some((t: any) => selectedFilterTags.value.includes(t.id)),
  );
};

const handleAddItem = async ({ text, tags }: { text: string; tags: string[] }) => {
  const tempId = 'temp_' + Date.now();
  const newItem = {
    id: tempId,
    text,
    isCompleted: false,
    createdBy: user.value?.id,
    creatorName: user.value?.name,
    tags: tags.map(name => ({ id: -1, name })),
    createdAt: new Date().toISOString(),
    commentCount: 0,
    position: (openItems.value[0]?.position || 0) - 1000,
  };

  items.value.push(newItem);
  queueAction("/api/items", "POST", { text, tags, tempId });
};

const toggleItem = async (item: any) => {
  const previousState = item.isCompleted;
  item.isCompleted = !item.isCompleted;
  try {
    if (item.isCompleted) {
      items.value = items.value.filter((i) => i.id !== item.id);
      completedItemsList.value = [item, ...completedItemsList.value];
      completedTotal.value += 1;
    } else {
      completedItemsList.value = completedItemsList.value.filter((i) => i.id !== item.id);
      completedTotal.value = Math.max(0, completedTotal.value - 1);
        const last = items.value[items.value.length - 1];
        const lastPos = last != null ? last.position : 0;
      item.position = lastPos + 1000;
      items.value = [...items.value, item].sort((a, b) => a.position - b.position);
      fetchItems().then(() => { /* server order wins */ });
    }
    queueAction(`/api/items/${item.id}`, "PUT", { isCompleted: item.isCompleted });
  } catch (error) {
    item.isCompleted = previousState;
    if (item.isCompleted) {
      items.value = [...items.value, item].sort((a, b) => a.position - b.position);
      completedItemsList.value = completedItemsList.value.filter((i) => i.id !== item.id);
      completedTotal.value = Math.max(0, completedTotal.value - 1);
    } else {
      completedItemsList.value = [item, ...completedItemsList.value];
      completedTotal.value += 1;
      refreshAllItems();
    }
  }
};

const saveEdit = (item: any, newText: string) => {
  const oldText = item.text;
  item.text = newText;
  try {
    queueAction(`/api/items/${item.id}`, "PUT", { text: newText });
  } catch (e) {
    item.text = oldText;
  }
};

const { confirm: showConfirm } = useConfirm();

const deleteItem = async (item: any) => {
  const confirmed = await showConfirm({
    title: t('common.delete'),
    message: t('index.deleteConfirm', { text: item.text }),
    confirmLabel: t('common.delete'),
    variant: 'danger',
  });
  if (!confirmed) return;
  const wasCompleted = item.isCompleted;
  const prevItems = [...items.value];
  const prevCompleted = [...completedItemsList.value];
  const prevTotal = completedTotal.value;
  if (wasCompleted) {
    completedItemsList.value = completedItemsList.value.filter((i) => i.id !== item.id);
    completedTotal.value = Math.max(0, completedTotal.value - 1);
  } else {
    items.value = items.value.filter((i) => i.id !== item.id);
  }
  try {
    queueAction(`/api/items/${item.id}`, "DELETE", {});
  } catch (error) {
    if (wasCompleted) {
      completedItemsList.value = prevCompleted;
      completedTotal.value = prevTotal;
    } else {
      items.value = prevItems;
    }
  }
};

const saveItemTags = async (item: any, tagNames: string[]) => {
  item.tags = tagNames.map(name => ({ id: -1, name }));
  try {
    await $fetch(`/api/items/${item.id}`, {
      method: "PUT",
      body: { tags: tagNames },
    });
    await Promise.all([fetchItems(), fetchTags(), fetchCompletedItems(false)]);
  } catch (e) {
    console.error("Failed to save tags", e);
  }
};

const openTagPopover = (item: any) => {
  activeTaggingItem.value = item;
  showTagPopover.value = true;
};

const handlePopoverClose = async (save: boolean, updatedItem: any) => {
  showTagPopover.value = false;
  activeTaggingItem.value = null;

  if (save && updatedItem) {
    const originalItem = items.value.find(i => i.id === updatedItem.id)
      ?? completedItemsList.value.find(i => i.id === updatedItem.id);
    if (originalItem) {
      await saveItemTags(originalItem, updatedItem.tags.map((t: any) => t.name));
    }
  }
};

const isDragging = ref(false);

const openItems = computed({
  get: () =>
    filteredItems([...items.value]).sort(
      (a, b) => a.position - b.position,
    ),
  set: (val) => {
    items.value = val;
    updatePositions(val);
  },
});

const visibleCompletedItems = computed(() =>
  filteredItems(completedItemsList.value),
);
const hasMoreCompleted = computed(
  () => completedItemsList.value.length < completedTotal.value,
);
const loadMoreCompleted = () => {
  fetchCompletedItems(true);
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

const handlePlusTag = (name: string) => {
  if (!allTags.value.some(t => t.name.toLowerCase() === name.toLowerCase())) {
    allTags.value.push({ id: -1, name });
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
    <TheAppHeader 
      :user="user" 
      :allTagsCount="allTags.length"
      :showFilterBar="showTagFilterBar"
      @toggle-filter="showTagFilterBar = !showTagFilterBar"
    />

    <div class="sticky-filter-wrapper" v-if="showTagFilterBar && allTags.length > 0">
      <TagFilterBar 
        :all-tags="allTags" 
        :selected-filter-tags="selectedFilterTags"
        @toggle="toggleFilterTag"
      />
    </div>

    <main class="list-content">
      <div class="section-title" v-if="openItems.length > 0">
        {{ $t('index.toDoSection', { count: openItems.length }) }}
      </div>

      <div class="empty-state" v-if="items.length === 0 && completedTotal === 0">
        <LucideCheckCircle :size="48" />
        <p>{{ $t('index.emptyState') }}</p>
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
          <ShoppingListItem 
            :item="element"
            :is-pending="isPending(element.id)"
            :is-online="isOnline(element.createdBy)"
            @toggle="toggleItem"
            @delete="deleteItem"
            @save-edit="saveEdit"
            @save-tags="saveItemTags"
            @open-tag-popover="openTagPopover"
            @click-comments="(id) => router.push(`/comments/${id}`)"
            @reaction="refreshAllItems"
          />
        </template>
      </draggable>

      <div class="section-title mt-8" v-if="completedTotal > 0">
        {{ $t('index.completedSection', { count: completedTotal }) }}
      </div>

      <div class="items-list" v-if="completedTotal > 0">
        <ShoppingListItem 
          v-for="item in visibleCompletedItems"
          :key="item.id"
          :item="item"
          :is-pending="isPending(item.id)"
          :is-online="isOnline(item.createdBy)"
          @toggle="toggleItem"
          @delete="deleteItem"
          @save-edit="saveEdit"
          @save-tags="saveItemTags"
          @open-tag-popover="openTagPopover"
          @click-comments="(id) => router.push(`/comments/${id}`)"
          @reaction="refreshAllItems"
        />

        <button
          v-if="hasMoreCompleted"
          class="load-more-btn glass-panel"
          @click="loadMoreCompleted"
        >
          <LucideChevronDown :size="16" />
          {{ $t('index.loadMore', { remaining: completedTotal - completedItemsList.length }) }}
        </button>
      </div>
    </main>    <AddItemFooter 
      :is-submitting="isSubmitting"
      @add-item="handleAddItem"
    />

    <TagSelectionPopover 
      :show="showTagPopover"
      :item="activeTaggingItem"
      :all-tags="allTags"
      @close="handlePopoverClose"
      @add-global-tag="handlePlusTag"
    />
  </div>
</template>

<style scoped>
.list-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  position: relative;
  background-color: var(--bg-color);
  overflow: hidden;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 1rem;
  padding-bottom: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative; /* Base for sticky children */

  /* Progressive Edge Fade Out */
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    black var(--scroll-fade-size),
    black calc(100% - var(--scroll-fade-size)),
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    black var(--scroll-fade-size),
    black calc(100% - var(--scroll-fade-size)),
    transparent 100%
  );
}
.sticky-filter-wrapper {
  background: var(--bg-color);
  padding: 0 1rem;
  z-index: 100;
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 4px 20px -10px rgba(0, 0, 0, 0.1);
}


.section-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  font-weight: 800;
  padding-left: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color);
  opacity: 0.5;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  color: var(--text-muted);
  padding: 5rem 1rem;
  text-align: center;
}

.empty-state p {
  font-weight: 600;
  font-size: 1.1rem;
  max-width: 250px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.load-more-btn {
  width: calc(100% - 1.5rem);
  margin: 0.75rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  border: 2px dashed var(--border-color);
  border-radius: 20px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-bounce);
}

.load-more-btn:hover {
  color: var(--accent-color);
  border-color: var(--accent-color);
  background: rgba(99, 102, 241, 0.05);
  transform: translateY(-2px);
}

.ghost-item {
  opacity: var(--opacity-ghost);
  transform: scale(0.95);
}

.animate-fade-in {
  animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .list-content {
    padding: 0 0.75rem;
  }
}
</style>
