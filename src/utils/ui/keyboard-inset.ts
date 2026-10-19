import { logger } from "@/utils/logger";
import { scrollToCenter } from "@/utils/ui/scroll";

/**
 * Keeps `--keyboard-inset` on <html> at the height the on-screen keyboard covers. The browser's
 * own answer is to pan the whole page up (header and sidebar slide off the top) and leave dialogs
 * under the keyboard; instead the app shell and dialogs shrink to the space above it.
 */
function installKeyboardInset() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const root = document.documentElement;
  let current = 0;

  const update = () => {
    const inset = Math.max(0, Math.round(window.innerHeight - viewport.height));
    // The browser's pan: the layout now fits above the keyboard, so undo it.
    if (root.scrollTop !== 0 || window.scrollY !== 0) {
      root.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    if (inset === current) return;
    current = inset;
    root.style.setProperty("--keyboard-inset", `${inset}px`);
    if (inset > 0) root.dataset.keyboard = "open";
    else delete root.dataset.keyboard;
    void logger.info(`On-screen keyboard inset: ${inset}px`);
    const focused = document.activeElement;
    if (inset > 0 && focused instanceof HTMLElement) requestAnimationFrame(() => scrollToCenter(focused));
  };

  viewport.addEventListener("resize", update);
  viewport.addEventListener("scroll", update);
}

export { installKeyboardInset };
