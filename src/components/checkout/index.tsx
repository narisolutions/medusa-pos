import { CheckoutProvider, useCheckout } from "./hooks";
import ProductPicker from "@/components/base/product-picker";
import type { ProductPickerResult } from "@/components/base/product-picker/hooks";
import React, { useState } from "react";
import { LayoutGrid, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminProduct, AdminProductVariant } from "@medusajs/types";
import { useCartStore } from "@/context/cart";
import { useTranslation } from "@/i18n";
import PaymentDialog from "./payment-dialog";
import CartItems from "./cart-items";
import CartActions from "./cart-actions";
import CatalogPanel from "./catalog-panel";

interface Props {
  products: AdminProduct[];
}

const CheckoutContent: React.FC<Props> = ({ products }) => {
  const { draftOrderId, isPaymentModalOpen, handleCloseModal, currency } =
    useCheckout();
  const addItem = useCartStore((state) => state.addItem);
  const { t } = useTranslation();
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

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
      <ProductPicker
        products={products}
        currency={currency}
        onSelect={handleSelect}
        extraAction={
          <Button
            type="button"
            variant="outline"
            size="lg"
            aria-pressed={isCatalogOpen}
            onClick={() => setIsCatalogOpen((open) => !open)}
            className="h-14 min-w-48 px-6 text-lg font-medium"
          >
            {isCatalogOpen ? (
              <>
                <ShoppingCart className="size-6" />
                {t("checkout.catalog_show_cart")}
              </>
            ) : (
              <>
                <LayoutGrid className="size-6" />
                {t("checkout.catalog_button")}
              </>
            )}
          </Button>
        }
      />
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
        <div className="relative col-span-2 min-h-0">
          <CartItems />
          <CatalogPanel
            open={isCatalogOpen}
            onClose={() => setIsCatalogOpen(false)}
            products={products}
            onSelect={handleSelect}
          />
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
