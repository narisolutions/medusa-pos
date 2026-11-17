import { useEffect, useRef, useState } from "react";
import type { DisplayFormat, DisplayState } from "@/types/customer-display";
import { changedLineKey, isStale, receiveState } from "@/utils/customer-display/receive";
import type { DisplayReceiver } from "@/utils/customer-display/transport";
import { initCurrencyPrefs } from "@/utils/settings/preferences/currency";
import { DEFAULT_PREFERENCES } from "@/utils/settings/preferences/defaults";
import { loadLocale, resolveLocale } from "@/i18n";
import { logger, safeStringify } from "@/utils/logger";

type Feed = { state: DisplayState | null; highlightKey?: string };

/** A refused screen is logged once per reason, not once per heartbeat. */
const REJECT_LOG_EVERY_MS = 60_000;

/** The till's look, applied to this window: money format, languages, theme and brand color. */
async function applyFormat(format: DisplayFormat, primaryColor: string | undefined): Promise<void> {
  initCurrencyPrefs({
    ...DEFAULT_PREFERENCES.currency,
    symbolPosition: format.symbolPosition,
    decimalSeparator: format.decimalSeparator,
  });
  document.documentElement.classList.toggle("dark", format.theme === "dark");
  if (primaryColor) document.documentElement.style.setProperty("--color-primary", primaryColor);
  else document.documentElement.style.removeProperty("--color-primary");
  const languages = format.language === "ka+en" ? ["ka", "en"] : [format.language];
  await Promise.all(languages.map((language) => loadLocale(resolveLocale(language))));
}

/**
 * Follows the till: listens first, then says hello, and drops to welcome when the till
 * goes quiet. A screen is shown only once its language and money format are in place,
 * so the first one, and the first after a settings change, never flashes the defaults.
 */
export function useCustomerDisplayFeed(receiver: DisplayReceiver): Feed {
  const [feed, setFeed] = useState<Feed>({ state: null });

  // Bookkeeping the till's messages are judged against; none of it is rendered.
  const accepted = useRef<DisplayState | null>(null);
  const highlight = useRef<string | undefined>(undefined);
  const lastAt = useRef(0);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;
    let formatKey = "";
    let ready: Promise<void> = Promise.resolve();
    const lastLogged = new Map<string, number>();

    const onMessage = (payload: unknown) => {
      const received = receiveState(accepted.current, payload);
      if ("ignored" in received) {
        if (received.ignored === "invalid" && Date.now() - (lastLogged.get(received.reason) ?? 0) > REJECT_LOG_EVERY_MS) {
          lastLogged.set(received.reason, Date.now());
          void logger.error(`Customer display refused a screen from the till: ${received.reason}`);
        }
        return;
      }
      const next = received.state;
      const previous = accepted.current;
      accepted.current = next;
      lastAt.current = Date.now();
      if ("lines" in next) {
        const previousLines = previous && "lines" in previous ? previous.lines : undefined;
        highlight.current = changedLineKey(previousLines, next.lines) ?? highlight.current;
      } else {
        highlight.current = undefined;
      }
      const highlightKey = highlight.current;

      const key = JSON.stringify([next.format, next.branding.primaryColor]);
      if (key !== formatKey) {
        formatKey = key;
        ready = ready
          .then(() => applyFormat(next.format, next.branding.primaryColor))
          .catch((error: unknown) => void logger.warn(`Customer display format not applied: ${safeStringify(error)}`));
      }
      // Shown in arrival order, each after the format it was sent with.
      void ready.then(() => {
        if (!cancelled && accepted.current && accepted.current.seq >= next.seq) setFeed({ state: next, highlightKey });
      });
    };

    receiver
      .subscribe(onMessage)
      .then((stop) => {
        if (cancelled) return stop();
        unlisten = stop;
        return receiver.hello();
      })
      .catch((error: unknown) => {
        // A window label missing from its capability fails only here, and silently otherwise.
        void logger.error(`Customer display cannot listen to the till: ${safeStringify(error)}`);
      });

    const watchdog = setInterval(() => {
      if (lastAt.current > 0 && isStale(lastAt.current, Date.now())) {
        lastAt.current = 0;
        accepted.current = null;
        highlight.current = undefined;
        setFeed({ state: null });
      }
    }, 1_000);

    return () => {
      cancelled = true;
      unlisten?.();
      clearInterval(watchdog);
    };
  }, [receiver]);

  return feed;
}
