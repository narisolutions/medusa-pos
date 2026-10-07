// A keyboard-wedge scanner types a whole code in a few milliseconds and ends with Enter;
// a person types each key tens of milliseconds apart. Timing tells them apart, so any
// code — digits, a SKU, a QR or GS1 payload — is read as a scan, not as search text.

/** Longest gap between two keys of one scan. Scanners send keys 1–20 ms apart. */
const SCAN_MAX_GAP_MS = 35;
/** Shortest code read as a scan, so a fast typist's short word never triggers a lookup. */
const SCAN_MIN_LENGTH = 6;

/** True when keys pressed at these times, then Enter at `enterAt`, came from a scanner. */
const isScannerBurst = (keyTimes: number[], enterAt: number): boolean => {
  if (keyTimes.length < SCAN_MIN_LENGTH) return false;
  const times = [...keyTimes, enterAt];
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] > SCAN_MAX_GAP_MS) return false;
  }
  return true;
};

/** Whether keys pressed in this element are the operator typing into a field. */
const isEditableTarget = (target: EventTarget | null): boolean => {
  const element = target as { tagName?: string; isContentEditable?: boolean } | null;
  return (
    !!element &&
    (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || !!element.isContentEditable)
  );
};

export { SCAN_MAX_GAP_MS, SCAN_MIN_LENGTH, isScannerBurst, isEditableTarget };
