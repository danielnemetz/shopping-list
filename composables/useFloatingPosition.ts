/**
 * Generic container-aware positioning for floating UI (popovers, tooltips, pickers).
 * Clamps floating elements within .app-container bounds (falls back to viewport).
 */

export type FloatingPositionOptions = {
  /** Minimum distance from container edges (px). */
  padding?: number;
  /** Gap between anchor and floating element (px). */
  gap?: number;
  /** If set, result includes arrowLeft for tooltip arrow (clamped to [arrowInset, width - arrowInset]). */
  arrowInset?: number;
};

export type FloatingPositionResult = {
  top: number;
  left: number;
  side: 'above' | 'below';
  /** Only present when arrowInset was passed; use for CSS --arrow-left. */
  arrowLeft?: number;
};

const DEFAULT_PADDING = 8;
const DEFAULT_GAP = 6;

function getBounds(): { left: number; top: number; right: number; bottom: number } {
  const container = typeof document !== 'undefined'
    ? document.querySelector('.app-container')
    : null;
  if (container) {
    const r = container.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  }
  return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
}

export function useFloatingPosition(options: FloatingPositionOptions = {}) {
  const padding = options.padding ?? DEFAULT_PADDING;
  const gap = options.gap ?? DEFAULT_GAP;
  const arrowInset = options.arrowInset;

  function position(anchorRect: DOMRect, floatingRect: DOMRect): FloatingPositionResult {
    const bounds = getBounds();

    const centerX = anchorRect.left + anchorRect.width / 2;
    let left = centerX - floatingRect.width / 2;
    left = Math.max(bounds.left + padding, Math.min(bounds.right - floatingRect.width - padding, left));

    const spaceAbove = anchorRect.top - bounds.top;
    const spaceBelow = bounds.bottom - anchorRect.bottom;
    const goAbove = spaceAbove >= floatingRect.height + gap || spaceAbove >= spaceBelow;

    let top: number;
    const side: 'above' | 'below' = goAbove ? 'above' : 'below';
    if (goAbove) {
      top = anchorRect.top - floatingRect.height - gap;
    } else {
      top = anchorRect.bottom + gap;
    }
    top = Math.max(bounds.top + padding, Math.min(bounds.bottom - floatingRect.height - padding, top));

    const result: FloatingPositionResult = { top, left, side };
    if (arrowInset != null && floatingRect.width > 0) {
      const arrowX = centerX - left;
      result.arrowLeft = Math.max(
        arrowInset,
        Math.min(floatingRect.width - arrowInset, arrowX),
      );
    }
    return result;
  }

  return { position };
}
