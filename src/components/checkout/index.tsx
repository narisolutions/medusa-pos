import { CheckoutProvider, useCheckout } from "./hooks";
import CheckoutFilter from "./filter";
import React from "react";
import { AdminProduct } from "@medusajs/types";
import PaymentDialog from "./payment-dialog";
import CartItems from "./cart-items";
import CartActions from "./cart-actions";

interface Props {
  products: AdminProduct[];
}

const CheckoutContent: React.FC<Props> = ({ products }) => {
  const { draftOrderId, isPaymentModalOpen, handleCloseModal } = useCheckout();

  return (
    <div className="flex flex-col gap-4 h-full w-full">
      <CheckoutFilter products={products} />
      <div className="grid grid-cols-3 gap-4 h-[calc(100%-5rem)]">
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
