import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDraftOrder } from "@/hooks/draft-order/useDraftOrder";
import { useCartStore } from "@/context/cart";
import { useQueryRegion } from "@/hooks/queries/useQueryRegion";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { getPaymentMethods, getGuestCustomerEmail } from "@/utils/settings/store/metadata";
import storage from "@/utils/storage";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import Payments from "@/assets/icons/payments";
import CardIcon from "@/assets/icons/card";

import {
  CartItem,
  DraftOrderMetadata,
  OrderDiscount,
  PaymentMethod,
} from "@/types/utils";
import {
  cashDrawerIssueStaffHintToast,
  handleErrorToast,
} from "@/utils/helpers";

type PaymentMethodOption = {
  key: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const iconMap = {
  cash: Payments,
  card: CardIcon,
} as const;

function toPaymentMethodOptions(
  configs: ReturnType<typeof getPaymentMethods>
): PaymentMethodOption[] {
  return configs.map((p) => ({
    key: p.id,
    label: p.label,
    Icon: iconMap[p.icon ?? "card"] ?? CardIcon,
  }));
}

type CheckoutContextValue = {
  items: CartItem[];
  draftOrderId: string | null;
  loading: boolean;
  currency: string;
  isPaymentModalOpen: boolean;
  handleOpenModal: () => Promise<void>;
  handleCloseModal: () => void;
  handleClearItems: () => Promise<void>;
  handleRemoveItem: (itemId: string) => void;
  handleQuantityChange: (itemId: string, delta: number) => void;
  getTotal: () => number;
  selectedItemId: string | undefined;
  setSelectedItemId: (id: string | undefined) => void;
  draftOrderMetaData: DraftOrderMetadata;
  orderComment: string;
  setOrderComment: (comment: string) => void;
  orderDiscount: OrderDiscount | null;
  setOrderDiscount: (discount: OrderDiscount | null) => void;
  paymentMethods: PaymentMethodOption[];
  selectedPaymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  handleOpenDrawer: () => Promise<void>;
  setItemMetadata: (
    itemId: string,
    metadata: Partial<CartItem["metadata"]>
  ) => void;
  customerEmail: string | null;
  setCustomerEmail: (email: string | null) => void;
  attachCustomerToDraftOrder: (
    customerId: string | null,
    email: string | null
  ) => Promise<void>;
  promoCodes: string[];
  applyPromoCode: (code: string) => Promise<void>;
  removePromoCode: (code: string) => Promise<void>;
};

const CheckoutContext = createContext<CheckoutContextValue | undefined>(
  undefined
);

const useProvideCheckout = (): CheckoutContextValue => {
  const { data: store } = useQueryStore();
  const paymentMethodOptions = useMemo(
    () => toPaymentMethodOptions(getPaymentMethods(store)),
    [store]
  );
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const items = useCartStore((state) => state.items);
  const draftOrderId = useCartStore((state) => state.draftOrderId);
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearItems = useCartStore((state) => state.clearItems);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const setSelectedItemId = useCartStore((state) => state.setSelectedItemId);
  const selectedItemId = useCartStore((state) => state.selectedItemId);
  const setItemMetadata = useCartStore((state) => state.setItemMetadata);
  const metadata = useCartStore((state) => state.metadata);
  const updateMetadata = useCartStore((state) => state.updateMetadata);
  const isSynced = useCartStore((state) => state.isSynced);

  const {
    isLoading,
    syncLocalChangesToDraftOrder,
    createDraftOrder,
    deleteDraftOrder,
    updateDraftOrderCustomer,
    applyPromoCode: draftApplyPromoCode,
    removePromoCode: draftRemovePromoCode,
    applyPromoCodes: draftApplyPromoCodes,
  } = useDraftOrder();

  const { data: regionData } = useQueryRegion();
  const defaultRegion = regionData?.defaultRegion;
  const currency =
    defaultRegion?.currency_code?.toUpperCase() ?? "USD";

  const navigate = useNavigate();
  const { openCashDrawer, getDefaultPrinter } = usePrinterService();

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      const currentItem = items.find(
        (item: CartItem) => item.variant_id === itemId
      );

      removeItem(itemId);

      toast.success(`Removed ${currentItem?.title || "item"} from cart`);
    },
    [items, removeItem]
  );

  const handleQuantityChange = useCallback(
    (itemId: string, delta: number) => {
      const currentItem = items.find(
        (item: CartItem) => item.variant_id === itemId
      );

      if (!currentItem) return;

      const newQuantity = currentItem.quantity + delta;

      if (newQuantity <= 0) {
        handleRemoveItem(itemId);
        return;
      }

      try {
        updateItemQuantity(itemId, newQuantity);
        
        const message =
          delta < 0
            ? `Decreased quantity of ${currentItem.title}`
            : `Increased quantity of ${currentItem.title}`;
        
        toast.success(message);
      } catch (error) {
        handleErrorToast((error as Error).message);
      }
    },
    [handleRemoveItem, items, updateItemQuantity]
  );

  const goToGuestEmailSetting = useCallback(() => {
    void storage.setItem("settings_tab", "store");
    navigate("/settings");
    setTimeout(() => {
      const el = document.getElementById("guest-customer-email");
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.outline = "2px solid var(--color-primary)";
      el.style.outlineOffset = "4px";
      el.style.borderRadius = "8px";
      el.style.transition = "outline-color 0.6s ease, outline-offset 0.3s ease";
      el.querySelector("input")?.focus();
      setTimeout(() => {
        el.style.outline = "";
        el.style.outlineOffset = "";
        el.style.borderRadius = "";
        el.style.transition = "";
      }, 2500);
    }, 400);
  }, [navigate]);

  const handleOpenModal = useCallback(async () => {
    try {

      if (!metadata.payment_method) {
        handleErrorToast(
          "Please select a payment method before proceeding to checkout."
        );
        return;
      }

      // If already synced and draft order exists, just open the modal
      if (isSynced && draftOrderId) {
        setIsPaymentModalOpen(true);
        return;
      }

      // Need to sync changes
      const salesChannelId = await storage.getItem("sales_channel_id");

      if (draftOrderId) {
        await syncLocalChangesToDraftOrder();
      } else {
        if (!defaultRegion || !salesChannelId) {
          handleErrorToast("Region or sales channel information is missing.");
          return;
        }

        // Get customer info from metadata
        const customerEmail = (metadata as Record<string, unknown>)
          .customer_email as string | undefined;
        const customerId = (metadata as Record<string, unknown>)
          .customer_id as string | null | undefined;
        const countryCode =
          defaultRegion.countries?.[0]?.iso_2 ??
          defaultRegion.countries?.[0]?.iso_3 ??
          undefined;

        const guestEmail = getGuestCustomerEmail(store);

        if (!customerEmail && !customerId && !guestEmail) {
          toast.error(
            "Guest customer email is not configured. Set it in Store Settings or attach a customer before checkout.",
            {
              action: {
                label: "Go to Store Settings",
                onClick: goToGuestEmailSetting,
              },
              actionButtonStyle: {
                backgroundColor: "var(--error-text)",
                color: "var(--error-bg)",
              },
            }
          );
          return;
        }

        const newDraftOrderId = await createDraftOrder(
          defaultRegion.id,
          salesChannelId,
          customerEmail,
          customerId,
          countryCode
        );

        await syncLocalChangesToDraftOrder(newDraftOrderId);

        const pendingCodes = (metadata.promo_codes ?? []) as string[];
        if (pendingCodes.length > 0) {
          try {
            await draftApplyPromoCodes(newDraftOrderId, pendingCodes);
          } catch (promoError) {
            handleErrorToast(
              promoError instanceof Error
                ? promoError.message
                : "Failed to apply promo code. Remove the invalid code and try again."
            );
            return;
          }
        }
      }

      setIsPaymentModalOpen(true);
    } catch (error) {
      handleErrorToast("Failed to prepare checkout: " + (error as Error).message);
    }
  }, [
    items,
    draftOrderId,
    isSynced,
    syncLocalChangesToDraftOrder,
    defaultRegion,
    createDraftOrder,
    metadata,
    store,
    goToGuestEmailSetting,
    draftApplyPromoCodes,
  ]);

  const handleCloseModal = useCallback(() => {
    setIsPaymentModalOpen(false);
  }, []);

  const handleClearItems = useCallback(async () => {
    clearItems();

    if (draftOrderId) {
      await deleteDraftOrder();
    }
  }, [clearItems, deleteDraftOrder, draftOrderId]);

  const getTotal = useCallback(() => getTotalPrice(), [getTotalPrice]);

  const setOrderComment = useCallback(
    (comment: string) => {
      updateMetadata({ order_comment: comment });
    },
    [updateMetadata]
  );

  const setOrderDiscount = useCallback(
    (discount: OrderDiscount | null) => {
      updateMetadata({ order_discount: discount });
    },
    [updateMetadata]
  );

  const setPaymentMethod = useCallback(
    (method: PaymentMethod) => {
      updateMetadata({ payment_method: method });
    },
    [updateMetadata]
  );

  const handleOpenDrawer = useCallback(async () => {
    const printer = getDefaultPrinter();
    try {
      await openCashDrawer();
    } catch {
      if (printer) {
        toast.error("The cash drawer did not open", {
          description: cashDrawerIssueStaffHintToast(printer.name),
        });
      } else {
        toast.error("The cash drawer did not open", {
          description:
            "No default printer is set. Add one under Settings → Printers.",
        });
      }
    }
  }, [openCashDrawer, getDefaultPrinter]);

  const customerEmail = (metadata as Record<string, unknown>)
    .customer_email as string | null | undefined;

  const setCustomerEmail = useCallback(
    (email: string | null) => {
      updateMetadata({
        customer_email: email || undefined,
      } as Partial<DraftOrderMetadata>);
    },
    [updateMetadata]
  );

  const attachCustomerToDraftOrder = useCallback(
    async (customerId: string | null, email: string | null) => {
      try {
        updateMetadata({
          customer_email: email || undefined,
          customer_id: customerId || undefined,
        } as Partial<DraftOrderMetadata>);

        if (draftOrderId) {
          await updateDraftOrderCustomer(draftOrderId, customerId, email);
        }
      } catch (error) {
        updateMetadata({
          customer_email: undefined,
          customer_id: undefined,
        } as Partial<DraftOrderMetadata>);
        throw error;
      }
    },
    [draftOrderId, updateMetadata, updateDraftOrderCustomer]
  );

  const promoCodes = useMemo(
    () => (metadata.promo_codes ?? []) as string[],
    [metadata.promo_codes]
  );

  const applyPromoCode = useCallback(
    async (code: string) => {
      const trimmed = code.trim().toUpperCase();
      const existing = (metadata.promo_codes ?? []) as string[];
      if (existing.includes(trimmed)) {
        toast.info(`Promo code "${trimmed}" is already applied.`);
        return;
      }
      if (draftOrderId) {
        await draftApplyPromoCode(draftOrderId, trimmed);
      }
      updateMetadata({ promo_codes: [...existing, trimmed] } as Partial<DraftOrderMetadata>);
      if (!draftOrderId) {
        toast.info("Promo code will be applied at checkout.");
      }
    },
    [draftOrderId, metadata.promo_codes, draftApplyPromoCode, updateMetadata]
  );

  const removePromoCode = useCallback(
    async (code: string) => {
      const existing = (metadata.promo_codes ?? []) as string[];
      // Always remove from local state first so the UI clears even if the backend call fails
      updateMetadata({ promo_codes: existing.filter((c) => c !== code) } as Partial<DraftOrderMetadata>);
      if (draftOrderId) {
        try {
          await draftRemovePromoCode(draftOrderId, code);
        } catch {
          // Code was stored locally but never confirmed on the backend — that's OK
        }
      }
    },
    [draftOrderId, metadata.promo_codes, draftRemovePromoCode, updateMetadata]
  );

  return useMemo(
    () => ({
      items,
      draftOrderId,
      loading: isLoading,
      currency,
      isPaymentModalOpen,
      handleOpenModal,
      handleCloseModal,
      handleClearItems,
      handleRemoveItem,
      handleQuantityChange,
      getTotal,
      selectedItemId,
      setSelectedItemId,
      draftOrderMetaData: metadata,
      orderComment: metadata.order_comment || "",
      setOrderComment,
      orderDiscount: metadata.order_discount || null,
      setOrderDiscount,
      paymentMethods: paymentMethodOptions,
      selectedPaymentMethod: metadata.payment_method as PaymentMethod,
      setPaymentMethod,
      handleOpenDrawer,
      setItemMetadata,
      customerEmail: customerEmail || null,
      setCustomerEmail,
      attachCustomerToDraftOrder,
      promoCodes,
      applyPromoCode,
      removePromoCode,
    }),
    [
      draftOrderId,
      metadata,
      customerEmail,
      currency,
      handleClearItems,
      handleCloseModal,
      handleOpenDrawer,
      handleOpenModal,
      handleQuantityChange,
      handleRemoveItem,
      getTotal,
      isLoading,
      isPaymentModalOpen,
      items,
      selectedItemId,
      setOrderComment,
      setOrderDiscount,
      setPaymentMethod,
      setSelectedItemId,
      setItemMetadata,
      setCustomerEmail,
      attachCustomerToDraftOrder,
      paymentMethodOptions,
      promoCodes,
      applyPromoCode,
      removePromoCode,
    ]
  );
};

const CheckoutProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const value = useProvideCheckout();

  return React.createElement(CheckoutContext.Provider, { value }, children);
};

const useCheckout = (): CheckoutContextValue => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error("useCheckout must be used within a CheckoutProvider");
  }

  return context;
};

export { CheckoutProvider, useCheckout };
