import { logger } from "@/utils/logger";
import storage from "@/utils/storage";
import { AdminUser } from "@medusajs/types";
import { create } from "zustand";

interface IntitialState {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  globalLoading: boolean;
}

interface Actions {
  setGlobalLoading: (bool: boolean) => void;
  login(admin: AdminUser): Promise<void>;
  logout(): Promise<void>;
  update: (admin: AdminUser | null) => void;
}

const initialState: IntitialState = {
  admin: null,
  isAuthenticated: false,
  globalLoading: false,
};

function createUserStore() {
  return create<IntitialState & Actions>((set) => ({
    ...initialState,
    setGlobalLoading: (globalLoading) => set({ globalLoading }),
    login: async (admin) => {
      // Reset POS-plugin detection before flipping isAuthenticated so the
      // staleTime-Infinity probe re-runs instead of serving the last session's result.
      const { resetPosPluginCache } = await import("@/utils/pos/plugin");
      resetPosPluginCache();
      const { queryClient, queryKeys } = await import("@/config/query");
      queryClient.removeQueries({ queryKey: queryKeys.posPlugin });

      set({ admin, isAuthenticated: true });
      await storage.setItem("last_login", Date.now());
    },
    logout: async () => {
      try {
        // Dynamic import: a static dep on medusa.ts would make HMR re-evaluate this
        // module and reset the store (= instant logout) whenever medusa.ts changes.
        const { getSdk } = await import("@/config/medusa");
        const sdk = getSdk();
        await sdk.auth.logout();
      } catch {
        void logger.error("Error during SDK logout");
      }
      set({ admin: null, isAuthenticated: false });
      await storage.clear();

      // Reset session-scoped caches so the next login can't serve the previous
      // user's results (e.g. a stale POS-plugin banner).
      const { resetPosPluginCache } = await import("@/utils/pos/plugin");
      resetPosPluginCache();
      const { queryClient } = await import("@/config/query");
      queryClient.clear();
      // Drop the cached JWT so the next login doesn't reuse the previous session's token.
      const { clearAuthTokenCache } = await import("@/config/medusa");
      clearAuthTokenCache();
    },
    update: (admin) => {
      set({
        admin,
        isAuthenticated: !!admin,
      });
    },
  }));
}

// Dev-only: keep the store instance across HMR, or editing this file re-runs
// create() and logs the user out.
let useUser: ReturnType<typeof createUserStore>;

if (import.meta.env.DEV && import.meta.hot) {
  if (!import.meta.hot.data.store) {
    import.meta.hot.data.store = createUserStore();
  }
  useUser = import.meta.hot.data.store as ReturnType<typeof createUserStore>;
  import.meta.hot.accept();
} else {
  useUser = createUserStore();
}

export { useUser };
