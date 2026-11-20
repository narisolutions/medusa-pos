import { getCurrentWindow } from "@tauri-apps/api/window";
import { CUSTOMER_DISPLAY_WINDOW } from "./transport";

/**
 * Whether this window is the customer display, read at boot before anything of the till
 * starts in it. The label is set in Rust when the window is made; nothing in a URL or in
 * storage can turn another window into one.
 */
export function isCustomerDisplayWindow(): boolean {
  // Outside Tauri (the browser dev server) there is no window to ask.
  if (!("__TAURI_INTERNALS__" in window)) return false;
  return getCurrentWindow().label === CUSTOMER_DISPLAY_WINDOW;
}
