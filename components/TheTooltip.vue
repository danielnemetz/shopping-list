<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Tooltip text. When empty, tooltip is not shown. */
    content?: string | null;
    /** Delay before showing on hover (ms). */
    showDelay?: number;
    /** On touch: short tap = show tooltip, long press = emit long-press (e.g. to toggle). Threshold in ms. */
    longPressMs?: number;
  }>(),
  { content: '', showDelay: 400, longPressMs: 0 },
);

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'long-press'): void;
}>();

const visible = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);
const tooltipRef = ref<HTMLElement | null>(null);
const positioned = ref(false);
const tooltipStyle = ref<Record<string, string>>({});
const side = ref<'above' | 'below'>('above');

let showDelayId: ReturnType<typeof setTimeout> | null = null;
let hideDelayId: ReturnType<typeof setTimeout> | null = null;
let longPressId: ReturnType<typeof setTimeout> | null = null;
/** Consume next click (touch-generated) so trigger does not run (e.g. no accidental toggle). */
let consumeNextClick = false;

const VIEWPORT_PADDING = 8;
const GAP = 6;
const ARROW_INSET = 12;
const LONG_PRESS_MS = props.longPressMs > 0 ? props.longPressMs : 500;

const hasContent = () => typeof props.content === 'string' && props.content.trim().length > 0;
const hasLongPress = () => props.longPressMs > 0 && hasContent();

function updatePosition() {
  if (!wrapperRef.value || !tooltipRef.value || !import.meta.client) return;

  const anchor = wrapperRef.value.getBoundingClientRect();
  const tt = tooltipRef.value.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const centerX = anchor.left + anchor.width / 2;
  let left = centerX - tt.width / 2;
  left = Math.max(VIEWPORT_PADDING, Math.min(vw - tt.width - VIEWPORT_PADDING, left));

  const spaceAbove = anchor.top;
  const spaceBelow = vh - anchor.bottom;
  const goAbove = spaceAbove >= tt.height + GAP || spaceAbove >= spaceBelow;

  let top: number;
  if (goAbove) {
    top = anchor.top - tt.height - GAP;
    side.value = 'above';
  } else {
    top = anchor.bottom + GAP;
    side.value = 'below';
  }

  const arrowX = centerX - left;
  const arrowLeft = Math.max(ARROW_INSET, Math.min(tt.width - ARROW_INSET, arrowX));

  tooltipStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    '--arrow-left': `${arrowLeft}px`,
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
  emit('update:open', v);
});

function clearTimers() {
  if (showDelayId) {
    clearTimeout(showDelayId);
    showDelayId = null;
  }
  if (hideDelayId) {
    clearTimeout(hideDelayId);
    hideDelayId = null;
  }
  if (longPressId) {
    clearTimeout(longPressId);
    longPressId = null;
  }
}

function hide() {
  clearTimers();
  visible.value = false;
}

function onMouseEnter() {
  if (hideDelayId) {
    clearTimeout(hideDelayId);
    hideDelayId = null;
  }
  if (!hasContent()) return;
  if (showDelayId) return;
  showDelayId = setTimeout(() => {
    showDelayId = null;
    visible.value = true;
  }, props.showDelay);
}

function onMouseLeave() {
  if (showDelayId) {
    clearTimeout(showDelayId);
    showDelayId = null;
  }
  visible.value = false;
}

function onDocumentClick(e: MouseEvent) {
  if (!visible.value) return;
  if (wrapperRef.value?.contains(e.target as Node)) return;
  hide();
}

/** On touch: consume click so trigger does not run. Short tap = show tooltip; long press = emit, parent toggles. */
function onWrapperClick(e: MouseEvent) {
  if (!hasLongPress()) return;
  if (consumeNextClick) {
    e.preventDefault();
    e.stopPropagation();
    consumeNextClick = false;
    return;
  }
  if (visible.value) {
    e.preventDefault();
    e.stopPropagation();
    hide();
  }
}

function onTouchStart() {
  if (!hasLongPress()) return;
  if (longPressId) return;
  longPressId = setTimeout(() => {
    longPressId = null;
    emit('long-press');
    consumeNextClick = true;
  }, LONG_PRESS_MS);
}

function onTouchEnd() {
  if (longPressId) {
    clearTimeout(longPressId);
    longPressId = null;
    visible.value = true;
    consumeNextClick = true;
  }
}

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('click', onDocumentClick, true);
  }
});
onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('click', onDocumentClick, true);
  }
  clearTimers();
});
</script>

<template>
  <span
    ref="wrapperRef"
    class="tooltip-wrapper"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @touchstart.passive="onTouchStart"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
    @click.capture="onWrapperClick"
  >
    <slot />

    <Teleport to="body">
      <Transition name="tooltip">
        <div
          v-if="visible && hasContent()"
          ref="tooltipRef"
          class="the-tooltip"
          :class="[side, { positioned }]"
          role="tooltip"
          :style="tooltipStyle"
        >
          {{ content }}
          <span class="the-tooltip-arrow" aria-hidden="true" />
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.tooltip-wrapper {
  display: inline-flex;
}
</style>

<style>
.the-tooltip {
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

.the-tooltip.positioned {
  opacity: 1;
}

.the-tooltip-arrow {
  position: absolute;
  left: var(--arrow-left, 50%);
  transform: translateX(-50%);
  border: 6px solid transparent;
}

.the-tooltip.above .the-tooltip-arrow {
  top: 100%;
  border-top-color: var(--tooltip-bg, var(--bg-surface-elevated));
  margin-top: -1px;
}

.the-tooltip.below .the-tooltip-arrow {
  bottom: 100%;
  border-bottom-color: var(--tooltip-bg, var(--bg-surface-elevated));
  margin-bottom: -1px;
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0 !important;
}
</style>
