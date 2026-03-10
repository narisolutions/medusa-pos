import { create } from "zustand";
import type { ThemeMode } from "@/types/preferences";

interface State {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useTheme = create<State>((set) => ({
  themeMode: "system",
  setThemeMode: (mode) => set({ themeMode: mode }),
}));
