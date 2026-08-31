import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { useDraftOrder } from "@/hooks/draft-order/useDraftOrder";
import { useParkedSales, isGuardError } from "@/hooks/draft-order/useParkedSales";
import { useCartStore } from "@/context/cart";
import { useRegister } from "@/context/register";
import { useQueryRegion } from "@/hooks/queries/useQueryRegion";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { getPaymentMethods } from "@/utils/settings/store/metadata";
import { usePrinterService } from "@/hooks/printer/usePrinterService";
import Payments from "@/assets/icons/payments";
import CardIcon from "@/assets/icons/card";
import { ArrowLeftRight } from "lucide-react";

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
import { useTranslation } from "@/i18n";

type PaymentMethodOption = {
  key: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

// No local asset for transfer; lucide covers it and is already a dependency.
const iconMap = {
  cash: Payments,
  card: CardIcon,
  transfer: ArrowLeftRight,
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
  handleParkSale: (label?: string) => Promise<boolean>;
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
};

const CheckoutContext = createContext<CheckoutContextValue | undefined>(
  undefined
);

const useProvideCheckout = (): CheckoutContextValue => {
  const { t } = useTranslation();
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

  const {
    isLoading,
    deleteDraftOrder,
    updateDraftOrderCustomer,
  } = useDraftOrder();

  const { data: regionData } = useQueryRegion();
  const defaultRegion = regionData?.defaultRegion;
  const currency =
    defaultRegion?.currency_code?.toUpperCase() ?? "USD";

  const { openCashDrawer, getDefaultPrinter } = usePrinterService();
  const { enabled: registerEnabled, isOpen: registerOpen } = useRegister();
  const { ensureDraftOrderSynced, parkCurrentSale } = useParkedSales();

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      const currentItem = items.find(
        (item: CartItem) => item.variant_id === itemId
      );

      removeItem(itemId);

      toast.success(t("checkout.item_removed", { title: currentItem?.title || "item" }));
    },
    [items, removeItem, t]
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
            ? t("checkout.quantity_decreased", { title: currentItem.title })
            : t("checkout.quantity_increased", { title: currentItem.title });

        toast.success(message);
      } catch (error) {
        handleErrorToast((error as Error).message);
      }
    },
    [handleRemoveItem, items, updateItemQuantity, t]
  );

  const handleOpenModal = useCallback(async () => {
    try {
      if (registerEnabled && !registerOpen) {
        handleErrorToast(t("checkout.register_closed"));
        return;
      }

      if (!metadata.payment_method) {
        handleErrorToast(t("checkout.select_payment_method"));
        return;
      }

      // Shared with park, so both paths apply the same create-or-sync guards.
      await ensureDraftOrderSynced();

      setIsPaymentModalOpen(true);
    } catch (error) {
      if (isGuardError(error)) return;
      handleErrorToast(t("checkout.failed_to_prepare_checkout", { error: (error as Error).message }));
    }
  }, [
    ensureDraftOrderSynced,
    metadata.payment_method,
    registerEnabled,
    registerOpen,
    t,
  ]);

  const handleCloseModal = useCallback(() => {
    setIsPaymentModalOpen(false);
  }, []);

  const handleParkSale = useCallback(
    (label?: string) => parkCurrentSale(label),
    [parkCurrentSale]
  );

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
        toast.error(t("checkout.cash_drawer_error_title"), {
          description: cashDrawerIssueStaffHintToast(printer.name),
        });
      } else {
        toast.error(t("checkout.cash_drawer_error_title"), {
          description: t("checkout.no_default_printer"),
        });
      }
    }
  }, [openCashDrawer, getDefaultPrinter, t]);

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

  return useMemo(
    () => ({
      items,
      draftOrderId,
      loading: isLoading,
      currency,
      isPaymentModalOpen,
      handleOpenModal,
      handleCloseModal,
      handleParkSale,
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
    }),
    [
      draftOrderId,
      metadata,
      customerEmail,
      currency,
      handleClearItems,
      handleCloseModal,
      handleParkSale,
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
