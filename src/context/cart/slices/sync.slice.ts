import { StateCreator } from "zustand";

export interface CartSyncSlice {
  isSynced: boolean;
  markAsSynced: () => void;
}

export const createCartSyncSlice: StateCreator<
  CartSyncSlice,
  [],
  [],
  CartSyncSlice
> = (set) => ({
  isSynced: false,
  
  markAsSynced: () => {
    set({ isSynced: true });
  },
});
