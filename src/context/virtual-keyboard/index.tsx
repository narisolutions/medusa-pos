import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface VirtualKeyboardContext {
  showKeyboard: () => void;
  hideKeyboard: () => void;
}

const Context = createContext<VirtualKeyboardContext>({
  showKeyboard: () => {},
  hideKeyboard: () => {},
});

export function VirtualKeyboardProvider({ children }: { children: React.ReactNode }) {
  const [needsVirtualKeyboard, setNeedsVirtualKeyboard] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    invoke<boolean>("check_physical_keyboard").then((has) => {
      setNeedsVirtualKeyboard(!has);
    });

    const unlisten = listen<boolean>("keyboard-state-changed", (event) => {
      setNeedsVirtualKeyboard(!event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const showKeyboard = useCallback(() => {
    if (!needsVirtualKeyboard) return;
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    invoke("show_virtual_keyboard").catch(() => {});
  }, [needsVirtualKeyboard]);

  const hideKeyboard = useCallback(() => {
    if (!needsVirtualKeyboard) return;
    hideTimer.current = setTimeout(() => {
      invoke("hide_virtual_keyboard").catch(() => {});
      hideTimer.current = null;
    }, 200);
  }, [needsVirtualKeyboard]);

  return (
    <Context.Provider value={{ showKeyboard, hideKeyboard }}>
      {children}
    </Context.Provider>
  );
}

export const useVirtualKeyboard = () => useContext(Context);
