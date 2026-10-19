import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollToCenter } from "@/utils/ui/scroll";

const HIGHLIGHT_MS = 2500;
// A section may still be loading its data when the search opens it.
const WAIT_MS = 3000;

/** After a settings search hit, scrolls its field into view and briefly highlights it. */
function useSettingHighlight() {
  const location = useLocation();
  const setting = (location.state as { setting?: string } | null)?.setting;

  useEffect(() => {
    if (!setting) return;
    let target: HTMLElement | null = null;
    let clearTimer: number | undefined;
    const started = Date.now();

    const poll = window.setInterval(() => {
      target = document.querySelector<HTMLElement>(`[data-setting="${CSS.escape(setting)}"]`);
      if (!target && Date.now() - started < WAIT_MS) return;
      window.clearInterval(poll);
      if (!target) return;
      scrollToCenter(target);
      target.setAttribute("data-highlighted", "");
      clearTimer = window.setTimeout(() => target?.removeAttribute("data-highlighted"), HIGHLIGHT_MS);
    }, 100);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(clearTimer);
      target?.removeAttribute("data-highlighted");
    };
  }, [setting, location.key]);
}

export { useSettingHighlight };
