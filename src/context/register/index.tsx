import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import storage from "@/utils/storage";
import { fromMinorUnits, toMinorUnits } from "@/utils/pos/pricing";
import { loadPreferences, DEFAULT_PREFERENCES } from "@/utils/settings/preferences";
import type { RegisterPreferences } from "@/types/preferences";
import type {
  CashMovement,
  CashMovementType,
  RegisterSession,
  SessionReport,
} from "@/types/register";
import {
  isStaleSession,
  needsOpenRegister as computeNeedsOpen,
  newMovementId,
  newSessionId,
} from "@/utils/pos/register";

/**
 * Dispatched after register preferences are saved so the provider re-reads its
 * config without waiting for a visibility change. Settings can fire this with
 * `window.dispatchEvent(new Event(REGISTER_CONFIG_CHANGED_EVENT))`.
 */
export const REGISTER_CONFIG_CHANGED_EVENT = "register-config-changed";

const HISTORY_LIMIT = 100;

type CloseInput = {
  countedCash: number;
  expectedCash: number;
  note?: string;
  fiscalZRef?: string;
  report: SessionReport;
};

type RegisterContextValue = {
  /** Master switch (preferences.register.enabled). Everything is dormant when false. */
  enabled: boolean;
  loading: boolean;
  session: RegisterSession | null;
  /** An open session that belongs to the current business day. */
  isOpen: boolean;
  /** Blocking open dialog should be shown (only meaningful when enabled). */
  needsOpenRegister: boolean;
  /** Open session left over from a previous business day — must be reconciled first. */
  staleOpenSession: boolean;
  /** A session closed on the current business day that can be reopened (undo). */
  canReopen: boolean;
  cutoffHour: number;
  discrepancyThreshold: number;
  /** The till uses a cash register: the close asks for its Z number. */
  fiscalDevice: boolean;
  openRegister: (openingFloat: number) => Promise<void>;
  addMovement: (
    type: CashMovementType,
    amount: number,
    reason: string
  ) => Promise<void>;
  /** Resolves with the closed session (its frozen Z), or null when nothing was open. */
  closeRegister: (input: CloseInput) => Promise<RegisterSession | null>;
  /** After a same-day close: a new session whose float is the counted cash. */
  reopenRegister: () => Promise<void>;
  /** Records the Z's first paper print, so every later print says REPRINT. */
  markZPrinted: (sessionId: string) => Promise<void>;
};

const Context = createContext<RegisterContextValue | undefined>(undefined);

export function RegisterProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<RegisterPreferences>(
    DEFAULT_PREFERENCES.register
  );
  const [session, setSession] = useState<RegisterSession | null>(null);
  // Re-evaluated on visibility change to catch a business-day rollover that
  // happened while the app was backgrounded.
  const [now, setNow] = useState<Date>(() => new Date());

  const loadConfig = useCallback(async () => {
    const prefs = await loadPreferences();
    setConfig(prefs.register);
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const stored = await storage.getItem<RegisterSession>("register_session");
      // Corrupt / unparseable state resolves to "no open register" (safe path).
      setSession(stored && typeof stored === "object" ? stored : null);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([loadConfig(), loadSession()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConfig, loadSession]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(new Date());
    };
    const onConfigChanged = () => {
      void loadConfig();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(REGISTER_CONFIG_CHANGED_EVENT, onConfigChanged);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(REGISTER_CONFIG_CHANGED_EVENT, onConfigChanged);
    };
  }, [loadConfig]);

  const persist = useCallback(async (next: RegisterSession | null) => {
    setSession(next);
    if (next) await storage.setItem("register_session", next);
    else await storage.removeItem("register_session");
  }, []);

  const openRegister = useCallback(
    async (openingFloat: number) => {
      const next: RegisterSession = {
        id: newSessionId(),
        status: "open",
        openedAt: new Date().toISOString(),
        openingFloat,
        movements: [],
      };
      await persist(next);
    },
    [persist]
  );

  const addMovement = useCallback(
    async (type: CashMovementType, amount: number, reason: string) => {
      if (!session || session.status !== "open") return;
      const movement: CashMovement = {
        id: newMovementId(),
        type,
        amount,
        reason,
        at: new Date().toISOString(),
      };
      await persist({ ...session, movements: [...session.movements, movement] });
    },
    [session, persist]
  );

  const closeRegister = useCallback(
    async ({ countedCash, expectedCash, note, fiscalZRef, report }: CloseInput) => {
      if (!session || session.status !== "open") return null;
      const closed: RegisterSession = {
        ...session,
        status: "closed",
        closedAt: new Date().toISOString(),
        countedCash,
        expectedCash,
        difference: fromMinorUnits(toMinorUnits(countedCash) - toMinorUnits(expectedCash)),
        note: note?.trim() ? note.trim() : undefined,
        fiscalZRef: fiscalZRef?.trim() ? fiscalZRef.trim() : undefined,
        report,
      };

      // Archive to the bounded history BEFORE updating the current session, so a
      // subsequent re-open can never erase a recorded over/short.
      try {
        const history =
          (await storage.getItem<RegisterSession[]>(
            "closed_register_sessions"
          )) ?? [];
        await storage.setItem(
          "closed_register_sessions",
          [closed, ...history].slice(0, HISTORY_LIMIT)
        );
      } catch {
        // History append is best-effort; the close itself must still proceed.
      }

      // Keep the closed session as current so the same business day stays dormant
      // (no immediate re-prompt). The next business day re-triggers the open flow.
      await persist(closed);
      return closed;
    },
    [session, persist]
  );

  const reopenRegister = useCallback(async () => {
    // Only a close from the current business day; an earlier day's is owned by the next-day open.
    if (
      !session ||
      session.status !== "closed" ||
      computeNeedsOpen(session, config.dayCutoffHour, now)
    ) {
      return;
    }

    // A closed session is never resumed: its Z is already out. The drawer carries on from what was counted.
    await persist({
      id: newSessionId(),
      status: "open",
      openedAt: new Date().toISOString(),
      openingFloat: session.countedCash ?? 0,
      movements: [],
      reopenedFrom: session.id,
    });
  }, [session, config.dayCutoffHour, now, persist]);

  const markZPrinted = useCallback(
    async (sessionId: string) => {
      const printedAt = new Date().toISOString();
      try {
        const history =
          (await storage.getItem<RegisterSession[]>("closed_register_sessions")) ?? [];
        if (history.some((s) => s.id === sessionId && !s.zPrintedAt)) {
          await storage.setItem(
            "closed_register_sessions",
            history.map((s) => (s.id === sessionId && !s.zPrintedAt ? { ...s, zPrintedAt: printedAt } : s))
          );
        }
        // Read from storage: right after a close, this render's `session` is still the open one.
        const current = await storage.getItem<RegisterSession>("register_session");
        if (current?.id === sessionId && !current.zPrintedAt) {
          await persist({ ...current, zPrintedAt: printedAt });
        }
      } catch {
        // Best-effort like the history append: at worst the next print omits REPRINT.
      }
    },
    [persist]
  );

  const value = useMemo<RegisterContextValue>(() => {
    const enabled = config.enabled;
    const stale = !!session && isStaleSession(session, config.dayCutoffHour, now);
    const needsOpen = computeNeedsOpen(session, config.dayCutoffHour, now);
    return {
      enabled,
      loading,
      session,
      isOpen: enabled && session?.status === "open" && !stale,
      needsOpenRegister: enabled && needsOpen,
      staleOpenSession: enabled && session?.status === "open" && stale,
      // A same-day closed session (no fresh open needed yet) can be undone.
      canReopen: enabled && session?.status === "closed" && !needsOpen,
      cutoffHour: config.dayCutoffHour,
      discrepancyThreshold: config.discrepancyThreshold,
      fiscalDevice: config.fiscalDevice,
      openRegister,
      addMovement,
      closeRegister,
      reopenRegister,
      markZPrinted,
    };
  }, [
    config,
    session,
    now,
    loading,
    openRegister,
    addMovement,
    closeRegister,
    reopenRegister,
    markZPrinted,
  ]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRegister(): RegisterContextValue {
  const context = useContext(Context);
  if (!context) {
    throw new Error("useRegister must be used within a RegisterProvider");
  }
  return context;
}
