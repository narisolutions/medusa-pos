import React from "react";
import { AdminOrder } from "@medusajs/types";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  Truck,
  CheckCircle,
  Printer,
  FileDown,
  Banknote,
  RotateCcw,
  QrCode,
  ArrowLeftRight,
} from "lucide-react";
import { formatDate } from "@/utils/helpers";
import OrderStatusChip from "@/components/base/order-status-chip";
import { useOrder } from "./hooks";
import { useTranslation } from "@/i18n";
import FulfillmentDialog from "./fulfillment-dialog";
import PickupConfirmationDialog from "./confirmation-dialog";
import RecordPaymentDialog from "./record-payment-dialog";
import RefundDialog from "./refund-dialog";
import PostSaleChooser from "./post-sale-chooser";
import AddItemsDialog from "./add-items-dialog";
import ReturnDialog from "./return-dialog";
import ExchangeDialog from "./exchange-dialog";
import Activity from "./activity";
import Summary from "./summary";
import Details from "./details";
import Items from "./items";
import CustomerAddress from "./customer";

interface Props {
  order: AdminOrder;
}

const Order: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const {
    handleBackToOrders,
    handleReprintReceipt,
    handlePrintHandoffTicket,
    handleDownloadShippingLabel,
    handleCreateShipment,
    handleOpenPickupConfirmation,
    handleMarkAsPickedUp,
    isPrinting,
    isPrintingTicket,
    isTransferOrder,
    isDownloading,
    isDownloadingPDF,
    isCreatingShipment,
    isMarkingAsPickedUp,
    canCreateShipment,
    canMarkAsPickedUp,
    canDownloadShippingLabel,
    canRecordPayment,
    isNegativeFulfillmentStatus,
    isFulfillmentDialogOpen,
    setIsFulfillmentDialogOpen,
    isPickupConfirmationOpen,
    setIsPickupConfirmationOpen,
    isRecordPaymentOpen,
    setIsRecordPaymentOpen,
    canRefund,
    isRefundOpen,
    setIsRefundOpen,
    canPostSale,
    postSaleOptions,
    isPostSaleChooserOpen,
    setIsPostSaleChooserOpen,
    postSaleKind,
    setPostSaleKind,
    handleChoosePostSale,
    lockedRefundAmount,
    handleChangeApplied,
    handleRefunded,
    handleCloseRefund,
    handleDownloadReceiptPDF,
  } = useOrder(order);

  const { display_id, created_at, status, payment_status, fulfillment_status } =
    order;

  return (
    <div className="bg-surface p-10 rounded-lg space-y-6 h-full flex flex-col">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" size="lg" onClick={handleBackToOrders} className="px-5">
          <ArrowLeft className="size-5" />
          {t("common.back_to_orders")}
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-fg">
            {t("orders.order_title", { id: display_id })}
          </h1>
          <p className="text-base text-fg-muted">
            {t("orders.created_label")} {formatDate(created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusChip kind="order" status={status} />
          <OrderStatusChip kind="payment" status={payment_status} />
          <OrderStatusChip kind="fulfillment" status={fulfillment_status} />
        </div>
      </div>

      {/* Grouped by what they act on: money, goods, paper. */}
      <div className="flex flex-wrap items-center gap-3">
        {canRecordPayment && (
          <Button size="lg" onClick={() => setIsRecordPaymentOpen(true)} className="px-6">
            <Banknote className="size-5" />
            {t("orders.record_payment")}
          </Button>
        )}
        {canMarkAsPickedUp && (
          <Button variant="success" size="lg" onClick={handleOpenPickupConfirmation} loading={isMarkingAsPickedUp} className="px-6">
            {!isMarkingAsPickedUp && <CheckCircle className="size-5" />}
            {t("orders.mark_picked_up_button")}
          </Button>
        )}
        {canCreateShipment && (
          <Button size="lg" onClick={handleCreateShipment} loading={isCreatingShipment} className="px-6">
            {!isCreatingShipment && <Truck className="size-5" />}
            {isCreatingShipment ? t("orders.creating_shipment") : t("orders.create_shipment_button")}
          </Button>
        )}
        {canPostSale && (
          <Button variant="outline" size="lg" onClick={() => setIsPostSaleChooserOpen(true)} className="px-6">
            <ArrowLeftRight className="size-5" />
            {t("orders.post_sale.button")}
          </Button>
        )}
        {canRefund && (
          <Button variant="outline" size="lg" onClick={() => setIsRefundOpen(true)} className="px-6 border-danger text-danger-text">
            <RotateCcw className="size-5" />
            {t("orders.refund")}
          </Button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Button variant="outline" size="lg" onClick={handleReprintReceipt} disabled={isDownloadingPDF} loading={isPrinting} className="px-5">
            {!isPrinting && <Printer className="size-5" />}
            {isPrinting ? t("orders.printing") : t("orders.print_receipt_button")}
          </Button>
          <Button variant="outline" size="lg" onClick={handleDownloadReceiptPDF} disabled={isPrinting} loading={isDownloadingPDF} className="px-5">
            {!isDownloadingPDF && <FileDown className="size-5" />}
            {isDownloadingPDF ? t("common.downloading") : t("orders.download_pdf_button")}
          </Button>
          {isTransferOrder && (
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrintHandoffTicket}
              disabled={isPrinting || isDownloadingPDF}
              loading={isPrintingTicket}
              className="px-5"
            >
              {!isPrintingTicket && <QrCode className="size-5" />}
              {isPrintingTicket ? t("orders.printing") : t("handoff.print_action")}
            </Button>
          )}
          {canDownloadShippingLabel && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleDownloadShippingLabel}
              disabled={isNegativeFulfillmentStatus}
              loading={isDownloading}
              className="px-5"
            >
              {!isDownloading && <Download className="size-5" />}
              {isDownloading ? t("common.downloading") : t("orders.download_shipping_label_button")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
          <Summary order={order} />
          <Details order={order} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
          <div className="min-h-0">
            <Items
              order={order}
              isNegativeFulfillmentStatus={isNegativeFulfillmentStatus}
              onOpenFulfillmentDialog={() => setIsFulfillmentDialogOpen(true)}
            />
          </div>

          <div className="min-h-0">
            <CustomerAddress order={order} />
          </div>

          <div className="min-h-0">
            <Activity order={order} />
          </div>
        </div>
      </div>

      <FulfillmentDialog
        isOpen={isFulfillmentDialogOpen}
        onClose={() => setIsFulfillmentDialogOpen(false)}
        order={order}
      />

      <PickupConfirmationDialog
        isOpen={isPickupConfirmationOpen}
        onClose={() => setIsPickupConfirmationOpen(false)}
        onConfirm={handleMarkAsPickedUp}
        isProcessing={isMarkingAsPickedUp}
        orderDisplayId={order.display_id || 0}
      />

      <RecordPaymentDialog
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        order={order}
      />

      <RefundDialog
        isOpen={isRefundOpen}
        onClose={handleCloseRefund}
        order={order}
        amount={lockedRefundAmount}
        onRefunded={handleRefunded}
      />

      <PostSaleChooser
        isOpen={isPostSaleChooserOpen}
        onClose={() => setIsPostSaleChooserOpen(false)}
        options={postSaleOptions}
        onChoose={handleChoosePostSale}
      />

      <ReturnDialog
        isOpen={postSaleKind === "return"}
        onClose={() => setPostSaleKind(null)}
        order={order}
        onReturned={handleChangeApplied}
      />

      <ExchangeDialog
        isOpen={postSaleKind === "exchange"}
        onClose={() => setPostSaleKind(null)}
        order={order}
        onExchanged={handleChangeApplied}
      />

      <AddItemsDialog
        isOpen={postSaleKind === "add"}
        onClose={() => setPostSaleKind(null)}
        order={order}
      />
    </div>
  );
};

export default Order;
