import { useParams, useNavigate } from "react-router-dom";
import { Params } from "@/types/utils";
import withErrorBoundary from "@/components/hoc/with-error-boundary";
import { useQueryOrder } from "@/hooks/queries/useQueryOrder";
import Order from "@/components/order";
import Backdrop from "@/components/base/backdrop";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowLeft } from "lucide-react";

const OrderPage = () => {
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
          <h2 className="text-2xl font-bold text-fg mb-2">Order Not Found</h2>
          <p className="text-fg-muted mb-6">
            {isSdkError 
              ? "The system is initializing. Please try refreshing."
              : "The order you're looking for doesn't exist or has been removed."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/orders")}
              className="px-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
            <Button
              variant="default"
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-6"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? "Refreshing..." : "Refresh"}
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
