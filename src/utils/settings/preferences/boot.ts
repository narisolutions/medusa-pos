type StoredPrefs = {
  display?: { startFullscreen?: boolean };
  appearance?: { themeMode?: string };
  language?: string;
};

function applyStoredTheme(themeMode: string | undefined) {
  const mode = themeMode ?? "system";
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (mode === "dark" || (mode === "system" && systemPrefersDark)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export const applyBootPreferences = async () => {
  if (!("__TAURI_INTERNALS__" in window)) return;

  try {
    const { Store } = await import("@tauri-apps/plugin-store");
    const store = await Store.load("pos-storage.json");
    const prefs = await store.get<StoredPrefs>("user_preferences");

    if (prefs?.display?.startFullscreen === false) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().setFullscreen(false);
    }

    applyStoredTheme(prefs?.appearance?.themeMode);

    const { i18next, resolveLocale } = await import("@/i18n");
    const locale = resolveLocale(prefs?.language ?? "system");
    if (i18next.language !== locale) {
      await i18next.changeLanguage(locale);
    }
  } catch {
    // No preference saved yet — keep native defaults
  }
};
