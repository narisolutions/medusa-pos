import { StateCreator } from "zustand";
import { CartItem, DiscountBreakdown, DraftOrderMetadata } from "@/types/utils";

export interface CartCalculationsSlice {
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotalAfterDiscount: () => number;
  getDiscountBreakdown: () => DiscountBreakdown;
  getManualDiscountAmount: () => number;
}

// This slice needs access to items and metadata from other slices
interface CartCalculationsSliceDeps {
  items: CartItem[];
  metadata: DraftOrderMetadata;
}

export const createCartCalculationsSlice: StateCreator<
  CartCalculationsSlice & CartCalculationsSliceDeps,
  [],
  [],
  CartCalculationsSlice
> = (_set, get) => ({
  getTotalItems: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.quantity, 0);
  },

  getTotalPrice: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      const price = item.unit_price || 0;
      return sum + price * item.quantity;
    }, 0);
  },

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      // Use original_price if available (before discount), otherwise use unit_price
      const originalPrice = item.metadata?.original_price as number | undefined;
      const price = originalPrice || item.unit_price || 0;
      return sum + price * item.quantity;
    }, 0);
  },

  /**
   * Calculate total discount amount from all sources:
   * 1. Backend discounts (original_price vs unit_price)
   * 2. Manual item-level discounts (from discount dialog)
   * 3. Manual order-level discount (from discount dialog, applied after item discounts)
   */
  getDiscountAmount: () => {
    const breakdown = get().getDiscountBreakdown();
    return breakdown.total;
  },

  getTotalAfterDiscount: () => {
    const { items, metadata } = get();
    
    // Sum of items (unit_price already includes manual item discounts)
    let total = items.reduce((sum, item) => {
      return sum + (item.unit_price || 0) * item.quantity;
    }, 0);

    // Apply order-level discount
    if (metadata.order_discount && metadata.order_discount.value) {
      let orderDiscountAmount = 0;
      
      if (metadata.order_discount.type === "percent") {
        orderDiscountAmount = (total * metadata.order_discount.value) / 100;
      } else {
        orderDiscountAmount = Math.min(metadata.order_discount.value, total);
      }
      
      total -= orderDiscountAmount;
    }

    return Math.max(0, total);
  },

  getDiscountBreakdown: () => {
    const { items, metadata } = get();
    
    // 1. Backend discounts (from price lists)
    const backendDiscount = items.reduce((sum, item) => {
      const originalPrice = item.metadata?.original_price as number | undefined;
      const originalUnitPrice = item.metadata?.original_unit_price as number | undefined;
      
      // Use original_unit_price if manual discount was applied, otherwise use unit_price
      const currentPrice = originalUnitPrice || item.unit_price || 0;
      
      if (originalPrice && originalPrice > currentPrice) {
        return sum + (originalPrice - currentPrice) * item.quantity;
      }
      return sum;
    }, 0);

    // 2. Manual item-level discounts (already applied to unit_price)
    const itemDiscounts = items.reduce((sum, item) => {
      const originalUnitPrice = item.metadata?.original_unit_price as number | undefined;
      
      if (!originalUnitPrice) return sum;
      
      const currentPrice = item.unit_price || 0;
      const discountPerUnit = originalUnitPrice - currentPrice;
      
      return sum + (discountPerUnit * item.quantity);
    }, 0);

    // 3. Manual order-level discount (applied on current total)
    let orderDiscount = 0;
    if (metadata.order_discount && metadata.order_discount.value) {
      // Calculate current total price (already includes item discounts in unit_price)
      const currentTotal = items.reduce((sum, item) => {
        return sum + (item.unit_price || 0) * item.quantity;
      }, 0);

      if (metadata.order_discount.type === "percent") {
        orderDiscount = (currentTotal * metadata.order_discount.value) / 100;
      } else {
        orderDiscount = Math.min(metadata.order_discount.value, currentTotal);
      }
    }

    return {
      backendDiscount,
      itemDiscounts,
      orderDiscount,
      total: backendDiscount + itemDiscounts + orderDiscount,
    };
  },

  getManualDiscountAmount: () => {
    const breakdown = get().getDiscountBreakdown();
    return breakdown.itemDiscounts + breakdown.orderDiscount;
  },
});
