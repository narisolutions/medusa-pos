import { useState, useCallback } from "react";
import { getSdk } from "@/config/medusa";
import { AdminDraftOrder } from "@medusajs/types";
import { useCartStore } from "@/context/cart";
import {
  CartItem,
  DraftOrderCreatePayload,
  DraftOrderMetadata,
  DraftOrderUpdatePayload,
  OrderDiscount,
  PaymentMethod,
} from "@/types/utils";
import { useQueryShippingOption } from "../queries/useQueryShippingOption";
import { isEmpty, extractMedusaErrorMessage } from "@/utils/helpers";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { getGuestCustomerEmail } from "@/utils/settings/store/metadata";

const DEFAULT_DRAFT_ORDER_METADATA: DraftOrderMetadata = {
  payment_method: undefined,
  order_discount: null,
  order_comment: "",
};

const sanitizeDraftOrderMetadata = (
  metadata: Record<string, unknown> | null | undefined,
  removeEmpty: boolean = false
): DraftOrderMetadata => {
  const paymentMethod = metadata?.payment_method as PaymentMethod | undefined;
  const orderDiscount = metadata?.order_discount as OrderDiscount | undefined;
  const orderComment = metadata?.order_comment;

  if (removeEmpty) {
    // For writing to API: only include keys with actual values, no defaults
    const sanitized: Record<string, unknown> = {};

    if (paymentMethod && !isEmpty(paymentMethod)) {
      sanitized.payment_method = paymentMethod;
    }

    if (!isEmpty(orderDiscount)) {
      sanitized.order_discount = orderDiscount;
    }

    if (
      orderComment &&
      typeof orderComment === "string" &&
      orderComment.trim() !== ""
    ) {
      sanitized.order_comment = orderComment;
    }

    const promoCodes = metadata?.promo_codes as string[] | undefined;
    if (promoCodes && promoCodes.length > 0) {
      sanitized.promo_codes = promoCodes;
    }

    return sanitized as DraftOrderMetadata;
  }

  // For reading from API: normalize with defaults
  const normalized: Record<string, unknown> = {
    payment_method:
      paymentMethod || DEFAULT_DRAFT_ORDER_METADATA.payment_method,
    order_discount:
      typeof orderDiscount === "object" || orderDiscount === null
        ? (orderDiscount as OrderDiscount | null)
        : DEFAULT_DRAFT_ORDER_METADATA.order_discount,
    order_comment:
      typeof orderComment === "string"
        ? orderComment
        : DEFAULT_DRAFT_ORDER_METADATA.order_comment,
    promo_codes: Array.isArray(metadata?.promo_codes) ? metadata.promo_codes : [],
  };

  return normalized as DraftOrderMetadata;
};

const useDraftOrder = () => {
  const [isLoading, setIsLoading] = useState(false);

  const {
    items,
    setItems,
    draftOrderId,
    setDraftOrderId,
    getDraftOrderId,
    metadata,
    setCartMetadata,
    markAsSynced,
  } = useCartStore();

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
      setIsLoading(true);

      // Prefer a pickup-style option; otherwise attach the first available option so the
      // converted order has `shipping_methods` and admin fulfillments can resolve a provider.
      // Vanilla Medusa seeds often have "Standard Shipping" but nothing named "pickup".
      const shippingOptionForDraft =
        shippingOptions?.find((option) =>
          option.name.toLowerCase().includes("pickup")
        ) ?? shippingOptions?.[0];

      try {
        // Sanitize metadata to remove empty values before creating draft order
        const sanitizedMetadata = sanitizeDraftOrderMetadata(
          metadata as Record<string, unknown>,
          true
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

        return draft_order.id;
      } catch (error) {
        console.error("Failed to create draft order:", error);
        throw new Error("Failed to create draft order");
      } finally {
        setIsLoading(false);
      }
    },
    [setDraftOrderId, shippingOptions, metadata, guestEmail]
  );

  const getDraftOrder =
    useCallback(async (): Promise<AdminDraftOrder | null> => {
      if (!draftOrderId) {
        return null;
      }

      const sdk = getSdk();
      setIsLoading(true);

      try {
        const { draft_order } =
          await sdk.admin.draftOrder.retrieve(draftOrderId);

        // Load metadata and customer info
        const metadataUpdates: Record<string, unknown> = {};

        if (draft_order?.metadata) {
          const sanitized = sanitizeDraftOrderMetadata(
            draft_order.metadata as Record<string, unknown>
          );
          Object.assign(metadataUpdates, sanitized);
        } else {
          Object.assign(metadataUpdates, { ...DEFAULT_DRAFT_ORDER_METADATA });
        }

        // Load customer info from draft order
        if (draft_order?.customer_id) {
          metadataUpdates.customer_id = draft_order.customer_id;
        }
        if (draft_order?.email) {
          metadataUpdates.customer_email = draft_order.email;
        }

        setCartMetadata(metadataUpdates as DraftOrderMetadata);

        return draft_order;
      } catch (error) {
        console.error("Failed to retrieve draft order:", error);

        setItems([]);
        setDraftOrderId(null);

        return null;
      } finally {
        setIsLoading(false);
      }
    }, [draftOrderId, setItems, setDraftOrderId, setCartMetadata]);

  // Load draft order and update frontend state - only use for initial loading or after confirmEdit
  const loadDraftOrderToState =
    useCallback(async (): Promise<AdminDraftOrder | null> => {
      const draftOrder = await getDraftOrder();

      if (draftOrder) {
        const cartItems: CartItem[] = (draftOrder.items || []).map((item) => ({
          variant_id: item.variant_id ?? "",
          quantity: item.quantity,
          unit_price: item.unit_price,
          title: item.variant_title || undefined,
          metadata: {
            product_title: item.metadata?.product_title || undefined,
            variant_sku: item.metadata?.variant_sku || undefined,
            barcode: item.metadata?.barcode || undefined,
            thumbnail: item.metadata?.thumbnail || undefined,
            available_quantity: item.metadata?.available_quantity || undefined,
            original_price: item.metadata?.original_price || undefined,
            priceListType: item.metadata?.priceListType || undefined,
            vintage: item.metadata?.vintage || undefined,
            volume: item.metadata?.volume || undefined,
            ...(item.metadata?.comment !== undefined && {
              comment: item.metadata?.comment,
            }),
            ...(item.metadata?.item_discount !== undefined && {
              item_discount: item.metadata?.item_discount,
            }),
          },
        }));
        setItems(cartItems);
      }

      return draftOrder;
    }, [getDraftOrder, setItems]);

  // Delete current draft order
  const deleteDraftOrder = useCallback(async (): Promise<void> => {
    if (!draftOrderId) {
      return;
    }

    const sdk = getSdk();

    try {
      setIsLoading(true);
      await sdk.admin.draftOrder.delete(draftOrderId);

      setDraftOrderId(null);
      setItems([]);
    } catch (error) {
      console.error("Failed to delete draft order:", error);
      setDraftOrderId(null);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [draftOrderId, setDraftOrderId, setItems]);

  const syncLocalChangesToDraftOrder = useCallback(
    async (targetDraftOrderId?: string): Promise<void> => {
      const activeDraftOrderId = targetDraftOrderId || draftOrderId;

      if (!activeDraftOrderId) {
        throw new Error("No active draft order");
      }

      const sdk = getSdk();

      try {
        setIsLoading(true);

        // 1. Retrieve current draft order state
        const { draft_order: currDraftOrder } =
          await sdk.admin.draftOrder.retrieve(activeDraftOrderId);

        // 2. Check whether a pending edit already exists (e.g. left open by
        //    applyPromoCode / removePromoCode). updateDraftOrder fails while a
        //    pending edit holds the lock, so we defer metadata writes until after
        //    confirmEdit when the lock is released.
        let isEditPending = false;
        try {
          const { order_changes } =
            await sdk.admin.order.listChanges(activeDraftOrderId);
          isEditPending = order_changes.some((c) => c.status === "pending");
        } catch {
          // listChanges may fail on very new orders — treat as no pending edit
        }

        // 3. Prepare metadata diff (needed in both branches below)
        const sanitizedMetadata = sanitizeDraftOrderMetadata(
          metadata as Record<string, unknown>,
          true
        );
        const currentMetadata = currDraftOrder.metadata as
          | DraftOrderMetadata
          | undefined;
        const hasMetadataChanged =
          JSON.stringify(currentMetadata) !== JSON.stringify(sanitizedMetadata);

        const step = { name: "init" };
        try {
          if (!isEditPending) {
            if (hasMetadataChanged) {
              step.name = "update-metadata";
              await sdk.admin.draftOrder.update(activeDraftOrderId, {
                metadata: sanitizedMetadata,
              } as DraftOrderUpdatePayload);
            }
            step.name = "beginEdit";
            await sdk.admin.draftOrder.beginEdit(activeDraftOrderId);
          }

          const draftItemsMap = new Map(
            (currDraftOrder?.items || []).map((item) => [item.variant_id!, item])
          );
          const localItemsMap = new Map(
            items.map((item) => [item.variant_id!, item])
          );

          const itemsToAdd = items.filter(
            (localItem) => !draftItemsMap.has(localItem.variant_id!)
          );
          if (itemsToAdd.length > 0) {
            step.name = "addItems";
            await sdk.admin.draftOrder.addItems(activeDraftOrderId, { items: itemsToAdd });
          }

          for (const [variantId, localItem] of localItemsMap) {
            const draftItem = draftItemsMap.get(variantId);
            if (draftItem) {
              const quantityChanged = draftItem.quantity !== localItem.quantity;
              const priceChanged = draftItem.unit_price !== localItem.unit_price;
              if (quantityChanged || priceChanged) {
                step.name = `updateItem(${variantId})`;
                await sdk.admin.draftOrder.updateItem(activeDraftOrderId, draftItem.id, {
                  quantity: localItem.quantity,
                  unit_price: localItem.unit_price,
                });
              }
            }
          }
          for (const [variantId, draftItem] of draftItemsMap) {
            if (!localItemsMap.has(variantId)) {
              step.name = `removeItem(${variantId})`;
              await sdk.admin.draftOrder.updateItem(activeDraftOrderId, draftItem.id, { quantity: 0 });
            }
          }

          step.name = "confirmEdit";
          await sdk.admin.draftOrder.confirmEdit(activeDraftOrderId);

          if (isEditPending && hasMetadataChanged) {
            step.name = "deferred-update-metadata";
            await sdk.admin.draftOrder.update(activeDraftOrderId, {
              metadata: sanitizedMetadata,
            } as DraftOrderUpdatePayload);
          }

          markAsSynced();
        } catch (innerError) {
          const reason = extractMedusaErrorMessage(innerError);
          throw new Error(`[${step.name}] ${reason}`);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [draftOrderId, items, metadata, markAsSynced]
  );

  const applyPromoCode = useCallback(
    async (targetId: string, code: string): Promise<void> => {
      const sdk = getSdk();
      setIsLoading(true);
      try {
        // Promotions endpoint requires an active order change — ensure one exists.
        try {
          const { order_changes } = await sdk.admin.order.listChanges(targetId);
          const isEditPending = order_changes.some((c) => c.status === "pending");
          if (!isEditPending) {
            await sdk.admin.draftOrder.beginEdit(targetId);
          }
        } catch {
          // If listChanges fails (e.g. new order), attempt beginEdit anyway
          await sdk.admin.draftOrder.beginEdit(targetId);
        }
        await (sdk.client.fetch as (path: string, init: Record<string, unknown>) => Promise<unknown>)(
          `/admin/draft-orders/${targetId}/edit/promotions`,
          { method: "POST", body: { promo_codes: [code] } }
        );
        // Leave the edit pending — syncLocalChangesToDraftOrder will confirmEdit on checkout.
      } catch (error) {
        const reason = extractMedusaErrorMessage(error);
        throw new Error(`Could not apply promo code "${code}": ${reason}`);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const removePromoCode = useCallback(
    async (targetId: string, code: string): Promise<void> => {
      const sdk = getSdk();
      setIsLoading(true);
      try {
        // Promotions endpoint requires an active order change — ensure one exists.
        try {
          const { order_changes } = await sdk.admin.order.listChanges(targetId);
          const isEditPending = order_changes.some((c) => c.status === "pending");
          if (!isEditPending) {
            await sdk.admin.draftOrder.beginEdit(targetId);
          }
        } catch {
          await sdk.admin.draftOrder.beginEdit(targetId);
        }
        await (sdk.client.fetch as (path: string, init: Record<string, unknown>) => Promise<unknown>)(
          `/admin/draft-orders/${targetId}/edit/promotions`,
          { method: "DELETE", body: { promo_codes: [code] } }
        );
      } catch (error) {
        const reason = extractMedusaErrorMessage(error);
        throw new Error(`Could not remove promo code "${code}": ${reason}`);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Applies all given promo codes to a draft order and confirms the pending order changes.
  // Use this when creating a new draft order — codes applied mid-session are confirmed
  // automatically by the next syncLocalChangesToDraftOrder call.
  const applyPromoCodes = useCallback(
    async (targetId: string, codes: string[]): Promise<void> => {
      if (codes.length === 0) return;
      const sdk = getSdk();
      setIsLoading(true);
      try {
        // Promotions endpoint requires an active order change — ensure one exists.
        try {
          const { order_changes } = await sdk.admin.order.listChanges(targetId);
          const isEditPending = order_changes.some((c) => c.status === "pending");
          if (!isEditPending) {
            await sdk.admin.draftOrder.beginEdit(targetId);
          }
        } catch {
          await sdk.admin.draftOrder.beginEdit(targetId);
        }
        for (const code of codes) {
          try {
            await (sdk.client.fetch as (path: string, init: Record<string, unknown>) => Promise<unknown>)(
              `/admin/draft-orders/${targetId}/edit/promotions`,
              { method: "POST", body: { promo_codes: [code] } }
            );
          } catch (error) {
            const reason = extractMedusaErrorMessage(error);
            throw new Error(`Could not apply promo code "${code}": ${reason}`);
          }
        }
        try {
          await sdk.admin.draftOrder.confirmEdit(targetId);
        } catch {
          // No pending edit — ok
        }
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error("Failed to apply promo code");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateDraftOrderCustomer = useCallback(
    async (
      targetDraftOrderId: string,
      customerId: string | null,
      email: string | null
    ): Promise<void> => {
      const sdk = getSdk();
      setIsLoading(true);

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
          console.error(`beginEditIfNeeded: ${errorMessage}`);
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
        console.error("Failed to update draft order customer:", error);
        throw new Error(
          "Failed to update draft order customer: " +
          (error instanceof Error ? error.message : String(error))
        );
      } finally {
        setIsLoading(false);
      }
    },
    [guestEmail]
  );

  return {
    draftOrderId,
    isLoading,
    getCurrentDraftOrderId: getDraftOrderId,
    createDraftOrder,
    getDraftOrder,
    loadDraftOrderToState,
    deleteDraftOrder,
    syncLocalChangesToDraftOrder,
    updateDraftOrderCustomer,
    applyPromoCode,
    removePromoCode,
    applyPromoCodes,
    draftOrderMetaData: metadata,
    setDraftOrderMetaData: setCartMetadata,
  };
};

export { useDraftOrder };
