import { getSdk } from "@/config/medusa";
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

const useUser = create<IntitialState & Actions>((set) => ({
  ...initialState,
  setGlobalLoading: (globalLoading) => set({ globalLoading }),
  login: async (admin) => {
    set({ admin, isAuthenticated: true });

    await storage.setItem("last_login", Date.now());
  },
  logout: async () => {
    try {
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

export { useUser };
