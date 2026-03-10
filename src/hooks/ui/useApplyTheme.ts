import { useEffect } from "react";
import { useTheme } from "@/context/theme";
import { loadPreferences } from "@/utils/preferences";

function applyThemeClass(mode: string, systemPrefersDark: boolean) {
  const html = document.documentElement;
  if (mode === "dark" || (mode === "system" && systemPrefersDark)) {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
}

export default function useApplyTheme() {
  const themeMode = useTheme((s) => s.themeMode);
  const setThemeMode = useTheme((s) => s.setThemeMode);

  // Load stored theme preference on mount
  useEffect(() => {
    let ignore = false;
    loadPreferences().then((prefs) => {
      if (!ignore) setThemeMode(prefs.appearance?.themeMode ?? "system");
    });
    return () => { ignore = true; };
  }, [setThemeMode]);

  // Apply dark class and subscribe to system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyThemeClass(themeMode, mediaQuery.matches);
    apply();
    mediaQuery.addEventListener("change", apply);
    return () => mediaQuery.removeEventListener("change", apply);
  }, [themeMode]);
}
