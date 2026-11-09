/**
 * Enters or leaves fullscreen. Leaving maximizes the window: its configured 1920×1080 is taller than
 * a 1080p screen's work area, which would hide the bottom (the Save bars) behind the taskbar.
 */
async function setWindowFullscreen(enabled: boolean): Promise<void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  await win.setFullscreen(enabled);
  if (!enabled) await win.maximize();
}

export { setWindowFullscreen };
