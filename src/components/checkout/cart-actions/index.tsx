import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tile } from "@/components/ui/tile";
import { Banknote, Bookmark, Hash, MessageSquare, Percent, Trash2, User } from "lucide-react";
import { useTranslation } from "@/i18n";
import { useCartStore } from "@/context/cart";
import { formatPrice } from "@/utils/helpers";
import DiscountModal from "./discount-dialog";
import CommentModal from "./comment-dialog";
import QuantityModal from "./quantity-dialog";
import CustomerModal from "./customer-dialog";
import ParkModal from "./park-dialog";
import { useCheckout } from "../hooks";

const CartActions: React.FC = () => {
  const {
    items,
    loading,
    isPreparingPayment,
    handleOpenDrawer,
    handleOpenModal,
    handleClearItems,
    paymentMethods,
    setPaymentMethod,
    selectedPaymentMethod,
    customerEmail,
    orderComment,
    currency,
  } = useCheckout();

  const discountAmount = useCartStore((state) => state.getDiscountAmount());
  const total = useCartStore((state) => state.getTotalAfterDiscount());
  // Same test as the line's "Out of stock" badge, so a marked line is what blocks payment.
  const hasOutOfStockItem = items.some((item) => item.metadata?.available_quantity === 0);
  const isEmpty = items.length === 0;
  const { t } = useTranslation();
  const [isDiscountOpen, setDiscountOpen] = useState(false);
  const [isCommentOpen, setCommentOpen] = useState(false);
  const [isQtyOpen, setQtyOpen] = useState(false);
  const [isCustomerOpen, setCustomerOpen] = useState(false);
  const [isParkOpen, setParkOpen] = useState(false);

  return (
    <div className="flex flex-col h-full border border-theme-border bg-surface rounded-lg overflow-hidden">
      <div className="p-4 border-b border-theme-border bg-surface-muted flex-1 overflow-auto">
        <div className="grid grid-cols-3 gap-3">
          {paymentMethods.map(({ key, label, Icon }) => (
            <Tile
              key={key}
              size="lg"
              selected={selectedPaymentMethod === key}
              onClick={() => setPaymentMethod(key)}
              icon={<Icon className="size-8" />}
              label={<span className="wrap-break-word">{label}</span>}
            />
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-theme-border bg-surface flex flex-col gap-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Tile icon={<Hash />} label={t("checkout.quantity_button")} onClick={() => setQtyOpen(true)} />
          <Tile
            icon={<Percent />}
            label={t("checkout.discount_button")}
            subline={discountAmount > 0 ? `-${formatPrice(discountAmount, currency)}` : undefined}
            onClick={() => setDiscountOpen(true)}
          />
          <Tile
            icon={<MessageSquare />}
            label={t("checkout.comment_button")}
            subline={orderComment ? <span className="line-clamp-1 break-all">{orderComment}</span> : undefined}
            onClick={() => setCommentOpen(true)}
          />
          <Tile
            icon={<User />}
            label={t("checkout.customer_button")}
            subline={customerEmail ? <span className="line-clamp-1 break-all">{customerEmail}</span> : undefined}
            className={customerEmail ? "border-info bg-info-subtle" : undefined}
            onClick={() => setCustomerOpen(true)}
          />
          <Tile
            icon={<Bookmark />}
            label={t("checkout.park_button")}
            disabled={loading || isEmpty}
            onClick={() => setParkOpen(true)}
          />
          <Tile
            icon={<Trash2 className="text-danger-text" />}
            label={t("checkout.clear_cart_button")}
            disabled={loading || isEmpty}
            onClick={() => void handleClearItems()}
          />
          <Tile
            icon={<Banknote />}
            label={t("checkout.cash_drawer_button")}
            disabled
            onClick={() => void handleOpenDrawer()}
          />
        </div>

        <Button
          size="xl"
          variant="success"
          className="w-full"
          loading={isPreparingPayment}
          disabled={loading || isEmpty || hasOutOfStockItem}
          onClick={() => void handleOpenModal()}
        >
          {t("checkout.payment_button")}
          {!isEmpty && <span className="tabular-nums">· {formatPrice(total, currency)}</span>}
        </Button>
        {hasOutOfStockItem && (
          <p role="status" className="text-center text-base text-danger-text">
            {t("checkout.pay_blocked_out_of_stock")}
          </p>
        )}
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
      <ParkModal open={isParkOpen} onClose={() => setParkOpen(false)} />
    </div>
  );
};

export default CartActions;
