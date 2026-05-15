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
