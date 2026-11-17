import type { CartTotals } from "./map";

type CartGetters = {
  getTotalItems: () => number;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotalAfterDiscount: () => number;
};

/** The figures the till's own cart footer shows, from the same getters it reads. */
export function cartTotals(cart: CartGetters): CartTotals {
  return {
    itemCount: cart.getTotalItems(),
    subtotal: cart.getSubtotal(),
    discount: cart.getDiscountAmount(),
    total: cart.getTotalAfterDiscount(),
  };
}
