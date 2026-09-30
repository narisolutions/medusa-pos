import { CheckoutProvider, useCheckout } from "./hooks";
import ProductPicker from "@/components/base/product-picker";
import type { ProductPickerResult } from "@/components/base/product-picker/hooks";
import React from "react";
import { AdminProduct, AdminProductVariant } from "@medusajs/types";
import { useCartStore } from "@/context/cart";
import { useTranslation } from "@/i18n";
import PaymentDialog from "./payment-dialog";
import CartItems from "./cart-items";
import CartActions from "./cart-actions";

interface Props {
  products: AdminProduct[];
}

const CheckoutContent: React.FC<Props> = ({ products }) => {
  const { draftOrderId, isPaymentModalOpen, handleCloseModal, currency } =
    useCheckout();
  const addItem = useCartStore((state) => state.addItem);
  const { t } = useTranslation();

  const handleSelect = (variant: AdminProductVariant): ProductPickerResult => {
    const result = addItem(variant);
    if (!result.success) return { success: false, message: result.message };
    const title = variant.product?.title || variant.title;
    return {
      success: true,
      message:
        result.action === "added"
          ? t("checkout.item_added", { title })
          : t("checkout.quantity_increased", { title }),
    };
  };

  return (
    <div className="flex flex-col gap-4 h-full w-full">
      <ProductPicker products={products} currency={currency} onSelect={handleSelect} />
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
        <div className="col-span-2 min-h-0">
          <CartItems />
        </div>
        <div className="col-span-1 min-h-0">
          <CartActions />
        </div>
      </div>
      <PaymentDialog
        isOpen={isPaymentModalOpen}
        onClose={handleCloseModal}
        draftOrderId={draftOrderId}
      />
    </div>
  );
};

const Checkout: React.FC<Props> = (props) => (
  <CheckoutProvider>
    <CheckoutContent {...props} />
  </CheckoutProvider>
);

export default Checkout;
