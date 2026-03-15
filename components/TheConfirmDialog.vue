<script setup lang="ts">
import { watch, nextTick, ref } from 'vue';
import { useConfirm } from '~/composables/useConfirm';

const { visible, options, handleConfirm, handleCancel } = useConfirm();

const dialogRef = ref<HTMLElement | null>(null);
const confirmBtnRef = ref<HTMLButtonElement | null>(null);
const cancelBtnRef = ref<HTMLButtonElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

watch(visible, (open) => {
  if (open) {
    previouslyFocused = document.activeElement as HTMLElement | null;
    document.querySelector('.app-container')?.setAttribute('inert', '');
    nextTick(() => {
      if (options.value.variant === 'danger') {
        cancelBtnRef.value?.focus();
      } else {
        confirmBtnRef.value?.focus();
      }
    });
  } else {
    document.querySelector('.app-container')?.removeAttribute('inert');
    previouslyFocused?.focus();
    previouslyFocused = null;
  }
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleCancel();
    return;
  }
  if (e.key !== 'Tab' || !dialogRef.value) return;

  const focusable = dialogRef.value.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div v-if="visible" class="confirm-overlay" @click.self="handleCancel" @keydown="onKeydown">
        <div ref="dialogRef" class="confirm-dialog" role="alertdialog" aria-modal="true">
          <h3 class="confirm-title">{{ options.title }}</h3>
          <p class="confirm-message">{{ options.message }}</p>
          <div class="confirm-actions">
            <button
              ref="cancelBtnRef"
              type="button"
              class="confirm-btn cancel"
              @click="handleCancel"
            >
              {{ options.cancelLabel || $t('common.cancel') }}
            </button>
            <button
              ref="confirmBtnRef"
              type="button"
              class="confirm-btn confirm"
              :class="options.variant || 'default'"
              @click="handleConfirm"
            >
              {{ options.confirmLabel || $t('common.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  padding: 1rem;
}

.confirm-dialog {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md), 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 1.5rem;
  max-width: 340px;
  width: 100%;
}

.confirm-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 0.5rem;
}

.confirm-message {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 1.25rem;
}

.confirm-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 0.6rem 1.2rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
}

.confirm-btn:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.confirm-btn.cancel {
  background: var(--bg-surface-elevated);
  color: var(--text-secondary);
}

.confirm-btn.cancel:hover {
  background: var(--border-color);
  color: var(--text-main);
}

.confirm-btn.confirm.default {
  background: var(--accent-gradient);
  color: white;
}

.confirm-btn.confirm.default:hover {
  background: var(--accent-gradient-hover);
}

.confirm-btn.confirm.danger {
  background: var(--danger-color);
  color: white;
}

.confirm-btn.confirm.danger:hover {
  background: #dc2626;
}

.confirm-btn.confirm.danger:focus-visible {
  outline-color: var(--danger-color);
}

.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-enter-active .confirm-dialog,
.confirm-leave-active .confirm-dialog {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}

.confirm-enter-from .confirm-dialog {
  transform: scale(0.95) translateY(8px);
}

.confirm-leave-to .confirm-dialog {
  transform: scale(0.95) translateY(8px);
}
</style>
