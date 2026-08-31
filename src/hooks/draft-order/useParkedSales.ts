import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminProduct } from "@medusajs/types";
import { useDraftOrder } from "./useDraftOrder";
import { useCartStore } from "@/context/cart";
import { useRegister } from "@/context/register";
import { useSalesChannel } from "@/context/sales-channel";
import { useQueryRegion } from "@/hooks/queries/useQueryRegion";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { fetchProducts } from "@/hooks/queries/useQueryProducts";
import { getGuestCustomerEmail, getPaymentMethods } from "@/utils/settings/store/metadata";
import { queryKeys } from "@/config/query";
import {
  reconcileStock,
  mapDraftOrderItemsToCartItems,
  buildCartMetadataFromDraft,
  StockWarning,
} from "@/utils/pos/draft-order";
import { handleErrorToast } from "@/utils/helpers";
import { useTranslation } from "@/i18n";
import storage from "@/utils/storage";

/** Thrown when a guard has already told the operator what is wrong — do not toast again. */
class GuardError extends Error {
  readonly handled = true;
}

const isGuardError = (error: unknown): boolean =>
  !!(error as { handled?: boolean } | null)?.handled;

/**
 * Park / resume / discard, shared by the checkout page and the parked-sales page.
 *
 * The parked page renders outside CheckoutProvider and cannot use useCheckout(), so the
 * guards live here — duplicating them in both places would let them drift apart.
 */
const useParkedSales = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    createDraftOrder,
    syncLocalChangesToDraftOrder,
    deleteDraftOrder,
    fetchDraftOrder,
    isLoading,
  } = useDraftOrder();

  const items = useCartStore((state) => state.items);
  const draftOrderId = useCartStore((state) => state.draftOrderId);
  const metadata = useCartStore((state) => state.metadata);
  const isSynced = useCartStore((state) => state.isSynced);
  const updateMetadata = useCartStore((state) => state.updateMetadata);
  const adoptDraftOrder = useCartStore((state) => state.adoptDraftOrder);
  const releaseDraftOrder = useCartStore((state) => state.releaseDraftOrder);

  const { data: store } = useQueryStore();
  const { data: regionData } = useQueryRegion();
  const defaultRegion = regionData?.defaultRegion;
  const salesChannelId = useSalesChannel((state) => state.salesChannelId);
  const { enabled: registerEnabled, isOpen: registerOpen } = useRegister();

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.draftOrders.all });
  }, [queryClient]);

  /** Navigates to the store setting that unblocks draft creation. */
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

  /** True when a draft can be created — it needs an email we can resolve. */
  const canCreateDraftOrder = useCallback((): boolean => {
    if (draftOrderId) return true;
    const customerEmail = metadata.customer_email as string | undefined;
    const customerId = metadata.customer_id as string | null | undefined;
    return !!(customerEmail || customerId || getGuestCustomerEmail(store));
  }, [draftOrderId, metadata, store]);

  /**
   * Creates the draft if needed and pushes local changes to it. Shared by park and
   * payment so both paths apply the same guards. Returns the draft id.
   */
  const ensureDraftOrderSynced = useCallback(async (): Promise<string> => {
    if (isSynced && draftOrderId) return draftOrderId;

    if (draftOrderId) {
      await syncLocalChangesToDraftOrder();
      return draftOrderId;
    }

    if (!defaultRegion || !salesChannelId) {
      handleErrorToast(t("checkout.region_channel_missing"));
      throw new GuardError(t("checkout.region_channel_missing"));
    }

    const customerEmail = metadata.customer_email as string | undefined;
    const customerId = metadata.customer_id as string | null | undefined;
    const countryCode =
      defaultRegion.countries?.[0]?.iso_2 ??
      defaultRegion.countries?.[0]?.iso_3 ??
      undefined;

    if (!canCreateDraftOrder()) {
      toast.error(t("checkout.guest_email_not_configured"), {
        action: {
          label: t("common.go_to_store_settings"),
          onClick: goToGuestEmailSetting,
        },
        actionButtonStyle: {
          backgroundColor: "var(--error-text)",
          color: "var(--error-bg)",
        },
      });
      throw new GuardError(t("checkout.guest_email_not_configured"));
    }

    const newDraftOrderId = await createDraftOrder(
      defaultRegion.id,
      salesChannelId,
      customerEmail,
      customerId,
      countryCode
    );

    await syncLocalChangesToDraftOrder(newDraftOrderId);
    return newDraftOrderId;
  }, [
    isSynced,
    draftOrderId,
    syncLocalChangesToDraftOrder,
    defaultRegion,
    salesChannelId,
    metadata,
    canCreateDraftOrder,
    createDraftOrder,
    goToGuestEmailSetting,
    t,
  ]);

  /**
   * Saves the cart to its draft and detaches it, freeing the till.
   *
   * On failure the cart stays bound and dirty on purpose — losing a rung-up sale to a
   * network blip is worse than making the cashier retry.
   */
  const parkCurrentSale = useCallback(
    async (label?: string): Promise<boolean> => {
      if (items.length === 0) {
        handleErrorToast(t("checkout.park_empty_cart"));
        return false;
      }

      if (registerEnabled && !registerOpen) {
        handleErrorToast(t("checkout.register_closed"));
        return false;
      }

      try {
        // Always written, so clearing the field (or "park without a name" on a sale that
        // already had one) actually removes it. Set before the sync so the existing
        // metadata diff carries it — no extra round trip.
        const trimmed = label?.trim();
        updateMetadata({ park_label: trimmed || undefined });

        await ensureDraftOrderSynced();
        releaseDraftOrder();
        invalidate();

        toast.success(t("checkout.parked_toast"), {
          action: {
            label: t("checkout.view_parked_action"),
            onClick: () => navigate("/parked"),
          },
        });

        return true;
      } catch (error) {
        if (!isGuardError(error)) {
          handleErrorToast(
            t("checkout.park_failed", { error: (error as Error).message })
          );
        }
        return false;
      }
    },
    [
      items.length,
      registerEnabled,
      registerOpen,
      updateMetadata,
      ensureDraftOrderSynced,
      releaseDraftOrder,
      invalidate,
      navigate,
      t,
    ]
  );

  /** Fresh availability for the resumed lines, from the catalogue the till already caches. */
  const readAvailability = useCallback(async (): Promise<Map<string, number>> => {
    const map = new Map<string, number>();
    if (!salesChannelId) return map;

    try {
      const products =
        queryClient.getQueryData<AdminProduct[]>(
          queryKeys.products.list(salesChannelId)
        ) ??
        (await queryClient.fetchQuery({
          queryKey: queryKeys.products.list(salesChannelId),
          queryFn: () => fetchProducts(salesChannelId),
        }));

      for (const product of products ?? []) {
        for (const variant of product.variants ?? []) {
          if (typeof variant.inventory_quantity === "number") {
            map.set(variant.id, variant.inventory_quantity);
          }
        }
      }
    } catch (error) {
      handleErrorToast(error);
    }

    return map;
  }, [queryClient, salesChannelId]);

  const warnAboutStock = useCallback(
    (warnings: StockWarning[]) => {
      if (warnings.length === 0) return;

      const shown = warnings.slice(0, 3).map((warning) =>
        warning.status === "unavailable"
          ? t("parked.stock_unavailable_item", { title: warning.title })
          : t("parked.stock_changed_item", {
              title: warning.title,
              available: warning.available,
              requested: warning.requested,
            })
      );

      if (warnings.length > shown.length) {
        shown.push(t("parked.stock_changed_more", { count: warnings.length - shown.length }));
      }

      toast.warning(t("parked.stock_changed_title"), {
        description: shown.join("\n"),
        duration: 10000,
      });
    },
    [t]
  );

  /**
   * Loads a parked sale into the cart. The caller is responsible for dealing with a
   * non-empty cart first (park it or discard it).
   */
  const resumeParkedSale = useCallback(
    async (targetId: string): Promise<boolean> => {
      const draftOrder = await fetchDraftOrder(targetId);

      // Paid or deleted on another till. Leave this cart alone.
      if (!draftOrder) {
        handleErrorToast(t("parked.gone_message"));
        invalidate();
        return false;
      }

      const availability = await readAvailability();
      const { items: reconciled, warnings } = reconcileStock(
        mapDraftOrderItemsToCartItems(draftOrder),
        availability
      );

      adoptDraftOrder({
        draftOrderId: targetId,
        items: reconciled,
        metadata: buildCartMetadataFromDraft(
          draftOrder,
          undefined,
          getPaymentMethods(store).map((method) => method.id)
        ),
      });

      invalidate();
      navigate("/checkout");
      toast.success(t("parked.resumed_toast"));
      warnAboutStock(warnings);

      return true;
    },
    [
      fetchDraftOrder,
      readAvailability,
      adoptDraftOrder,
      invalidate,
      navigate,
      warnAboutStock,
      store,
      t,
    ]
  );

  const discardParkedSale = useCallback(
    async (targetId: string): Promise<void> => {
      await deleteDraftOrder(targetId);
      invalidate();
      toast.success(t("parked.discarded_toast"));
    },
    [deleteDraftOrder, invalidate, t]
  );

  return {
    isLoading,
    canCreateDraftOrder,
    goToGuestEmailSetting,
    ensureDraftOrderSynced,
    parkCurrentSale,
    resumeParkedSale,
    discardParkedSale,
  };
};

export { useParkedSales, isGuardError };
