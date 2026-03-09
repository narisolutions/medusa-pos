export const applyBootPreferences = async () => {
  if (!("__TAURI_INTERNALS__" in window)) return;

  try {
    const { Store } = await import("@tauri-apps/plugin-store");
    const store = await Store.load("pos-storage.json");
    const prefs = await store.get<{ display?: { startFullscreen?: boolean } }>("user_preferences");
    if (prefs?.display?.startFullscreen === false) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().setFullscreen(false);
    }
  } catch {
    // No preference saved yet — keep native default (fullscreen)
  }
};
