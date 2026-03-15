<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from "vue";

const props = withDefaults(
  defineProps<{
    name: string | null | undefined;
    online?: boolean;
  }>(),
  { online: false }
);

const visible = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);
const tooltipRef = ref<HTMLElement | null>(null);
const positioned = ref(false);
const tooltipStyle = ref<Record<string, string>>({});
const side = ref<"above" | "below">("above");

let showDelayId: ReturnType<typeof setTimeout> | null = null;
let hideDelayId: ReturnType<typeof setTimeout> | null = null;

const HOVER_DELAY_MS = 400;
const TOUCH_AUTO_HIDE_MS = 2500;
const VIEWPORT_PADDING = 8;
const GAP = 6;
const ARROW_INSET = 12;

const initials = computed(() => {
  if (!props.name) return "?";
  return props.name.substring(0, 2).toUpperCase();
});

const tooltipText = computed(() => {
  const name = props.name || "Unbekannt";
  const status = props.online ? "Online" : "Offline";
  return `${name} (${status})`;
});

function updatePosition() {
  if (!wrapperRef.value || !tooltipRef.value || !import.meta.client) return;

  const badge = wrapperRef.value.getBoundingClientRect();
  const tt = tooltipRef.value.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const centerX = badge.left + badge.width / 2;
  let left = centerX - tt.width / 2;
  left = Math.max(VIEWPORT_PADDING, Math.min(vw - tt.width - VIEWPORT_PADDING, left));

  const spaceAbove = badge.top;
  const spaceBelow = vh - badge.bottom;
  const goAbove = spaceAbove >= tt.height + GAP || spaceAbove >= spaceBelow;

  let top: number;
  if (goAbove) {
    top = badge.top - tt.height - GAP;
    side.value = "above";
  } else {
    top = badge.bottom + GAP;
    side.value = "below";
  }

  const arrowX = centerX - left;
  const arrowLeft = Math.max(ARROW_INSET, Math.min(tt.width - ARROW_INSET, arrowX));

  tooltipStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    "--arrow-left": `${arrowLeft}px`,
  };
  positioned.value = true;
}

watch(visible, (v) => {
  if (v) {
    positioned.value = false;
    nextTick(() => {
      updatePosition();
      requestAnimationFrame(updatePosition);
    });
  } else {
    positioned.value = false;
  }
});

function clearTimers() {
  if (showDelayId) { clearTimeout(showDelayId); showDelayId = null; }
  if (hideDelayId) { clearTimeout(hideDelayId); hideDelayId = null; }
}

function hide() {
  clearTimers();
  visible.value = false;
}

function onMouseEnter() {
  if (hideDelayId) { clearTimeout(hideDelayId); hideDelayId = null; }
  if (showDelayId) return;
  showDelayId = setTimeout(() => {
    showDelayId = null;
    visible.value = true;
  }, HOVER_DELAY_MS);
}

function onMouseLeave() {
  if (showDelayId) { clearTimeout(showDelayId); showDelayId = null; }
  visible.value = false;
}

function onBadgeClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  visible.value = !visible.value;
  if (visible.value && "ontouchstart" in window) {
    if (hideDelayId) clearTimeout(hideDelayId);
    hideDelayId = setTimeout(() => {
      visible.value = false;
      hideDelayId = null;
    }, TOUCH_AUTO_HIDE_MS);
  }
}

function onDocumentClick(e: MouseEvent) {
  if (!visible.value) return;
  if (wrapperRef.value?.contains(e.target as Node)) return;
  hide();
}

if (import.meta.client) {
  onMounted(() => document.addEventListener("click", onDocumentClick, true));
  onUnmounted(() => document.removeEventListener("click", onDocumentClick, true));
}

onUnmounted(clearTimers);
</script>

<template>
  <span
    ref="wrapperRef"
    class="user-badge-wrapper"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @click="onBadgeClick"
  >
    <span class="user-badge" :class="{ online }">
      {{ initials }}
    </span>

    <Teleport to="body">
      <Transition name="ub-tooltip">
        <div
          v-if="visible"
          ref="tooltipRef"
          class="ub-tooltip"
          :class="[side, { positioned }]"
          role="tooltip"
          :style="tooltipStyle"
        >
          {{ tooltipText }}
          <span class="ub-tooltip-arrow" aria-hidden="true" />
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.user-badge-wrapper {
  position: relative;
  display: inline-flex;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.user-badge {
  font-size: 0.65rem;
  background: var(--bg-surface-elevated);
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  color: var(--text-muted);
  font-weight: 700;
  border: 1px solid var(--border-color);
  white-space: nowrap;
  opacity: 1;
  pointer-events: auto;
}

.user-badge.online {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.4);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
  filter: saturate(1.5) brightness(1.1);
}
</style>

<style>
.ub-tooltip {
  position: fixed;
  padding: 0.4rem 0.65rem;
  background: var(--tooltip-bg, var(--bg-surface-elevated));
  color: var(--text-main);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border-color);
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.ub-tooltip.positioned {
  opacity: 1;
}

.ub-tooltip-arrow {
  position: absolute;
  left: var(--arrow-left, 50%);
  transform: translateX(-50%);
  border: 6px solid transparent;
}

.ub-tooltip.above .ub-tooltip-arrow {
  top: 100%;
  border-top-color: var(--tooltip-bg, var(--bg-surface-elevated));
  margin-top: -1px;
}

.ub-tooltip.below .ub-tooltip-arrow {
  bottom: 100%;
  border-bottom-color: var(--tooltip-bg, var(--bg-surface-elevated));
  margin-bottom: -1px;
}

.ub-tooltip-enter-active,
.ub-tooltip-leave-active {
  transition: opacity 0.15s ease;
}

.ub-tooltip-enter-from,
.ub-tooltip-leave-to {
  opacity: 0 !important;
}
</style>
