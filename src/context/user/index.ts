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
      // Start every authenticated session with fresh POS-plugin detection,
      // regardless of how the previous session ended (logout, 401, backend change).
      // Reset before flipping isAuthenticated so the detection query (which is
      // enabled on auth and has staleTime: Infinity) re-probes instead of serving
      // the previous session's cached result.
      const { resetPosPluginCache } = await import("@/utils/pos/plugin");
      resetPosPluginCache();
      const { queryClient } = await import("@/config/query");
      queryClient.removeQueries({ queryKey: ["pos-plugin-installed"] });

      set({ admin, isAuthenticated: true });
      await storage.setItem("last_login", Date.now());
    },
    logout: async () => {
      try {
        // Dynamic import breaks the static dependency on medusa.ts.
        // A static import would cause Vite to re-evaluate this module (and
        // reset the Zustand store to its initial state) whenever medusa.ts
        // changes during HMR, instantly logging the user out. 
        const { getSdk } = await import("@/config/medusa");
        const sdk = getSdk();
        await sdk.auth.logout();
      } catch {
        console.error("Error during SDK logout");
      }
      set({ admin: null, isAuthenticated: false });
      await storage.clear();

      // Reset session-scoped caches so the next login detects against its own
      // backend instead of leaking the previous user's result. Without this the
      // POS-plugin detection (and other server caches) survive logout, e.g. the
      // checkout "install plugin" banner would show the wrong state until refresh.
      // Dynamic imports keep this module free of static deps (see logout comment above).
      const { resetPosPluginCache } = await import("@/utils/pos/plugin");
      resetPosPluginCache();
      const { queryClient } = await import("@/config/query");
      queryClient.clear();
    },
    update: (admin) => {
      set({
        admin,
        isAuthenticated: !!admin,
      });
    },
  }));
}

// In dev, preserve the store instance across HMR re-evaluations of this module.
// Without this, directly editing context/user/index.ts would re-run create(),
// producing a new store with isAuthenticated:false and triggering a logout.
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
