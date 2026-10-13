import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectContextValue {
  value: string
  /** The selected item's own content, so the closed trigger reads like the list. */
  label: React.ReactNode | undefined
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

/** The children of the item holding `value`, searched through the JSX passed to Select. */
function findItemLabel(node: React.ReactNode, value: string): React.ReactNode | undefined {
  let found: React.ReactNode | undefined
  React.Children.forEach(node, (child) => {
    if (found !== undefined || !React.isValidElement(child)) return
    const props = child.props as { value?: unknown; children?: React.ReactNode }
    if (child.type === SelectItem && props.value === value) found = props.children
    else if (props.children !== undefined) found = findItemLabel(props.children, value)
  })
  return found
}

function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(value || defaultValue || "")
  const rootRef = React.useRef<HTMLDivElement>(null)

  const currentValue = value !== undefined ? value : internalValue

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
    setOpen(false)
  }

  React.useEffect(() => {
    if (!open) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [open])

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        label: currentValue ? findItemLabel(children, currentValue) : undefined,
        onValueChange: handleValueChange,
        open,
        setOpen,
      }}
    >
      {/* min-w-0: inside a grid or flex cell the trigger keeps to its column, so long values end in "…". */}
      <div ref={rootRef} className="relative min-w-0">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<"button">) {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectTrigger must be used within Select")

  return (
    <button
      type="button"
      className={cn(
        "flex h-12 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => context.setOpen(!context.open)}
      {...props}
    >
      {children}
      <ChevronDownIcon className="h-4 w-4 opacity-50" />
    </button>
  )
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectValue must be used within Select")

  return <span className="min-w-0 flex-1 truncate text-left">{context.label ?? (context.value || placeholder)}</span>
}

function SelectContent({
  className,
  children,
  side = "bottom",
  ...props
}: React.ComponentProps<"div"> & {
  /** Which way the list opens relative to the trigger (mirrors the Radix API). */
  side?: "top" | "bottom"
}) {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectContent must be used within Select")

  if (!context.open) return null

  return (
    <div
      className={cn(
        "absolute z-50 max-h-60 w-full overflow-auto rounded-md border bg-surface text-fg shadow-md",
        side === "top" ? "bottom-full mb-1" : "top-full mt-1",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      <div className="p-1">
        {children}
      </div>
    </div>
  )
}

function SelectItem({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectItem must be used within Select")

  return (
    <div
      className={cn(
        "relative flex min-h-12 w-full cursor-default select-none items-center rounded-sm py-3 pl-3 pr-8 text-base outline-none",
        "hover:bg-accent hover:text-accent-foreground",
        "focus:bg-accent focus:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      onClick={() => context.onValueChange(value)}
      {...props}
    >
      {children}
    </div>
  )
}

function FormControl({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  FormControl,
}
