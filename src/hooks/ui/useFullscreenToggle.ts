import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function useFullscreenToggle() {
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;

    const handler = async (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        const win = getCurrentWindow();
        const isFullscreen = await win.isFullscreen();
        await win.setFullscreen(!isFullscreen);
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
