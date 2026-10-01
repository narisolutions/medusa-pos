import { describe, it, expect, vi, afterEach } from "vitest";
import type { AdminUser } from "@medusajs/types";
import { bootApp, verifyOfflineSession, withTimeout, SESSION_CHECK_TIMEOUT_MS, type BootDeps } from "./bootApp";

const user = { id: "user_live" } as AdminUser;
const cachedAdmin = { id: "user_cached" } as AdminUser;
const httpError = (status?: number) => Object.assign(new Error("fail"), { status });

/** A boot that finds a saved login and a reachable backend, with everything recorded in order. */
const setup = (over: Partial<BootDeps> = {}) => {
  const calls: string[] = [];
  const rec = <T extends unknown[]>(name: string, impl?: (...a: T) => unknown) =>
    vi.fn(async (...a: T) => {
      calls.push(name);
      return impl?.(...a);
    });
  const deps = {
    loadStores: rec("loadStores"),
    getActiveBackendUrl: vi.fn(() => "https://backend"),
    readCachedTheme: rec("readCachedTheme", () => ({ primaryColor: "#fff" })),
    applyTheme: vi.fn(() => void calls.push("applyTheme")),
    readLastLogin: rec("readLastLogin", () => 123),
    fetchMe: rec("fetchMe", () => user),
    readCachedAdmin: rec("readCachedAdmin", () => cachedAdmin),
    runPostAuthInit: rec("runPostAuthInit"),
    logout: rec("logout"),
    setUser: vi.fn(),
    setMessage: vi.fn(),
    notify: vi.fn(),
    logError: vi.fn(),
    isSuperseded: vi.fn(() => false),
    ...over,
  } as unknown as BootDeps;
  return { deps, calls };
};

describe("bootApp", () => {
  it("applies the cached theme before asking the backend, then restores the session", async () => {
    const { deps, calls } = setup();
    const result = await bootApp(deps);

    expect(result).toEqual({ offlineSession: false });
    expect(calls.indexOf("applyTheme")).toBeLessThan(calls.indexOf("fetchMe"));
    expect(deps.setUser).toHaveBeenCalledWith(user);
    expect(calls).toContain("runPostAuthInit");
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it("asks for store setup when there is no active store", async () => {
    const { deps, calls } = setup({ getActiveBackendUrl: vi.fn(() => undefined) });
    await bootApp(deps);

    expect(deps.setUser).toHaveBeenCalledWith(null);
    expect(calls).not.toContain("fetchMe");
  });

  it("stops at the sign-in screen when nobody was logged in", async () => {
    const { deps, calls } = setup({ readLastLogin: vi.fn(async () => undefined) });
    await bootApp(deps);

    expect(calls).not.toContain("fetchMe");
    expect(calls).not.toContain("runPostAuthInit");
    expect(deps.setUser).not.toHaveBeenCalled();
  });

  it("ends the login on a 401, and does not run the post-auth init", async () => {
    const { deps, calls } = setup({ fetchMe: vi.fn(async () => { throw httpError(401); }) });
    await bootApp(deps);

    expect(deps.setUser).toHaveBeenCalledWith(null);
    expect(deps.notify).toHaveBeenCalledWith("session_expired", "error");
    expect(deps.logout).toHaveBeenCalled();
    expect(calls).not.toContain("runPostAuthInit");
    expect(calls).not.toContain("readCachedAdmin");
  });

  it.each([[undefined], [502], [503]])(
    "keeps the saved session through an unreachable backend (status %s)",
    async (status) => {
      const { deps, calls } = setup({ fetchMe: vi.fn(async () => { throw httpError(status); }) });
      const result = await bootApp(deps);

      expect(deps.setUser).toHaveBeenCalledWith(cachedAdmin);
      expect(deps.notify).toHaveBeenCalledWith("restored_offline", "info");
      expect(result).toEqual({ offlineSession: true });
      expect(deps.logout).not.toHaveBeenCalled();
      expect(calls).toContain("runPostAuthInit");
    }
  );

  it("shows sign-in, without wiping anything, when the backend is down and nothing is cached", async () => {
    const { deps, calls } = setup({
      fetchMe: vi.fn(async () => { throw httpError(undefined); }),
      readCachedAdmin: vi.fn(async () => undefined),
    });
    await bootApp(deps);

    expect(deps.setUser).toHaveBeenCalledWith(null);
    expect(deps.notify).toHaveBeenCalledWith("user_fetch_failed", "error");
    expect(deps.logout).not.toHaveBeenCalled();
    expect(calls).not.toContain("runPostAuthInit");
  });

  it("does not trust the cache after a rejection that is not an outage (403)", async () => {
    const { deps, calls } = setup({ fetchMe: vi.fn(async () => { throw httpError(403); }) });
    await bootApp(deps);

    expect(deps.setUser).toHaveBeenCalledWith(null);
    expect(deps.notify).toHaveBeenCalledWith("user_fetch_failed", "error");
    expect(calls).not.toContain("readCachedAdmin");
  });

  it("keeps the session when the startup itself fails", async () => {
    const boom = new Error("storage unreadable");
    const { deps } = setup({ loadStores: vi.fn(async () => { throw boom; }) });
    await bootApp(deps);

    expect(deps.logError).toHaveBeenCalledWith(boom);
    expect(deps.setUser).toHaveBeenCalledWith(null);
    expect(deps.notify).toHaveBeenCalledWith("init_failed", "error");
    expect(deps.logout).not.toHaveBeenCalled();
  });

  it("leaves everything alone once a retry has replaced the run", async () => {
    const { deps, calls } = setup({ isSuperseded: vi.fn(() => true) });
    await bootApp(deps);

    expect(calls).toEqual(["loadStores"]);
    expect(deps.setUser).not.toHaveBeenCalled();
  });

  it("does not sign the user out when a replaced run's request fails late", async () => {
    let superseded = false;
    const { deps } = setup({
      isSuperseded: vi.fn(() => superseded),
      fetchMe: vi.fn(async () => {
        superseded = true;
        throw httpError(401);
      }),
    });
    await bootApp(deps);

    expect(deps.logout).not.toHaveBeenCalled();
    expect(deps.setUser).not.toHaveBeenCalledWith(null);
    expect(deps.notify).not.toHaveBeenCalled();
  });
});

describe("verifyOfflineSession", () => {
  const pick = (deps: BootDeps) => ({
    fetchMe: deps.fetchMe,
    setUser: deps.setUser,
    notify: deps.notify,
    logout: deps.logout,
    runPostAuthInit: deps.runPostAuthInit,
  });

  it("swaps in the real user and runs the init that was skipped once the backend answers", async () => {
    const { deps, calls } = setup();
    expect(await verifyOfflineSession(pick(deps))).toBe("verified");

    expect(deps.setUser).toHaveBeenCalledWith(user);
    expect(calls).toContain("runPostAuthInit");
  });

  it("ends the session when the backend rejects the saved token", async () => {
    const { deps } = setup({ fetchMe: vi.fn(async () => { throw httpError(401); }) });
    expect(await verifyOfflineSession(pick(deps))).toBe("expired");

    expect(deps.setUser).toHaveBeenCalledWith(null);
    expect(deps.notify).toHaveBeenCalledWith("session_expired", "error");
    expect(deps.logout).toHaveBeenCalled();
  });

  it.each([[undefined], [503]])("waits and changes nothing while still unreachable (status %s)", async (status) => {
    const { deps, calls } = setup({ fetchMe: vi.fn(async () => { throw httpError(status); }) });
    expect(await verifyOfflineSession(pick(deps))).toBe("pending");

    expect(deps.setUser).not.toHaveBeenCalled();
    expect(deps.logout).not.toHaveBeenCalled();
    expect(calls).not.toContain("runPostAuthInit");
  });
});

describe("a backend that hangs instead of answering", () => {
  afterEach(() => vi.useRealTimers());

  const hangs = () => new Promise<AdminUser>(() => {});

  it("falls back to the saved session once the check times out", async () => {
    vi.useFakeTimers();
    const { deps } = setup({ fetchMe: vi.fn(hangs) });
    const boot = bootApp(deps);
    await vi.advanceTimersByTimeAsync(SESSION_CHECK_TIMEOUT_MS);

    expect(await boot).toEqual({ offlineSession: true });
    expect(deps.setUser).toHaveBeenCalledWith(cachedAdmin);
    expect(deps.logout).not.toHaveBeenCalled();
  });

  it("does not leave a re-check stuck waiting for ever", async () => {
    vi.useFakeTimers();
    const { deps } = setup({ fetchMe: vi.fn(hangs) });
    const check = verifyOfflineSession({
      fetchMe: deps.fetchMe,
      setUser: deps.setUser,
      notify: deps.notify,
      logout: deps.logout,
      runPostAuthInit: deps.runPostAuthInit,
    });
    await vi.advanceTimersByTimeAsync(SESSION_CHECK_TIMEOUT_MS);

    expect(await check).toBe("pending");
  });
});

describe("withTimeout", () => {
  afterEach(() => vi.useRealTimers());

  it("passes a result or an error through, and stops its timer", async () => {
    vi.useFakeTimers();
    expect(await withTimeout(Promise.resolve(7), 1000)).toBe(7);
    await expect(withTimeout(Promise.reject(new Error("boom")), 1000)).rejects.toThrow("boom");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects without a status when the time is up", async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise<never>(() => {}), 1000);
    const caught = pending.catch((e) => e);
    await vi.advanceTimersByTimeAsync(1000);
    const error = await caught;

    expect((error as { status?: number }).status).toBeUndefined();
    expect((error as Error).message).toBe("Request timed out");
  });
});
