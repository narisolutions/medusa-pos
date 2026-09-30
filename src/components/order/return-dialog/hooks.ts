import { useCallback, useMemo, useState } from "react";
import { AdminOrder } from "@medusajs/types";
import { toast } from "sonner";
import { getSdk } from "@/config/medusa";
import { useTranslation } from "@/i18n";
import { getOrderCurrency, handleErrorToast } from "@/utils/helpers";
import { logger, safeStringify } from "@/utils/logger";
import storage from "@/utils/storage";
import { describeChangeError, useOrderChange } from "@/hooks/order/useOrderChange";
import {
  buildReturnPlan,
  getReturnableQuantity,
  type ReturnSelection,
} from "@/utils/pos/post-sale";
import { toNumber } from "@/utils/pos/pricing";

const useReturnItems = (
  order: AdminOrder,
  isOpen: boolean,
  onClose: () => void,
  onReturned: (outstanding: number) => void
) => {
  const { t } = useTranslation();
  const { run, currentStep } = useOrderChange(order.id);
  const [selection, setSelection] = useState<ReturnSelection>({});
  const [note, setNote] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  // Fresh dialog on every open (React's alternative to a reset effect).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setSelection({});
      setNote("");
    }
  }

  const currency = getOrderCurrency(order);
  const lines = useMemo(
    () =>
      (order.items ?? [])
        .map((item) => ({ item, returnable: getReturnableQuantity(item) }))
        .filter((l) => l.returnable > 0),
    [order.items]
  );

  const change = useCallback(
    (itemId: string, condition: "restock" | "damaged", delta: number, returnable: number) => {
      setSelection((prev) => {
        const current = prev[itemId] ?? { restock: 0, damaged: 0 };
        const next = { ...current, [condition]: Math.max(0, current[condition] + delta) };
        if (next.restock + next.damaged > returnable) return prev;
        return { ...prev, [itemId]: next };
      });
    },
    []
  );

  const comingBack = lines.reduce((sum, { item }) => {
    const s = selection[item.id];
    return s ? sum + toNumber(item.unit_price) * (s.restock + s.damaged) : sum;
  }, 0);
  const plan = buildReturnPlan(selection);

  const handleConfirm = useCallback(async () => {
    if (isBusy || plan.request.length === 0) return;

    setIsBusy(true);
    const sdk = getSdk();
    let returnId = "";
    try {
      const locationId = await storage.getItem("stock_location_id");
      const outstanding = await run([
        {
          key: "return_initiate",
          run: async () => {
            const { return: created } = await sdk.admin.return.initiateRequest({
              order_id: order.id,
              ...(locationId ? { location_id: locationId } : {}),
              ...(note.trim() ? { internal_note: note.trim() } : {}),
              no_notification: true,
            });
            returnId = created.id;
          },
          undo: async () => {
            await sdk.admin.return.cancelRequest(returnId);
          },
        },
        {
          key: "add_return_items",
          run: async () => {
            await sdk.admin.return.addReturnItem(returnId, { items: plan.request });
          },
        },
        {
          key: "confirm_request",
          run: async () => {
            await sdk.admin.return.confirmRequest(returnId, { no_notification: true });
          },
          // Once confirmed, only cancel works; cancelRequest is rejected (verified on staging).
          undo: async () => {
            await sdk.admin.return.cancel(returnId);
          },
          replacesUndo: true,
        },
        {
          key: "initiate_receive",
          run: async () => {
            await sdk.admin.return.initiateReceive(returnId, {});
          },
          // cancel is rejected while a receive is open, so this runs first.
          undo: async () => {
            await sdk.admin.return.cancelReceive(returnId);
          },
        },
        ...(plan.receive.length
          ? [
              {
                key: "receive",
                run: async () => {
                  await sdk.admin.return.receiveItems(returnId, { items: plan.receive });
                },
              },
            ]
          : []),
        ...(plan.dismiss.length
          ? [
              {
                key: "dismiss",
                run: async () => {
                  await sdk.admin.return.dismissItems(returnId, { items: plan.dismiss });
                },
              },
            ]
          : []),
        {
          key: "confirm_receive",
          run: async () => {
            await sdk.admin.return.confirmReceive(returnId, { no_notification: true });
          },
        },
      ]);

      toast.success(t("orders.post_sale.return_success"));
      onClose();
      onReturned(outstanding);
    } catch (error) {
      void logger.error(`Return failed: ${safeStringify(error)}`);
      handleErrorToast(describeChangeError(error, order, t));
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, plan, run, order, note, onClose, onReturned, t]);

  return {
    currency,
    lines,
    selection,
    change,
    note,
    setNote,
    comingBack,
    canConfirm: plan.request.length > 0,
    handleConfirm,
    isBusy,
    progressLabel: currentStep ? t(`orders.post_sale.step_${currentStep}`) : null,
  };
};

export { useReturnItems };
