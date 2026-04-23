import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, User } from "lucide-react";
import { useTranslation } from "@/i18n";
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
  const { t } = useTranslation();
  const [isDiscountOpen, setDiscountOpen] = useState(false);
  const [isCommentOpen, setCommentOpen] = useState(false);
  const [isQtyOpen, setQtyOpen] = useState(false);
  const [isCustomerOpen, setCustomerOpen] = useState(false);

  return (
    <div className="flex flex-col h-full border border-theme-border bg-surface rounded-lg overflow-hidden">
      {/* payment methods */}
      <div className="p-4 border-b border-theme-border bg-surface-muted flex-1 overflow-auto">
        <div className="grid grid-cols-3 gap-3">
          {paymentMethods.map(({ key, label, Icon }) => (
            <Button
              key={key}
              onClick={() => setPaymentMethod(key)}
              className={`h-24 rounded-lg text-xl font-semibold transition-all ${selectedPaymentMethod === key
                  ? "bg-primary text-white shadow"
                  : "bg-surface border border-theme-border hover:bg-surface-hover text-fg"
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
      <div className="p-4 border-t border-theme-border bg-surface">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button
            onClick={() => setQtyOpen(true)}
            className="h-20 text-lg font-semibold whitespace-normal bg-surface border-2 border-theme-border hover:bg-surface-hover text-fg"
          >
            <span className="flex items-center gap-3">{t("checkout.quantity_button")}</span>
          </Button>
          <Button
            onClick={() => setDiscountOpen(true)}
            className="h-20 text-lg font-semibold whitespace-normal bg-surface border-2 border-theme-border hover:bg-surface-hover text-fg"
          >
            <span className="flex items-center gap-3">{t("checkout.discount_button")}</span>
          </Button>
          <Button
            onClick={() => setCommentOpen(true)}
            className="h-20 text-lg font-semibold whitespace-normal bg-surface border-2 border-theme-border hover:bg-surface-hover text-fg"
          >
            <span className="flex items-center gap-3">
              <MessageSquare className="size-5" /> {t("checkout.comment_button")}
            </span>
          </Button>
          <Button
            onClick={() => setCustomerOpen(true)}
            className={`h-20 text-lg font-semibold whitespace-normal border-2 ${customerEmail
                ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                : "bg-surface border-theme-border hover:bg-surface-hover text-fg"
              }`}
          >
            <span className="flex flex-col items-center justify-center gap-1 w-full px-1 leading-tight text-center text-base">
              <User className="size-5 shrink-0" />
              <span className="wrap-break-words w-full">{t("checkout.customer_button")}</span>
            </span>
          </Button>
          <Button
            onClick={() => void handleOpenDrawer()}
            disabled={true}
            className="h-20 text-lg font-semibold whitespace-normal bg-surface border-2 border-theme-border hover:bg-surface-hover text-fg"
          >
            <span className="flex items-center gap-3">{t("checkout.cash_drawer_button")}</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleClearItems()}
            disabled={loading || items.length === 0}
            className="h-20 text-lg font-semibold whitespace-normal"
          >
            {t("checkout.clear_cart_button")}
          </Button>
          <Button
            onClick={() => void handleOpenModal()}
            disabled={loading || items.length === 0}
            className="h-20 text-lg font-semibold whitespace-normal bg-green-600 hover:bg-green-700 text-white"
          >
            <span className="flex items-center justify-center gap-3">
              {t("checkout.payment_button")}
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
