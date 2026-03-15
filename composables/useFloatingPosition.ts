/**
 * Generic viewport-aware positioning for floating UI (popovers, tooltips, pickers).
 * Keeps the floating element within the visible viewport with configurable padding and gap.
 */

export type FloatingPositionOptions = {
  /** Minimum distance from viewport edges (px). */
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

/**
 * Computes top/left (and optional arrowLeft) so the floating element stays inside the viewport.
 * - Horizontal: centered on anchor, clamped to padding.
 * - Vertical: above or below anchor depending on space, then clamped to viewport.
 */
export function useFloatingPosition(options: FloatingPositionOptions = {}) {
  const padding = options.padding ?? DEFAULT_PADDING;
  const gap = options.gap ?? DEFAULT_GAP;
  const arrowInset = options.arrowInset;

  function position(anchorRect: DOMRect, floatingRect: DOMRect): FloatingPositionResult {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const centerX = anchorRect.left + anchorRect.width / 2;
    let left = centerX - floatingRect.width / 2;
    left = Math.max(padding, Math.min(vw - floatingRect.width - padding, left));

    const spaceAbove = anchorRect.top;
    const spaceBelow = vh - anchorRect.bottom;
    const goAbove = spaceAbove >= floatingRect.height + gap || spaceAbove >= spaceBelow;

    let top: number;
    const side: 'above' | 'below' = goAbove ? 'above' : 'below';
    if (goAbove) {
      top = anchorRect.top - floatingRect.height - gap;
    } else {
      top = anchorRect.bottom + gap;
    }
    top = Math.max(padding, Math.min(vh - floatingRect.height - padding, top));

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
