/** Elements where the browser's own long-press menu (copy, paste) is still useful. */
const EDITABLE = 'input, textarea, [contenteditable="true"], .select-text';

/** Whether a long-press or right-click at this target should keep the browser menu. */
export function keepsContextMenu(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(EDITABLE) !== null;
}

/**
 * Till hardening, installed once at start-up: a long press on a button must not
 * open a browser menu, a dragged logo or link must not leave the app, and a
 * pinch must not zoom the whole UI (the till has its own text-size setting).
 * Skipped in development, where the menu is how the inspector is reached.
 */
export function installTouchGuards(isDev: boolean): void {
  if (isDev) return;
  window.addEventListener("contextmenu", (event) => {
    if (!keepsContextMenu(event.target)) event.preventDefault();
  });
  window.addEventListener("dragstart", (event) => {
    if (event.target instanceof HTMLImageElement || event.target instanceof HTMLAnchorElement) event.preventDefault();
  });
  // WebKit's pinch gesture events.
  window.addEventListener("gesturestart", (event) => event.preventDefault());
}
