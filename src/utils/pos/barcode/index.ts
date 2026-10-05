import type { AdminProductVariant } from "@medusajs/types";
import { getSdk } from "@/config/medusa";
import { t } from "@/i18n";
import { isPosPluginInstalled } from "@/utils/pos/plugin";
import type { ApiProductResponse } from "@/types/utils";

/**
 * The variant a scanned barcode sells in this sales channel. Null only when no product
 * carries the code; anything else throws, so the caller never reports a failure as
 * "not found".
 */
const fetchProductByBarcode = async (
  barcode: string,
  salesChannelId: string
): Promise<AdminProductVariant | null> => {
  if (!(await isPosPluginInstalled())) {
    throw new Error(t("checkout.barcode_custom_endpoints_disabled"));
  }

  let data: ApiProductResponse;
  try {
    data = await getSdk().client.fetch<ApiProductResponse>(
      `/pos/product-by-barcode/${salesChannelId}/${encodeURIComponent(barcode)}`
    );
  } catch (error) {
    // The plugin is known to be installed, so a 404 is an unknown barcode, not a missing route.
    if ((error as { status?: number } | null)?.status === 404) return null;
    throw error;
  }

  const variant = data?.variants?.[0];
  if (!variant) return null;

  return {
    ...variant,
    product: {
      id: data.id,
      title: data.title,
      thumbnail: data.thumbnail || data.images?.[0]?.url,
      handle: data.handle,
      description: data.description,
    },
  } as unknown as AdminProductVariant;
};

export { fetchProductByBarcode };
