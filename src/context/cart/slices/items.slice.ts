import { StateCreator } from "zustand";
import { AdminProductVariant } from "@medusajs/types";
import { CartItem, AddItemResult } from "@/types/utils";
import {
  buildItemMetadata,
  resolveSelectedItemId,
  DEFAULT_CART_METADATA,
  getVariantUnitPrice,
  getVariantAvailableQuantity,
} from "@/utils/pos/cart";

export interface CartItemsSlice {
  items: CartItem[];
  itemQuantity: number | null;
  selectedItemId: string | undefined;
  draftOrderId: string | null;
  setSelectedItemId: (id: string | undefined) => void;
  setItemQuantity: (quantity: number | null) => void;
  setItems: (items: CartItem[]) => void;
  setDraftOrderId: (id: string | null) => void;
  addItem: (variant: AdminProductVariant) => AddItemResult;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearItems: () => void;
  getDraftOrderId: () => string | null;
}

export const createCartItemsSlice: StateCreator<
  CartItemsSlice,
  [],
  [],
  CartItemsSlice
> = (set, get) => ({
  items: [],
  itemQuantity: null,
  selectedItemId: undefined,
  draftOrderId: null,

  setSelectedItemId: (id: string | undefined) => {
    set((state) =>
      state.selectedItemId === id ? state : { selectedItemId: id }
    );
  },

  setItemQuantity: (quantity: number | null) => {
    set({ itemQuantity: quantity });
  },

  setItems: (items: CartItem[]) => {
    set((state) => {
      const nextSelected = resolveSelectedItemId(items, [
        state.selectedItemId,
      ]);

      if (state.items === items && state.selectedItemId === nextSelected) {
        return state;
      }

      return {
        items,
        selectedItemId: nextSelected,
      };
    });
  },

  setDraftOrderId: (draftOrderId: string | null) => {
    set({ draftOrderId });
  },

  addItem: (variant: AdminProductVariant): AddItemResult => {
    const { items, itemQuantity } = get();
    const availableQty = getVariantAvailableQuantity(variant);

    // Check if product is out of stock only when inventory quantity is explicitly provided.
    if (availableQty === 0) {
      return {
        success: false,
        action: 'out_of_stock',
        quantityAdded: 0,
        message: 'Product is out of stock',
      };
    }

    const qtyToAdd = itemQuantity && itemQuantity > 0 ? itemQuantity : 1;
    const existingItemIndex = items.findIndex(
      (item) => item.variant_id === variant.id
    );

    // Check if trying to add more than available stock
    if (existingItemIndex >= 0) {
      const existingItem = items[existingItemIndex];
      const newTotalQty = existingItem.quantity + qtyToAdd;

      if (typeof availableQty === "number" && newTotalQty > availableQty) {
        return {
          success: false,
          action: 'insufficient_stock',
          quantityAdded: 0,
          message: `Only ${availableQty - existingItem.quantity} more available`,
        };
      }
    } else {
      // New item - check if requested quantity exceeds stock
      if (typeof availableQty === "number" && qtyToAdd > availableQty) {
        return {
          success: false,
          action: 'insufficient_stock',
          quantityAdded: 0,
          message: `Only ${availableQty} available`,
        };
      }
    }

    let updatedItems: CartItem[];
    let action: 'added' | 'increased';

    if (existingItemIndex >= 0) {
      action = 'increased';
      updatedItems = items.map((item, index) =>
        index === existingItemIndex
          ? { ...item, quantity: item.quantity + qtyToAdd }
          : item
      );
    } else {
      action = 'added';
      const metadata = buildItemMetadata(variant);

      const newItem: CartItem = {
        variant_id: variant.id,
        quantity: qtyToAdd,
        unit_price: getVariantUnitPrice(variant),
        title:
          variant.title === "Default variant"
            ? variant.product?.title
            : variant.title || "-",
        metadata,
      };
      updatedItems = [...items, newItem];
    }

    set((state) => {
      const nextSelected = resolveSelectedItemId(updatedItems, [
        state.selectedItemId,
        variant.id,
      ]);

      return {
        items: updatedItems,
        selectedItemId: nextSelected,
        itemQuantity: null,
      };
    });

    return {
      success: true,
      action,
      quantityAdded: qtyToAdd,
    };
  },

  updateItemQuantity: (itemId: string, quantity: number) => {
    const currentItem = get().items.find((item) => item.variant_id === itemId);
    
    if (!currentItem) return;

    // Check stock availability
    const availableQuantity = currentItem.metadata?.available_quantity as number | undefined;
    
    if (typeof availableQuantity === "number" && quantity > availableQuantity) {
      // Return early and let caller know the update failed
      throw new Error(`Cannot set quantity to ${quantity}. Only ${availableQuantity} available in stock.`);
    }

    set((state) => {
      const updatedItems = state.items
        .map((item) =>
          item.variant_id === itemId ? { ...item, quantity } : item
        )
        .filter((item) => item.quantity > 0);

      const nextSelected = resolveSelectedItemId(updatedItems, [itemId]);

      return {
        items: updatedItems,
        selectedItemId: nextSelected,
      };
    });
  },

  removeItem: (itemId: string) => {
    set((state) => {
      const updatedItems = state.items.filter(
        (item) => item.variant_id !== itemId
      );

      const nextSelected = resolveSelectedItemId(updatedItems, [
        state.selectedItemId === itemId ? undefined : state.selectedItemId,
      ]);

      return {
        items: updatedItems,
        selectedItemId: nextSelected,
      };
    });
  },

  clearItems: () => {
    set((state) => {
      if (state.items.length === 0 && state.selectedItemId === undefined) {
        return state;
      }

      return {
        items: [],
        selectedItemId: undefined,
        metadata: { ...DEFAULT_CART_METADATA },
      };
    });
  },

  getDraftOrderId: () => {
    const { draftOrderId } = get();
    return draftOrderId;
  },
});
