import { StateCreator } from "zustand";
import storage from "@/utils/storage";
import { CartItem, DraftOrderMetadata } from "@/types/utils";
import { resolveSelectedItemId, DEFAULT_CART_METADATA } from "@/utils/pos/cart";

export interface CartStorageSlice {
  saveToStorage: () => void;
  loadFromStorage: () => Promise<void>;
}

// This slice needs access to the full cart state
interface CartStorageSliceDeps {
  items: CartItem[];
  draftOrderId: string | null;
  metadata: DraftOrderMetadata;
  isSynced: boolean;
  selectedItemId: string | undefined;
}

export const createCartStorageSlice: StateCreator<
  CartStorageSlice & CartStorageSliceDeps,
  [],
  [],
  CartStorageSlice
> = (set, get) => {
  const saveToStorage = () => {
    const { draftOrderId, items, metadata, isSynced } = get();
    storage
      .setItem("cart", { draftOrderId, items, metadata, isSynced })
      .catch(console.error);
  };

  const loadFromStorage = async () => {
    try {
      // Try new format first
      const savedData = await storage.getItem<{
        items: CartItem[];
        draftOrderId: string | null;
        metadata: DraftOrderMetadata;
        isSynced?: boolean;
      }>("cart");

      if (savedData) {
        set((state) => {
          const restoredItems = savedData.items || [];
          const restoredDraftOrderId = savedData.draftOrderId || null;
          const restoredMetadata = savedData.metadata || {
            ...DEFAULT_CART_METADATA,
          };
          const restoredIsSynced = savedData.isSynced ?? false;
          const nextSelected = resolveSelectedItemId(restoredItems, [
            state.selectedItemId,
          ]);

          return {
            items: restoredItems,
            draftOrderId: restoredDraftOrderId,
            metadata: restoredMetadata,
            isSynced: restoredIsSynced,
            selectedItemId: nextSelected,
          };
        });
      }
    } catch (error) {
      console.error("Failed to load cart from storage:", error);
    }
  };

  // Load from storage on initialization
  loadFromStorage();

  return {
    saveToStorage,
    loadFromStorage,
  };
};
