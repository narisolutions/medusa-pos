import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface VirtualKeyboardContext {
  needsVirtualKeyboard: boolean;
  toggleKeyboard: () => void;
}

const Context = createContext<VirtualKeyboardContext>({
  needsVirtualKeyboard: false,
  toggleKeyboard: () => {},
});

export function VirtualKeyboardProvider({ children }: { children: React.ReactNode }) {
  const [needsVirtualKeyboard, setNeedsVirtualKeyboard] = useState(false);

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

  const toggleKeyboard = useCallback(() => {
    invoke("toggle_virtual_keyboard").catch(() => {});
  }, []);

  return (
    <Context.Provider value={{ needsVirtualKeyboard, toggleKeyboard }}>
      {children}
    </Context.Provider>
  );
}

export const useVirtualKeyboard = () => useContext(Context);
