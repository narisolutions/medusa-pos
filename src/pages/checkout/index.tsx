import Checkout from "@/components/checkout";
import Backdrop from "@/components/base/backdrop";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { useQueryProducts } from "@/hooks/queries/useQueryProducts";
import { useSalesChannel } from "@/context/sales-channel";

const CheckoutPageContainer = () => {
  const salesChannelId = useSalesChannel((s) => s.salesChannelId);

  const { t } = useTranslation();
  const { data, isLoading, isFetching, isError, refetch } = useQueryProducts(salesChannelId);

  // The load failed (typically no connection): say so, instead of a spinner that never ends.
  if (salesChannelId && !data && isError && !isFetching) {
    return (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-medium text-fg">{t("checkout.products_load_failed")}</p>
        <p className="text-base text-fg-muted">{t("checkout.products_load_failed_hint")}</p>
        <Button onClick={() => void refetch()} className="h-12 px-8">
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  if (salesChannelId && (isLoading || !data)) {
    return <Backdrop loading={true} />;
  }

  return <Checkout products={data || []} />;
};

export default CheckoutPageContainer;
