import { logger, safeStringify } from "@/utils/logger";
import { useState, useCallback } from "react";
import { getSdk } from "@/config/medusa";
import { queryClient, queryKeys } from "@/config/query";
import { AdminDraftOrder } from "@medusajs/types";
import { useCartStore } from "@/context/cart";
import {
  DraftOrderCreatePayload,
  DraftOrderMetadata,
  DraftOrderUpdatePayload,
} from "@/types/utils";
import { useQueryShippingOption } from "../queries/useQueryShippingOption";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { getGuestCustomerEmail } from "@/utils/settings/store/metadata";
import {
  sanitizeDraftOrderMetadata,
  mapDraftOrderItemsToCartItems,
  buildCartMetadataFromDraft,
} from "@/utils/pos/draft-order";

// payment_method IS written to draft metadata, so a parked sale resumes with the
// cashier's selection intact. It stays a UI selection only — the provider that actually
// settles the order is still recorded on the payment session / markAsPaid.

/** Stable across key order, so a reordered object is not mistaken for a change. */
const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val as Record<string, unknown>).sort())
      : val
  );

const useDraftOrder = () => {
  // Op counter, not a boolean — isLoading must stay true until the LAST overlapping call ends.
  const [pendingOps, setPendingOps] = useState(0);
  const isLoading = pendingOps > 0;
  const beginLoading = () => setPendingOps((count) => count + 1);
  const endLoading = () => setPendingOps((count) => count - 1);

  const setItems = useCartStore((state) => state.setItems);
  const draftOrderId = useCartStore((state) => state.draftOrderId);
  const setDraftOrderId = useCartStore((state) => state.setDraftOrderId);
  const getDraftOrderId = useCartStore((state) => state.getDraftOrderId);
  const metadata = useCartStore((state) => state.metadata);
  const setCartMetadata = useCartStore((state) => state.setCartMetadata);
  const markAsSynced = useCartStore((state) => state.markAsSynced);
  const adoptDraftOrder = useCartStore((state) => state.adoptDraftOrder);
  const releaseDraftOrder = useCartStore((state) => state.releaseDraftOrder);

  const { data: shippingOptions } = useQueryShippingOption();
  const { data: store } = useQueryStore();
  const guestEmail = getGuestCustomerEmail(store);

  const createDraftOrder = useCallback(
    async (
      regionId: string,
      salesChannelId: string,
      email?: string,
      customerId?: string | null,
      countryCode?: string
    ): Promise<string> => {
      const sdk = getSdk();
      beginLoading();

      // Fresh, not from the render closure — park sets the label immediately before this.
      const metadata = useCartStore.getState().metadata;

      // Prefer a pickup option, else the first — the converted order needs shipping_methods.
      const shippingOptionForDraft =
        shippingOptions?.find((option) =>
          option.name.toLowerCase().includes("pickup")
        ) ?? shippingOptions?.[0];

      try {
        // Sanitize metadata to remove empty values before creating draft order
        const sanitizedMetadata = sanitizeDraftOrderMetadata(
          metadata as Record<string, unknown>,
          { removeEmpty: true }
        );

        // Get customer email from metadata if not provided
        const customerEmail =
          email ||
          ((metadata as Record<string, unknown>).customer_email as
            | string
            | undefined) ||
          guestEmail ||
          "";

        const draftOrderData: DraftOrderCreatePayload & {
          customer_id?: string | null;
        } = {
          email: customerEmail,
          items: [],
          region_id: regionId,
          ...(countryCode && {
            shipping_address: {
              country_code: countryCode,
            },
          }),
          sales_channel_id: salesChannelId,
          ...(shippingOptionForDraft && {
            shipping_methods: [
              {
                shipping_option_id: shippingOptionForDraft.id,
                name: shippingOptionForDraft.name,
                amount: 0,
              },
            ],
          }),
          metadata: sanitizedMetadata,
        };

        // Add customer_id if provided
        const finalCustomerId =
          customerId ||
          ((metadata as Record<string, unknown>).customer_id as
            | string
            | null
            | undefined);
        if (finalCustomerId) {
          draftOrderData.customer_id = finalCustomerId;
        }

        const { draft_order } =
          await sdk.admin.draftOrder.create(draftOrderData);

        setDraftOrderId(draft_order.id);
        void queryClient.invalidateQueries({ queryKey: queryKeys.draftOrders.all });

        return draft_order.id;
      } catch (error) {
        void logger.error(`Failed to create draft order: ${safeStringify(error)}`);
        throw new Error("Failed to create draft order");
      } finally {
        endLoading();
      }
    },
    [setDraftOrderId, shippingOptions, guestEmail]
  );

  /** Pure read. Never touches cart state — callers decide what a failure means. */
  const fetchDraftOrder = useCallback(
    async (targetId: string, fields?: string): Promise<AdminDraftOrder | null> => {
      const sdk = getSdk();
      beginLoading();

      try {
        const { draft_order } = await sdk.admin.draftOrder.retrieve(
          targetId,
          fields ? { fields } : undefined
        );

        return draft_order;
      } catch (error) {
        void logger.error(`Failed to retrieve draft order: ${safeStringify(error)}`);

        // Only reset for the draft this cart is actually bound to; a stale id from the
        // parked list must never wipe an unrelated live cart.
        if (targetId === useCartStore.getState().draftOrderId) {
          setItems([]);
          setDraftOrderId(null);
        }

        return null;
      } finally {
        endLoading();
      }
    },
    [setItems, setDraftOrderId]
  );

  // Load a draft into the cart. Used on resume and after confirmEdit.
  const loadDraftOrderToState = useCallback(
    async (targetDraftOrderId?: string): Promise<AdminDraftOrder | null> => {
      const targetId = targetDraftOrderId || draftOrderId;
      if (!targetId) return null;

      const draftOrder = await fetchDraftOrder(targetId);
      if (!draftOrder) return null;

      adoptDraftOrder({
        draftOrderId: targetId,
        items: mapDraftOrderItemsToCartItems(draftOrder),
        metadata: buildCartMetadataFromDraft(
          draftOrder,
          useCartStore.getState().metadata.payment_method
        ),
      });

      return draftOrder;
    },
    [draftOrderId, fetchDraftOrder, adoptDraftOrder]
  );

  const deleteDraftOrder = useCallback(
    async (targetDraftOrderId?: string): Promise<void> => {
      const targetId = targetDraftOrderId || draftOrderId;
      if (!targetId) {
        return;
      }

      const sdk = getSdk();

      try {
        beginLoading();
        await sdk.admin.draftOrder.delete(targetId);
      } catch (error) {
        // A draft that is already gone is a successful delete — the operator wanted it gone.
        void logger.error(`Failed to delete draft order: ${safeStringify(error)}`);
      } finally {
        // Only clear the cart when we deleted the draft it is bound to.
        if (targetId === useCartStore.getState().draftOrderId) {
          releaseDraftOrder();
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.draftOrders.all });
        endLoading();
      }
    },
    [draftOrderId, releaseDraftOrder]
  );

  const syncLocalChangesToDraftOrder = useCallback(
    async (targetDraftOrderId?: string): Promise<void> => {
      const activeDraftOrderId = targetDraftOrderId || draftOrderId;

      if (!activeDraftOrderId) {
        throw new Error("No active draft order");
      }

      const sdk = getSdk();

      // Read fresh rather than from the render closure: park writes the label and syncs
      // in the same tick, so a captured `metadata` would still be the pre-label value.
      const { items, metadata } = useCartStore.getState();

      try {
        beginLoading();

        if (!activeDraftOrderId) return;

        try {
          const { order_changes } =
            await sdk.admin.order.listChanges(activeDraftOrderId);
          const isEditPending = order_changes.some(
            (change) => change.status === "pending"
          );

          if (!isEditPending) {
            await sdk.admin.draftOrder.beginEdit(activeDraftOrderId);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          void logger.error(`beginEditIfNeeded: ${errorMessage}`);
        }

        const { draft_order: currDraftOrder } =
          await sdk.admin.draftOrder.retrieve(activeDraftOrderId);

        // Create lookup maps for efficient comparison (O(1) vs O(n) lookups)
        const draftItemsMap = new Map(
          (currDraftOrder?.items || []).map((item) => [item.variant_id!, item])
        );

        const localItemsMap = new Map(
          items.map((item) => [item.variant_id!, item])
        );

        // 1. Find and add new items (items in local state but not in draft order)
        const itemsToAdd = items.filter((localItem) => {
          return !draftItemsMap.has(localItem.variant_id!);
        });

        if (itemsToAdd.length > 0) {
          await sdk.admin.draftOrder.addItems(activeDraftOrderId, {
            items: itemsToAdd,
          });
        }

        // 2. Update quantities and prices for existing items
        for (const [variantId, localItem] of localItemsMap) {
          const draftItem = draftItemsMap.get(variantId);

          if (draftItem) {
            const quantityChanged = draftItem.quantity !== localItem.quantity;
            const priceChanged = draftItem.unit_price !== localItem.unit_price;
            // Without this, a comment or discount applied after add-to-cart never
            // reaches the backend and is lost the moment the sale is parked.
            const metadataChanged =
              stableStringify(draftItem.metadata ?? {}) !==
              stableStringify(localItem.metadata ?? {});

            if (quantityChanged || priceChanged || metadataChanged) {
              await sdk.admin.draftOrder.updateItem(
                activeDraftOrderId,
                draftItem.id,
                {
                  quantity: localItem.quantity,
                  unit_price: localItem.unit_price,
                  metadata: localItem.metadata ?? null,
                }
              );
            }
          }
        }

        // 3. Remove items that exist in draft but not in local state
        for (const [variantId, draftItem] of draftItemsMap) {
          if (!localItemsMap.has(variantId)) {
            await sdk.admin.draftOrder.updateItem(
              activeDraftOrderId,
              draftItem.id,
              {
                quantity: 0,
              }
            );
          }
        }

        // 4. Update draft order metadata if it has changed
        const currentMetadata = currDraftOrder.metadata as
          | DraftOrderMetadata
          | undefined;

        // Sanitize for the API, carrying through keys other flows own (cash_paid,
        // register_session_id, pay_later) so this write cannot erase them.
        const sanitizedMetadata = sanitizeDraftOrderMetadata(
          metadata as Record<string, unknown>,
          { removeEmpty: true, preserve: currentMetadata }
        );

        const hasMetadataChanged =
          stableStringify(currentMetadata) !== stableStringify(sanitizedMetadata);

        if (hasMetadataChanged) {
          const updatePayload: DraftOrderUpdatePayload = {
            metadata: sanitizedMetadata,
          };

          await sdk.admin.draftOrder.update(activeDraftOrderId, updatePayload);
        }

        // Confirm edit for the specific draft order
        await sdk.admin.draftOrder.confirmEdit(activeDraftOrderId);

        // Mark cart as synced after successful sync
        markAsSynced();
      } catch (error) {
        throw new Error("Failed to sync changes to draft order: " + error);
      } finally {
        endLoading();
      }
    },
    [draftOrderId, markAsSynced]
  );

  const updateDraftOrderCustomer = useCallback(
    async (
      targetDraftOrderId: string,
      customerId: string | null,
      email: string | null
    ): Promise<void> => {
      const sdk = getSdk();
      beginLoading();

      try {
        // Begin edit if needed
        try {
          const { order_changes } =
            await sdk.admin.order.listChanges(targetDraftOrderId);
          const isEditPending = order_changes.some(
            (change) => change.status === "pending"
          );

          if (!isEditPending) {
            await sdk.admin.draftOrder.beginEdit(targetDraftOrderId);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          void logger.error(`beginEditIfNeeded: ${errorMessage}`);
        }

        // Update draft order with customer_id and email
        const updatePayload: DraftOrderUpdatePayload & {
          customer_id?: string | undefined;
          email?: string;
        } = {};

        if (customerId) {
          updatePayload.customer_id = customerId;
        } else {
          // If removing customer, set to undefined and use default guest email
          updatePayload.customer_id = undefined;
          updatePayload.email = email || guestEmail;
        }

        if (email) {
          updatePayload.email = email;
        }

        await sdk.admin.draftOrder.update(targetDraftOrderId, updatePayload);

        // Confirm edit
        await sdk.admin.draftOrder.confirmEdit(targetDraftOrderId);
      } catch (error) {
        void logger.error(`Failed to update draft order customer: ${safeStringify(error)}`);
        throw new Error(
          "Failed to update draft order customer: " +
          (error instanceof Error ? error.message : String(error))
        );
      } finally {
        endLoading();
      }
    },
    [guestEmail]
  );

  return {
    draftOrderId,
    isLoading,
    getCurrentDraftOrderId: getDraftOrderId,
    createDraftOrder,
    fetchDraftOrder,
    loadDraftOrderToState,
    deleteDraftOrder,
    syncLocalChangesToDraftOrder,
    updateDraftOrderCustomer,
    draftOrderMetaData: metadata,
    setDraftOrderMetaData: setCartMetadata,
  };
};

export { useDraftOrder };
