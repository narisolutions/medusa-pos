import { pickPickupOption } from "@/utils/pos/fulfillment";
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
import { sanitizeDraftOrderMetadata } from "@/utils/pos/draft-order";
import {
  beginEditIfNeeded,
  diffDraftItems,
  metadataUpdate,
  resolveCustomerIdByEmail,
  stableStringify,
} from "@/utils/pos/draft-order/sync";
import { getApiErrorMessage } from "@/utils/helpers";

// payment_method IS written to draft metadata, so a parked sale resumes with the
// cashier's selection intact. It stays a UI selection only — the provider that actually
// settles the order is still recorded on the payment session / markAsPaid.

const useDraftOrder = () => {
  // Op counter, not a boolean — isLoading must stay true until the LAST overlapping call ends.
  const [pendingOps, setPendingOps] = useState(0);
  const isLoading = pendingOps > 0;
  const beginLoading = () => setPendingOps((count) => count + 1);
  const endLoading = () => setPendingOps((count) => count - 1);

  const setItems = useCartStore((state) => state.setItems);
  const draftOrderId = useCartStore((state) => state.draftOrderId);
  const setDraftOrderId = useCartStore((state) => state.setDraftOrderId);
  const markAsSynced = useCartStore((state) => state.markAsSynced);
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

      const shippingOptionForDraft = pickPickupOption(shippingOptions);

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

  /** Null only when the draft is gone (paid or discarded elsewhere); other failures throw. */
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
        // A dropped connection must not read as "gone" — nor wipe a rung-up sale.
        if ((error as { status?: number } | null)?.status !== 404) throw error;

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
        await beginEditIfNeeded(activeDraftOrderId);

        const { draft_order: currDraftOrder } =
          await sdk.admin.draftOrder.retrieve(activeDraftOrderId);

        const diff = diffDraftItems(currDraftOrder?.items || [], items);

        if (diff.add.length > 0) {
          await sdk.admin.draftOrder.addItems(activeDraftOrderId, { items: diff.add });
        }
        // One at a time: Medusa locks the draft per edit, so parallel writes would collide.
        for (const { id, ...update } of diff.update) {
          await sdk.admin.draftOrder.updateItem(activeDraftOrderId, id, update);
        }
        for (const id of diff.remove) {
          await sdk.admin.draftOrder.updateItem(activeDraftOrderId, id, { quantity: 0 });
        }

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
            metadata: metadataUpdate(currentMetadata, sanitizedMetadata),
          };

          await sdk.admin.draftOrder.update(activeDraftOrderId, updatePayload);
        }

        // Confirm edit for the specific draft order
        await sdk.admin.draftOrder.confirmEdit(activeDraftOrderId);

        // Mark cart as synced after successful sync
        markAsSynced();
      } catch (error) {
        void logger.error(`Failed to sync draft order: ${safeStringify(error)}`);
        throw new Error(
          "Failed to sync changes to draft order: " + getApiErrorMessage(error, String(error))
        );
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
        await beginEditIfNeeded(targetDraftOrderId);

        // Medusa cannot clear customer_id, so without a customer the draft points at the
        // one behind the email — the guest's when none is given, as at creation.
        const fallbackEmail = email || guestEmail;
        if (!customerId && !fallbackEmail) {
          throw new Error("No customer and no guest email configured");
        }
        const updatePayload: DraftOrderUpdatePayload & {
          customer_id?: string;
          email?: string;
        } = customerId
          ? { customer_id: customerId, ...(email ? { email } : {}) }
          : {
              customer_id: await resolveCustomerIdByEmail(fallbackEmail!),
              email: fallbackEmail,
            };

        await sdk.admin.draftOrder.update(targetDraftOrderId, updatePayload);

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
    isLoading,
    createDraftOrder,
    fetchDraftOrder,
    deleteDraftOrder,
    syncLocalChangesToDraftOrder,
    updateDraftOrderCustomer,
  };
};

export { useDraftOrder };
