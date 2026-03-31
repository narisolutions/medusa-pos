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
} from "lucide-react";
import { formatDate } from "@/utils/helpers";
import constants from "@/utils/constants";
import { useOrder } from "./hooks";
import FulfillmentDialog from "./fulfillment-dialog";
import PickupConfirmationDialog from "./confirmation-dialog";
import Activity from "./activity";
import Summary from "./summary";
import Details from "./details";
import Items from "./items";
import CustomerAddress from "./customer";

interface Props {
  order: AdminOrder;
}

const Order: React.FC<Props> = ({ order }) => {
  const {
    getStatusColor,
    getFulfillmentStatusColor,
    getPaymentStatusColor,
    formatStatusText,
    handleBackToOrders,
    handleReprintReceipt,
    handleDownloadShippingLabel,
    handleCreateShipment,
    handleOpenPickupConfirmation,
    handleMarkAsPickedUp,
    isPrinting,
    isDownloading,
    isDownloadingPDF,
    isCreatingShipment,
    isMarkingAsPickedUp,
    canCreateShipment,
    canMarkAsPickedUp,
    canDownloadShippingLabel,
    isNegativeFulfillmentStatus,
    isFulfillmentDialogOpen,
    setIsFulfillmentDialogOpen,
    isPickupConfirmationOpen,
    setIsPickupConfirmationOpen,
    handleDownloadReceiptPDF,
  } = useOrder(order);

  const { display_id, created_at, status, payment_status, fulfillment_status } =
    order;

    return (
    <div className="bg-surface p-10 rounded-lg space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleBackToOrders}
            className={`text-fg-muted hover:text-fg hover:bg-surface-hover border-theme-border ${constants.ORDER_BUTTON_LG_CLASSES}`}
          >
            <ArrowLeft className="w-5 h-5 mr-3" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-fg">
              Order #{display_id}
            </h1>
            <p className="text-fg-muted text-sm">
              Created {formatDate(created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canCreateShipment && (
            <Button
              variant="default"
              size="lg"
              onClick={handleCreateShipment}
              disabled={isCreatingShipment}
              className={`bg-blue-600 hover:bg-blue-700 text-white ${constants.ORDER_BUTTON_BASE_CLASSES} min-w-[180px]`}
            >
              <Truck className="w-5 h-5 mr-3" />
              {isCreatingShipment ? "Creating..." : "Create Shipment"}
            </Button>
          )}
          {canMarkAsPickedUp && (
            <Button
              variant="default"
              size="lg"
              onClick={handleOpenPickupConfirmation}
              disabled={isMarkingAsPickedUp}
              className={`bg-green-600 hover:bg-green-700 text-white ${constants.ORDER_BUTTON_BASE_CLASSES} min-w-[180px]`}
            >
              <CheckCircle className="w-5 h-5 mr-3" />
              Mark as Picked Up
            </Button>
          )}
          {canDownloadShippingLabel && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleDownloadShippingLabel}
              disabled={isDownloading || isNegativeFulfillmentStatus}
              className={`border-theme-border text-fg-muted hover:text-fg hover:bg-surface-hover ${constants.ORDER_BUTTON_BASE_CLASSES} min-w-[200px]`}
            >
              <Download className="w-5 h-5 mr-3" />
              {isDownloading ? "Downloading..." : "Download Shipping Label"}
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={handleReprintReceipt}
              disabled={isPrinting || isDownloadingPDF}
              className={`border-theme-border text-fg-muted hover:text-fg hover:bg-surface-hover ${constants.ORDER_BUTTON_BASE_CLASSES} min-w-[200px]`}
            >
              <Printer className="w-5 h-5 mr-3" />
              {isPrinting ? "Printing..." : "Print Receipt"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleDownloadReceiptPDF}
              disabled={isDownloadingPDF || isPrinting}
              className={`border-theme-border text-fg-muted hover:text-fg hover:bg-surface-hover ${constants.ORDER_BUTTON_BASE_CLASSES} min-w-[200px]`}
            >
              <FileDown className="w-5 h-5 mr-3" />
              {isDownloadingPDF ? "Downloading..." : "Download PDF"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`${getStatusColor(status)} w-3 h-3 rounded-full shrink-0`}
            />
            <span className="text-sm font-medium text-fg-muted">
              {formatStatusText(status)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`${getFulfillmentStatusColor(fulfillment_status)} w-3 h-3 rounded-full shrink-0`}
            />
            <span className="text-sm font-medium text-fg-muted">
              {formatStatusText(fulfillment_status)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`${getPaymentStatusColor(payment_status)} w-3 h-3 rounded-full shrink-0`}
            />
            <span className="text-sm font-medium text-fg-muted">
              {formatStatusText(payment_status)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
          <Summary order={order} />
          <Details
            order={order}
            getPaymentStatusColor={getPaymentStatusColor}
            formatStatusText={formatStatusText}
          />
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
    </div>
  );
};

export default Order;
