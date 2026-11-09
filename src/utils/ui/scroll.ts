/** The closest ancestor that scrolls its own content. */
function scrollContainerOf(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/**
 * Centres an element in its own scroll container only. `scrollIntoView` also scrolls
 * `overflow: hidden` ancestors when the container runs out of room, shifting the whole app shell.
 */
function scrollToCenter(element: HTMLElement) {
  const container = scrollContainerOf(element);
  if (!container) return;
  const box = container.getBoundingClientRect();
  const target = element.getBoundingClientRect();
  const top = container.scrollTop + target.top - box.top - (box.height - target.height) / 2;
  container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

export { scrollToCenter };
