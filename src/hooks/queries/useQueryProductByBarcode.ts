import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSdk } from "@/config/medusa";
import { handleErrorToast } from "@/utils/helpers";
import { ApiProductResponse } from "@/types/utils";
import { AdminProductVariant } from "@medusajs/types";
import storage from "@/utils/storage";
import { loadPreferences } from "@/utils/settings/preferences";
import { toast } from "sonner";

const fetchProductByBarcode = async (
  barcode: string
): Promise<AdminProductVariant | null> => {
  if (!barcode) {
    return null;
  }

  const prefs = await loadPreferences();
  if (!prefs.integration.customEndpointsEnabled) {
    toast.error("Barcode lookup requires custom endpoints. Enable them in Settings → Preferences.");
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
  return useQuery<AdminProductVariant | null, Error>({
    queryKey: ["product-by-barcode", barcode],
    queryFn: () => fetchProductByBarcode(barcode),
    enabled: !!barcode,
  });
};

export { useQueryProductByBarcode, fetchProductByBarcode };
