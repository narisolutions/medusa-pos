import { useEffect, useState } from "react";
import { useTheme } from "@/context/theme";
import { loadPreferences } from "@/utils/settings/preferences";
import { logger, safeStringify } from "@/utils/logger";

function applyThemeClass(mode: string, systemPrefersDark: boolean) {
  const html = document.documentElement;
  if (mode === "dark" || (mode === "system" && systemPrefersDark)) {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
}

function useApplyTheme() {
  const themeMode = useTheme((s) => s.themeMode);
  const setThemeMode = useTheme((s) => s.setThemeMode);
  const [loaded, setLoaded] = useState(false);

  // Load stored theme preference on mount
  useEffect(() => {
    let ignore = false;
    loadPreferences()
      .then((prefs) => {
        if (!ignore) setThemeMode(prefs.appearance?.themeMode ?? "system");
      })
      .catch((error) => void logger.warn(`Failed to load theme preference: ${safeStringify(error)}`))
      // Unreadable preferences still apply the default, rather than leaving the theme unset.
      .finally(() => {
        if (!ignore) setLoaded(true);
      });
    return () => { ignore = true; };
  }, [setThemeMode]);

  // Apply dark class and subscribe to system preference changes. Waits for the stored
  // preference so the default "system" never overwrites what boot already applied.
  useEffect(() => {
    if (!loaded) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyThemeClass(themeMode, mediaQuery.matches);
    apply();
    mediaQuery.addEventListener("change", apply);
    return () => mediaQuery.removeEventListener("change", apply);
  }, [themeMode, loaded]);
}

export { useApplyTheme };
