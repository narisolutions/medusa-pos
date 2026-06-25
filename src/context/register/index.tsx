import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import storage from "@/utils/storage";
import { loadPreferences, DEFAULT_PREFERENCES } from "@/utils/settings/preferences";
import type { RegisterPreferences } from "@/types/preferences";
import type {
  CashMovement,
  CashMovementType,
  RegisterSession,
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
  requirePinToClose: boolean;
  managerPinHash?: string;
  openRegister: (openingFloat: number) => Promise<void>;
  addMovement: (
    type: CashMovementType,
    amount: number,
    reason: string
  ) => Promise<void>;
  closeRegister: (input: CloseInput) => Promise<void>;
  /** Undo the most recent same-day close: resume the same session, no new float. */
  reopenRegister: () => Promise<void>;
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
    async ({ countedCash, expectedCash, note }: CloseInput) => {
      if (!session || session.status !== "open") return;
      const closed: RegisterSession = {
        ...session,
        status: "closed",
        closedAt: new Date().toISOString(),
        countedCash,
        expectedCash,
        difference: countedCash - expectedCash,
        note: note?.trim() ? note.trim() : undefined,
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
    },
    [session, persist]
  );

  const reopenRegister = useCallback(async () => {
    // Recoverable only while the closed session still belongs to the current
    // business day; a session closed on an earlier day is finished (the next-day
    // open flow owns it), so undoing it must not resurrect a stale shift.
    if (
      !session ||
      session.status !== "closed" ||
      computeNeedsOpen(session, config.dayCutoffHour, now)
    ) {
      return;
    }

    // Resume the SAME session (same id, float and movements) so orders stamped
    // during the shift stay attributed and expected cash continues seamlessly.
    const reopened: RegisterSession = {
      id: session.id,
      status: "open",
      openedAt: session.openedAt,
      openingFloat: session.openingFloat,
      movements: session.movements,
    };

    // Mark the just-archived close as voided rather than deleting it, so an
    // undone close still leaves the over/short on record (audit / anti-fraud).
    try {
      const history =
        (await storage.getItem<RegisterSession[]>(
          "closed_register_sessions"
        )) ?? [];
      await storage.setItem(
        "closed_register_sessions",
        history.map((s) =>
          s.id === session.id && s.closedAt === session.closedAt
            ? { ...s, voided: true, voidedAt: new Date().toISOString() }
            : s
        )
      );
    } catch {
      // History update is best-effort; the reopen itself must still proceed.
    }

    await persist(reopened);
  }, [session, config.dayCutoffHour, now, persist]);

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
      requirePinToClose: config.requirePinToClose,
      managerPinHash: config.managerPinHash,
      openRegister,
      addMovement,
      closeRegister,
      reopenRegister,
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
