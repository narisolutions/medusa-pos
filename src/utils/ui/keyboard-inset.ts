import { logger } from "@/utils/logger";
import { scrollToCenter } from "@/utils/ui/scroll";

// Chromium's VirtualKeyboard API (WebView2); not in TypeScript's DOM types yet.
type VirtualKeyboard = EventTarget & { overlaysContent: boolean; boundingRect: DOMRect };

/**
 * Keeps `--keyboard-inset` on <html> at the height the on-screen keyboard covers. Left alone, the
 * browser pans the whole page up (header and sidebar slide off the top) and leaves dialogs under
 * the keyboard; instead the app shell and dialogs shrink to the space above it.
 */
function installKeyboardInset() {
  const viewport = window.visualViewport;
  const keyboard = (navigator as Navigator & { virtualKeyboard?: VirtualKeyboard }).virtualKeyboard;
  const root = document.documentElement;
  let fromKeyboard = 0;
  let fromViewport = 0;
  let current = 0;

  const apply = () => {
    // Any pan the browser still made: the layout fits above the keyboard, so undo it.
    if (window.scrollY !== 0 || root.scrollTop !== 0 || (viewport?.offsetTop ?? 0) !== 0) {
      root.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    const inset = Math.max(fromKeyboard, fromViewport);
    if (inset === current) return;
    current = inset;
    root.style.setProperty("--keyboard-inset", `${inset}px`);
    if (inset > 0) root.dataset.keyboard = "open";
    else delete root.dataset.keyboard;
    void logger.info(`On-screen keyboard inset: ${inset}px (keyboard API ${fromKeyboard}, viewport ${fromViewport})`);
    const focused = document.activeElement;
    if (inset > 0 && focused instanceof HTMLElement) requestAnimationFrame(() => scrollToCenter(focused));
  };

  if (keyboard) {
    // The browser stops resizing and panning for the keyboard and reports its size instead.
    keyboard.overlaysContent = true;
    keyboard.addEventListener("geometrychange", () => {
      fromKeyboard = Math.max(0, Math.round(keyboard.boundingRect.height));
      apply();
    });
  }
  if (viewport) {
    const onViewport = () => {
      fromViewport = Math.max(0, Math.round(window.innerHeight - viewport.height));
      apply();
    };
    viewport.addEventListener("resize", onViewport);
    viewport.addEventListener("scroll", onViewport);
  }
}

export { installKeyboardInset };
