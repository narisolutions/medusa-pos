import { StateCreator } from "zustand";
import { CartItem, DraftOrderMetadata, OrderDiscount} from "@/types/utils";
import { resolveSelectedItemId }  from "@/utils/cart";
import {DEFAULT_CART_METADATA } from "@/utils/cart"

export interface CartMetadataSlice {
  metadata: DraftOrderMetadata;
  setItemMetadata: (itemId: string, metadata: Partial<CartItem['metadata']>) => void;
  updateMetadata: (updates: Partial<DraftOrderMetadata>) => void;
  setCartMetadata: (metadata: DraftOrderMetadata) => void;
}

// This slice needs access to items from other slices
interface CartMetadataSliceDeps {
  items: CartItem[];
  selectedItemId: string | undefined;
}

export const createCartMetadataSlice: StateCreator<
  CartMetadataSlice & CartMetadataSliceDeps,
  [],
  [],
  CartMetadataSlice
> = (set) => ({
  metadata: { ...DEFAULT_CART_METADATA },

  setItemMetadata: (itemId: string, metadata: Partial<CartItem['metadata']>) => {
    set((state) => {
      const updatedItems = state.items.map((item) => {
        if (item.variant_id !== itemId) {
          return item;
        }

        const updatedMetadata = {
          ...(item.metadata || {}),
          ...metadata,
        };

        // If item_discount is being updated, adjust the unit_price
        if (metadata && 'item_discount' in metadata) {
          const discount = metadata.item_discount as OrderDiscount | null;
          
          // Get or store the original price
          let originalUnitPrice = item.metadata?.original_unit_price as number | undefined;
          if (!originalUnitPrice) {
            // First time applying discount - save current price as original
            originalUnitPrice = item.unit_price || 0;
            updatedMetadata.original_unit_price = originalUnitPrice;
          }

          let newUnitPrice = originalUnitPrice;

          if (discount && discount.value > 0) {
            // Apply discount to original price
            let discountAmount = 0;
            
            if (discount.type === "percent") {
              discountAmount = (originalUnitPrice * discount.value) / 100;
            } else {
              // Amount discount per unit
              discountAmount = discount.value;
            }
            
            // Don't let discount exceed the price
            discountAmount = Math.min(discountAmount, originalUnitPrice);
            newUnitPrice = originalUnitPrice - discountAmount;
          } else {
            // Discount removed or set to 0 - restore original price
            // Remove the discount metadata
            delete updatedMetadata.item_discount;
            // Remove the stored original price
            delete updatedMetadata.original_unit_price;
          }

          return {
            ...item,
            unit_price: newUnitPrice,
            metadata: updatedMetadata,
          };
        }

        return {
          ...item,
          metadata: updatedMetadata,
        };
      });

      const nextSelected = resolveSelectedItemId(updatedItems, [itemId]);

      return {
        items: updatedItems,
        selectedItemId: nextSelected,
      };
    });
  },

  updateMetadata: (updates: Partial<DraftOrderMetadata>) => {
    set((state) => ({
      metadata: { ...state.metadata, ...updates },
    }));
  },

  setCartMetadata: (newMetadata: DraftOrderMetadata) => {
    set({ metadata: newMetadata });
  },
});
