import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { setWindowFullscreen } from "@/utils/ui/window";

function useFullscreenToggle() {
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;

    const handler = async (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        const win = getCurrentWindow();
        const isFullscreen = await win.isFullscreen();
        await setWindowFullscreen(!isFullscreen);
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}

export { useFullscreenToggle };
