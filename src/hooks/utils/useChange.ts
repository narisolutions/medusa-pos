import { useState } from "react";

// Fires `callback` synchronously during the render in which `value` changes.
// This is the React-recommended alternative to `useEffect(() => setState(...), [value])`
// for resetting derived state — it avoids the extra render cycle that effects produce.
// See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
export function useChange<T>(value: T, callback: () => void): void {
  const [prev, setPrev] = useState<T>(value);
  if (!Object.is(value, prev)) {
    setPrev(value);
    callback();
  }
}
