<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  LucideChevronLeft,
  LucideActivity,
  LucideAlertCircle,
  LucideLoader,
  LucideArrowRight,
} from "lucide-vue-next";

definePageMeta({
  middleware: "auth",
});

const router = useRouter();
const { t, locale } = useI18n();
const goBack = () => router.push("/");

const localeTag = computed(() => {
  if (locale.value === 'de') return 'de-DE';
  if (locale.value === 'pl') return 'pl-PL';
  return 'en-US';
});

interface Activity {
  id: number;
  action: string;
  itemName: string;
  createdAt: string | Date;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

const activities = ref<Activity[]>([]);
const isLoading = ref(true);
const page = ref(1);
const totalPages = ref(1);
const hasMore = ref(false);

const fetchActivities = async (loadMore = false) => {
  if (!loadMore) {
    isLoading.value = true;
    page.value = 1;
  } else {
    page.value++;
  }

  try {
    const data = (await $fetch(`/api/activities?page=${page.value}&limit=20`)) as any;
    if (data.success) {
      const newActivities = data.activities as Activity[];
      if (loadMore) {
        activities.value = [...activities.value, ...newActivities];
      } else {
        activities.value = newActivities;
      }
      totalPages.value = data.pagination.totalPages;
      hasMore.value = page.value < totalPages.value;
    }
  } catch (error) {
    console.error("Failed to fetch activities:", error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchActivities();
});

const getActionIcon = (action: string) => {
  switch (action) {
    case "added":
      return "✨";
    case "completed":
      return "✅";
    case "uncompleted":
      return "🔄";
    case "deleted":
      return "🗑️";
    case "renamed":
      return "✏️";
    case "tag_created":
    case "tag_updated":
      return "🏷️";
    case "tag_deleted":
      return "🔥";
    case "tags_changed":
      return "🏷️";
    default:
      return "📝";
  }
};

const getActionText = (action: string) => {
  switch (action) {
    case "added":
      return t('activity.added');
    case "completed":
      return t('activity.completed');
    case "uncompleted":
      return t('activity.uncompleted');
    case "deleted":
      return t('activity.deleted');
    case "renamed":
      return t('activity.renamed');
    case "tag_created":
      return t('activity.tagCreated');
    case "tag_updated":
      return t('activity.tagRenamed');
    case "tag_deleted":
      return t('activity.tagDeleted');
    case "tags_changed":
      return t('activity.tagsChanged');
    default:
      return t('activity.edited');
  }
  };

  const formatDate = (dateValue: string | Date) => {
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return t('activity.unknownDate');

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const time = d.toLocaleTimeString(localeTag.value, { hour: "2-digit", minute: "2-digit" });
  if (isToday) return t('activity.todayAt', { time });

  const date = d.toLocaleDateString(localeTag.value, { day: "2-digit", month: "2-digit", year: "numeric" });
  return t('activity.dateAt', { date, time });
};
</script>

<template>
  <div class="list-wrapper animate-fade-in">
    <header class="list-header glass-panel">
      <div class="header-left">
        <button class="btn-icon" @click="goBack" :title="$t('activity.back')">
          <LucideChevronLeft :size="24" />
        </button>
        <h2><LucideActivity :size="20" class="mr-2 inline" />{{ $t('activity.title') }}</h2>
      </div>
    </header>

    <main class="list-content p-4">
      <div
        v-if="isLoading && activities.length === 0"
        class="flex flex-col items-center justify-center p-8 opacity-70"
      >
        <LucideLoader :size="32" class="spin mb-4" />
        <p>{{ $t('activity.loading') }}</p>
      </div>

      <div
        v-else-if="activities.length === 0"
        class="flex flex-col items-center justify-center p-8 text-center opacity-70"
      >
        <LucideAlertCircle :size="48" class="mb-4" />
        <p>{{ $t('activity.empty') }}</p>
        <p class="text-sm mt-2">
          {{ $t('activity.emptyHint') }}
        </p>
      </div>

      <div v-else class="activities-timeline">
        <div
          v-for="activity in activities"
          :key="activity.id"
          class="activity-card glass-panel relative group"
        >
          <div class="activity-header flex justify-between items-start mb-2">
            <span class="activity-user font-semibold flex items-center gap-2">
              <span class="avatar-small">{{
                activity.user?.name.substring(0, 2).toUpperCase() || "?"
              }}</span>
              {{ activity.user?.name || $t('activity.unknown') }}
            </span>
            <span class="activity-time text-xs opacity-60">{{
              formatDate(activity.createdAt)
            }}</span>
          </div>

          <div class="activity-body pl-8">
            <span class="action-icon mr-2">{{
              getActionIcon(activity.action)
            }}</span>
            <span class="action-text opacity-80">{{
              getActionText(activity.action)
            }}</span>
            <span class="item-name font-medium ml-1"
              >"{{ activity.itemName }}"</span
            >
          </div>
        </div>

        <button
          v-if="hasMore"
          @click="fetchActivities(true)"
          class="btn-primary w-full mt-4 !bg-surface-2 !text-text-1"
        >
          {{ $t('activity.loadOlder') }}
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.list-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  background-color: var(--bg-color);
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

.activities-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.activity-card {
  padding: 1rem;
  border-radius: 12px;
  transition: transform var(--transition-fast);
}

.activity-card:hover {
  transform: translateY(-2px);
}

.avatar-small {
  background-color: var(--accent-color);
  color: white;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Tailwind-ish utilities used in template */
.flex {
  display: flex;
}
.flex-col {
  flex-direction: column;
}
.items-center {
  align-items: center;
}
.items-start {
  align-items: flex-start;
}
.justify-center {
  justify-content: center;
}
.justify-between {
  justify-content: space-between;
}
.p-4 {
  padding: 1rem;
}
.p-8 {
  padding: 2rem;
}
.mb-2 {
  margin-bottom: 0.5rem;
}
.mb-4 {
  margin-bottom: 1rem;
}
.mt-2 {
  margin-top: 0.5rem;
}
.mt-4 {
  margin-top: 1rem;
}
.mr-2 {
  margin-right: 0.5rem;
}
.ml-1 {
  margin-left: 0.25rem;
}
.pl-8 {
  padding-left: 2rem;
}
.gap-2 {
  gap: 0.5rem;
}
.text-center {
  text-align: center;
}
.text-sm {
  font-size: 0.875rem;
}
.text-xs {
  font-size: 0.75rem;
}
.font-semibold {
  font-weight: 600;
}
.font-medium {
  font-weight: 500;
}
.inline {
  display: inline;
}
.opacity-60 {
  opacity: 0.6;
}
.opacity-70 {
  opacity: 0.7;
}
.opacity-80 {
  opacity: 0.8;
}
.w-full {
  width: 100%;
}
.relative {
  position: relative;
}
</style>
