import { create, StateCreator } from "zustand";
import { createCartItemsSlice, CartItemsSlice } from "./slices/items.slice";
import {
  createCartMetadataSlice,
  CartMetadataSlice,
} from "./slices/metadata.slice";
import {
  createCartCalculationsSlice,
  CartCalculationsSlice,
} from "./slices/calculations.slice";
import { createCartSyncSlice, CartSyncSlice } from "./slices/sync.slice";
import {
  createCartStorageSlice,
  CartStorageSlice,
} from "./slices/storage.slice";

export type CartState = CartItemsSlice &
  CartMetadataSlice &
  CartCalculationsSlice &
  CartSyncSlice &
  CartStorageSlice;

// Storage persistence middleware
const withStoragePersistence =
  (config: StateCreator<CartState, [], []>): StateCreator<CartState, [], []> =>
  (set, get, store) => {
    const state = config(set, get, store);

    // Wrap mutations to trigger storage save and invalidate sync
    const wrapMutation = <TArgs extends unknown[], TResult>(
      fn: (...args: TArgs) => TResult,
      shouldInvalidateSync = true
    ) => {
      return (...args: TArgs): TResult => {
        const result = fn(...args);

        if (shouldInvalidateSync) {
          // Invalidate sync status after mutations
          set({ isSynced: false });
        }

        // Save to storage after state update
        const storeState = get();
        if (storeState.saveToStorage) {
          storeState.saveToStorage();
        }

        return result;
      };
    };

    return {
      ...state,
      addItem: wrapMutation(state.addItem),
      updateItemQuantity: wrapMutation(state.updateItemQuantity),
      removeItem: wrapMutation(state.removeItem),
      clearItems: wrapMutation(state.clearItems),
      setItems: wrapMutation(state.setItems),
      setItemMetadata: wrapMutation(state.setItemMetadata),
      updateMetadata: wrapMutation(state.updateMetadata),
      setCartMetadata: wrapMutation(state.setCartMetadata),
      setDraftOrderId: wrapMutation(state.setDraftOrderId, false),
      markAsSynced: () => {
        set({ isSynced: true });
        const storeState = get();
        if (storeState.saveToStorage) {
          storeState.saveToStorage();
        }
      },
    };
  };

const useCartStore = create<CartState>()(
  withStoragePersistence((...a) => ({
    ...createCartItemsSlice(...a),
    ...createCartMetadataSlice(...a),
    ...createCartCalculationsSlice(...a),
    ...createCartSyncSlice(...a),
    ...createCartStorageSlice(...a),
  }))
);

export { useCartStore };
