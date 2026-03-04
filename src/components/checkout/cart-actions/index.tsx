import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, User } from "lucide-react";
import DiscountModal from "./discount-dialog";
import CommentModal from "./comment-dialog";
import QuantityModal from "./quantity-dialog";
import CustomerModal from "./customer-dialog";
import { useCheckout } from "../hooks";

const CartActions: React.FC = () => {
  const {
    items,
    loading,
    handleOpenDrawer,
    handleOpenModal,
    handleClearItems,
    paymentMethods,
    setPaymentMethod,
    selectedPaymentMethod,
  } = useCheckout();

  const { customerEmail } = useCheckout();
  const [isDiscountOpen, setDiscountOpen] = useState(false);
  const [isCommentOpen, setCommentOpen] = useState(false);
  const [isQtyOpen, setQtyOpen] = useState(false);
  const [isCustomerOpen, setCustomerOpen] = useState(false);

  return (
    <div className="flex flex-col h-full border border-zinc-200 bg-white rounded-lg overflow-hidden">
      {/* payment methods */}
      <div className="p-4 border-b bg-gray-50 flex-1 overflow-auto">
        <div className="grid grid-cols-3 gap-3">
          {paymentMethods.map(({ key, label, Icon }) => (
            <Button
              key={key}
              onClick={() => setPaymentMethod(key)}
              className={`h-24 rounded-lg text-xl font-semibold transition-all ${
                selectedPaymentMethod === key
                  ? "bg-primary text-white shadow"
                  : "bg-white border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className="flex flex-col items-center justify-center gap-2">
                <Icon className="size-8" />
                {label}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Bottom: button grid */}
      <div className="p-4 border-t bg-white">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button
            onClick={() => setQtyOpen(true)}
            className="h-20 text-lg font-semibold bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <span className="flex items-center gap-3">Quantity</span>
          </Button>
          <Button
            onClick={() => setDiscountOpen(true)}
            className="h-20 text-lg font-semibold bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <span className="flex items-center gap-3">Discount</span>
          </Button>
          <Button
            onClick={() => setCommentOpen(true)}
            className="h-20 text-lg font-semibold bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <span className="flex items-center gap-3">
              <MessageSquare className="size-5" /> Comment
            </span>
          </Button>
          <Button
            onClick={() => setCustomerOpen(true)}
            className={`h-20 text-lg font-semibold border-2 ${
              customerEmail
                ? "bg-blue-50 border-blue-300 hover:bg-blue-100 text-blue-700"
                : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
            }`}
          >
            <span className="flex items-center gap-3">
              <User className="size-5" /> Customer
            </span>
          </Button>
          <Button
            onClick={() => void handleOpenDrawer()}
            disabled={true}
            className="h-20 text-lg font-semibold bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <span className="flex items-center gap-3">Cash drawer</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleClearItems()}
            disabled={loading || items.length === 0}
            className="h-20 text-lg font-semibold"
          >
            Clear cart
          </Button>
          <Button
            onClick={() => void handleOpenModal()}
            disabled={loading || items.length === 0}
            className="h-20 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white"
          >
            <span className="flex items-center justify-center gap-3">
              Payment
            </span>
          </Button>
        </div>
      </div>

      {/* Modals */}
      <DiscountModal
        open={isDiscountOpen}
        onClose={() => setDiscountOpen(false)}
      />
      <CommentModal
        open={isCommentOpen}
        onClose={() => setCommentOpen(false)}
      />
      <QuantityModal open={isQtyOpen} onClose={() => setQtyOpen(false)} />
      <CustomerModal
        open={isCustomerOpen}
        onClose={() => setCustomerOpen(false)}
      />
    </div>
  );
};

export default CartActions;
