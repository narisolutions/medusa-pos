import * as React from "react"
import { useState, useRef, useEffect } from "react"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n"
import { useVirtualKeyboard } from "@/context/virtual-keyboard"
import { scrollToCenter } from "@/utils/ui/scroll"

/**
 * Empties the field the way typing would, so React and form libraries see an ordinary change.
 * React tracks the value through the native setter, so assigning `.value` alone isn't seen.
 */
function clearNativeInput(el: HTMLInputElement) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, "")
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.focus()
}

type InputProps = React.ComponentProps<"input"> & {
  /** A 48px × button that empties the field while it has text. */
  clearable?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, onFocus, onBlur, onContextMenu, onChange, clearable, ...props }, ref) => {
  const { t } = useTranslation();
  const hasTextSize = className && /text-(xs|sm|base|lg|xl|\d+xl)/.test(className);
  const [typedText, setTypedText] = useState(Boolean(props.defaultValue));
  const hasText = props.value !== undefined ? String(props.value).length > 0 : typedText;
  const { needsVirtualKeyboard, toggleKeyboard } = useVirtualKeyboard();
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (needsVirtualKeyboard) {
      toggleKeyboard();
      // Scroll input into view so the keyboard doesn't hide it
      setTimeout(() => {
        scrollToCenter(e.target);
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

  const field = (
      <input
        ref={setRefs}
        type={type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input flex h-12 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          // 16px at the counter on every screen size (was 14px from md up).
          !hasTextSize && "text-base",
          clearable && "pr-12",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[1px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onContextMenu={handleContextMenu}
        onChange={(e) => {
          setTypedText(e.target.value.length > 0)
          onChange?.(e)
        }}
        {...props}
      />
  )

  return (
    <>
      {clearable ? (
        <div className="relative w-full">
          {field}
          {hasText && !props.disabled && !props.readOnly && (
            <button
              type="button"
              aria-label={t("ui.clear_input")}
              // Keep focus (and the on-screen keyboard) on the field.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => inputRef.current && clearNativeInput(inputRef.current)}
              // A round button inside the field; the 48px column stays the tap target.
              className="group absolute inset-y-0 right-0 flex w-12 items-center justify-center cursor-pointer"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-surface-subtle text-fg-muted transition-colors duration-100 group-hover:text-fg group-active:bg-accent group-active:text-fg">
                <X className="size-4" />
              </span>
            </button>
          )}
        </div>
      ) : (
        field
      )}
      {menuPos && (
        <div
          ref={menuRef}
          className="fixed z-[9999] min-w-[160px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <button
            type="button"
            className="relative flex min-h-tap w-full cursor-pointer select-none items-center rounded-sm px-4 text-base outline-none hover:bg-accent hover:text-accent-foreground active:bg-accent"
            onMouseDown={(e) => {
              e.preventDefault();
              toggleKeyboard();
              setMenuPos(null);
            }}
          >
            {t("ui.toggle_keyboard")}
          </button>
        </div>
      )}
    </>
  )
})
Input.displayName = "Input"

export { Input }
