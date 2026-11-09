import { useEffect, useState } from "react";

/** The current time, re-read every `intervalMs`, for "lost for 2 min"-style labels. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export { useNow };
