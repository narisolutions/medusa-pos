import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { handleErrorToast } from "@/utils/helpers";
import { ApiProductResponse } from "@/types/utils";
import { AdminProductVariant } from "@medusajs/types";
import storage from "@/utils/storage";
import { useUser } from "@/context/user";
import { isPosPluginInstalled } from "@/utils/pos/plugin";
import { toast } from "sonner";
import { t } from "@/i18n";

const fetchProductByBarcode = async (
  barcode: string
): Promise<AdminProductVariant | null> => {
  if (!barcode) {
    return null;
  }

  if (!(await isPosPluginInstalled())) {
    toast.error(t("checkout.barcode_custom_endpoints_disabled"));
    return null;
  }

  try {
    const sales_channel_id = await storage.getItem("sales_channel_id");
    if (!sales_channel_id) {
      return null;
    }

    const sdk = getSdk();
    const data = (await sdk.client.fetch(
      `/pos/product-by-barcode/${sales_channel_id}/${barcode}`,
      {
        method: "GET",
      }
    )) as ApiProductResponse;

    if (!data?.variants?.length) {
      return null;
      
    }

    const variant = data.variants[0];

    return {
      ...variant,
      product: {
        id: data.id,
        title: data.title,
        thumbnail: data.thumbnail || data.images?.[0]?.url,
        handle: data.handle,
        description: data.description,
      },
    } as AdminProductVariant;
  } catch (error) {
    handleErrorToast(error, { posEndpointError: true });
    return null;
  }
};

const useQueryProductByBarcode = (
  barcode: string
): UseQueryResult<AdminProductVariant | null, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminProductVariant | null, Error>({
    queryKey: queryKeys.products.byBarcode(barcode),
    queryFn: () => fetchProductByBarcode(barcode),
    enabled: isAuthenticated && !!barcode,
  });
};

export { useQueryProductByBarcode, fetchProductByBarcode };
