import withErrorBoundary from "@/components/hoc/with-error-boundary";
import Checkout from "@/components/checkout";
import Backdrop from "@/components/base/backdrop";
import { useQueryProducts } from "@/hooks/queries/useQueryProducts";
import { useSalesChannel } from "@/context/sales-channel";

const CheckoutPageContainer = () => {
  const salesChannelId = useSalesChannel((s) => s.salesChannelId);

  const { data, isLoading } = useQueryProducts(salesChannelId);

  if (salesChannelId && (isLoading || !data)) {
    return <Backdrop loading={true} />;
  }
console.log(data);
  return <Checkout products={data || []} />;
};

const CheckoutPageWithErrorBoundary = withErrorBoundary({
  component: "CheckoutPage",
})(CheckoutPageContainer);

export default CheckoutPageWithErrorBoundary;
