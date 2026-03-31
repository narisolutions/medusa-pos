import * as React from "react"
import { useState, useRef, useEffect } from "react"

import { cn } from "@/lib/utils"
import { useVirtualKeyboard } from "@/context/virtual-keyboard"

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, onFocus, onBlur, onContextMenu, ...props }, ref) => {
  const hasTextSize = className && /text-(xs|sm|base|lg|xl|\d+xl)/.test(className);
  const { needsVirtualKeyboard, toggleKeyboard } = useVirtualKeyboard();
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (needsVirtualKeyboard) {
      toggleKeyboard();
      // Scroll input into view so the keyboard doesn't hide it
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(e);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    onContextMenu?.(e);
  };

  useEffect(() => {
    if (!menuPos) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuPos(null);
      }
    };
    const closeOnKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuPos(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnKey);
    };
  }, [menuPos]);

  // Merge refs
  const setRefs = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <>
      <input
        ref={setRefs}
        type={type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          !hasTextSize && "text-base md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onContextMenu={handleContextMenu}
        {...props}
      />
      {menuPos && (
        <div
          ref={menuRef}
          className="fixed z-[9999] min-w-[160px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <button
            type="button"
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onMouseDown={(e) => {
              e.preventDefault();
              toggleKeyboard();
              setMenuPos(null);
            }}
          >
            Toggle virtual keyboard
          </button>
        </div>
      )}
    </>
  )
})
Input.displayName = "Input"

export { Input }
