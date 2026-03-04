import withErrorBoundary from "@/components/hoc/with-error-boundary";
import Orders from "@/components/orders";

const OrdersPage = () => {
  return <Orders />;
};

const OrdersPageWithErrorBoundary = withErrorBoundary({
  component: "OrdersPage",
})(OrdersPage);

export default OrdersPageWithErrorBoundary;
