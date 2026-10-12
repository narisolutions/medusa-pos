import type { DisplaySize } from "@/types/preferences";

/** Root font-size multipliers: every size in the app is in rem, so this scales it all. */
const DISPLAY_ZOOM: Record<DisplaySize, number> = {
  compact: 0.875,
  standard: 1,
  large: 1.125,
};

const displayZoom = (size: DisplaySize | undefined): number => (size && DISPLAY_ZOOM[size]) || 1;

/** Applies this till's display size on top of the store's font scale. */
const applyDisplaySize = (size: DisplaySize | undefined): void => {
  document.documentElement.style.setProperty("--display-zoom", String(displayZoom(size)));
};

export { applyDisplaySize, displayZoom };
