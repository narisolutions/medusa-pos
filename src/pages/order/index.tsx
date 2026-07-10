import { useParams, useNavigate } from "react-router-dom";
import { Params } from "@/types/utils";
import withErrorBoundary from "@/components/hoc/with-error-boundary";
import { useQueryOrder } from "@/hooks/queries/useQueryOrder";
import Order from "@/components/order";
import Backdrop from "@/components/base/backdrop";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { useTranslation } from "@/i18n";

const OrderPage = () => {
  const { t } = useTranslation();
  const { orderId } = useParams<Params>();
  const navigate = useNavigate();
  const { data: order, isLoading, error, refetch, isFetching } = useQueryOrder(orderId || "");

  if (isLoading) {
    return <Backdrop loading={true} />;
  }

  if (error || !order) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isSdkError = errorMessage.includes("SDK not initialized");
    
    return (
      <div className="bg-surface p-10 rounded-lg space-y-6 h-full flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-fg mb-2">{t("orders.order_not_found_title")}</h2>
          <p className="text-fg-muted mb-6">
            {isSdkError
              ? t("orders.sdk_initializing")
              : t("orders.order_not_found_message")}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/orders")}
              className="px-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("common.back_to_orders")}
            </Button>
            <Button
              variant="default"
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-6"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? t("common.refreshing") : t("common.refresh")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <Order order={order} />;
};

const OrderPageWithErrorBoundary = withErrorBoundary({
  component: "OrderPage",
})(OrderPage);

export default OrderPageWithErrorBoundary;
