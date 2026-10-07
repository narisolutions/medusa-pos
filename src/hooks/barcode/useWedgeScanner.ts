import { useEffect, useRef } from "react";
import { playErrorSound } from "@/utils/sounds";
import constants from "@/utils/constants";
import { SCAN_MAX_GAP_MS, isEditableTarget, isScannerBurst } from "@/utils/pos/barcode/wedge";

interface UseWedgeScannerProps {
  onScan: (code: string) => void;
  /** The till's search box: typing anywhere else lands here, and scans into it are read. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  enabled?: boolean;
}

/** The same code twice inside this window is one scan the scanner repeated. */
const REPEAT_WINDOW_MS = 500;

/**
 * Reads a keyboard-wedge scanner, the counterpart of useSerialScanner. A burst of keys
 * ending in Enter is a scan whatever its characters; slower keys are typing, which is
 * routed into the search box. A pasted barcode outside a field is a scan too.
 */
const useWedgeScanner = ({ onScan, inputRef, enabled = true }: UseWedgeScannerProps) => {
  const onScanRef = useRef(onScan);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    onScanRef.current = onScan;
    enabledRef.current = enabled;
  });

  useEffect(() => {
    let buffer = "";
    let keyTimes: number[] = [];
    let lastCode = "";
    let lastCodeAt = 0;

    const emit = (code: string) => {
      const now = Date.now();
      if (code === lastCode && now - lastCodeAt < REPEAT_WINDOW_MS) return;
      lastCode = code;
      lastCodeAt = now;
      onScanRef.current(code);
    };

    const reset = () => {
      buffer = "";
      keyTimes = [];
    };

    // Capture phase: a scan's Enter is taken before the search box's own Enter handler,
    // so a code is submitted once, not once by each.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabledRef.current || event.ctrlKey || event.metaKey || event.altKey) return;

      const input = inputRef?.current ?? null;
      // Another field (a dialog, a form) is the operator's; a scan there is not ours.
      const isOurs = event.target === input || !isEditableTarget(event.target);
      if (!isOurs) {
        reset();
        return;
      }

      const now = performance.now();

      if (event.key === "Enter") {
        const isScan = isScannerBurst(keyTimes, now);
        const code = buffer.trim();
        reset();
        if (isScan && code) {
          event.preventDefault();
          event.stopPropagation();
          emit(code);
        }
        return;
      }

      if (event.key.length === 1) {
        if (keyTimes.length > 0 && now - keyTimes[keyTimes.length - 1] > SCAN_MAX_GAP_MS) {
          reset();
        }
        buffer += event.key;
        keyTimes.push(now);
        // Typing outside the search box goes into it; the key lands there as focus moves.
        if (event.target !== input) input?.focus();
        return;
      }

      if (event.key === "Backspace" && event.target !== input) input?.focus();
      reset();
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (!enabledRef.current) return;
      const text = event.clipboardData?.getData("text").trim() ?? "";
      if (!text) return;

      if (constants.CHECKOUT_CONFIG.BARCODE_VALIDATION_PATTERN.test(text)) {
        event.preventDefault();
        emit(text);
      } else if (!isEditableTarget(event.target)) {
        // Pasting text into a field is ordinary editing; outside one it was meant as a code.
        playErrorSound();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("paste", handlePaste);
    };
  }, [inputRef]);
};

export { useWedgeScanner };
