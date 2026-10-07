import { useCallback, useState } from "react";
import { AdminOrder } from "@medusajs/types";
import { toast } from "sonner";
import { getSdk } from "@/config/medusa";
import { useTranslation } from "@/i18n";
import { getOrderCurrency, handleErrorToast } from "@/utils/helpers";
import { logger, safeStringify } from "@/utils/logger";
import storage from "@/utils/storage";
import { useOrderChange } from "@/hooks/order/useOrderChange";
import { describeChangeError } from "@/utils/pos/order-change";
import { useReturnSelection } from "../return-lines/hooks";
import { receiveReturnSteps } from "@/utils/pos/order-change/return-steps";
import { usePostSaleSlip } from "@/hooks/order/usePostSaleSlip";
import type { PostSaleSlipDraft } from "@/utils/pos/receipt/post-sale-slip";

const useReturnItems = (
  order: AdminOrder,
  isOpen: boolean,
  onClose: () => void,
  onReturned: (outstanding: number, slip: PostSaleSlipDraft) => void
) => {
  const { t } = useTranslation();
  const { run, currentStep } = useOrderChange(order.id);
  const { lines, selection, change, reset, comingBack, slipLines, plan } = useReturnSelection(order);
  const printSlip = usePostSaleSlip();
  const [note, setNote] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  // Fresh dialog on every open (React's alternative to a reset effect).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      reset();
      setNote("");
    }
  }

  const currency = getOrderCurrency(order);

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
        ...receiveReturnSteps(() => returnId, plan),
      ]);

      const slip: PostSaleSlipDraft = {
        kind: "return",
        orderDisplayId: order.display_id ?? "",
        currency,
        back: slipLines,
        out: [],
      };
      toast.success(t("orders.post_sale.return_success"));
      onClose();
      // Owed money: the slip prints once the refund says how it was paid back.
      if (outstanding < 0) onReturned(outstanding, slip);
      else printSlip({ ...slip, settlement: { direction: "even" } });
    } catch (error) {
      void logger.error(`Return failed: ${safeStringify(error)}`);
      handleErrorToast(describeChangeError(error, order, t));
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, plan, run, order, note, currency, slipLines, printSlip, onClose, onReturned, t]);

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
