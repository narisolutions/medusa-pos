import type { AdminProduct } from "@medusajs/types";
import { queryClient, queryKeys } from "@/config/query";
import { useSalesChannel } from "@/context/sales-channel";
import { fetchProducts } from "@/hooks/queries/useQueryProducts";
import { t } from "@/i18n";
import { getApiErrorMessage } from "@/utils/helpers";
import { logger, safeStringify } from "@/utils/logger";
import { availabilityFromProducts } from "@/utils/pos/draft-order";
import {
  explainRefusal,
  inventoryItemVariants,
  needsLiveStock,
  refusalMessage,
  type RefusalLine,
} from "@/utils/pos/refusal";

/** The catalogue as it is now: a refusal means stock moved, so a cached copy would be wrong. */
async function loadFreshCatalogue(): Promise<AdminProduct[] | null> {
  const salesChannelId = useSalesChannel.getState().salesChannelId;
  if (!salesChannelId) return null;
  try {
    return await queryClient.fetchQuery({
      queryKey: queryKeys.products.list(salesChannelId),
      queryFn: () => fetchProducts(salesChannelId, { quiet: true }),
      staleTime: 0,
    });
  } catch (error) {
    void logger.warn(`Could not reload stock to explain a refusal: ${safeStringify(error)}`);
    return null;
  }
}

/**
 * The reason a sale step failed, naming the lines, when Medusa refused them (no price, no longer
 * for sale, not enough stock, not stocked here). Null for any other error, which the caller
 * reports as it did before. Reloads live stock for the refusals that don't say which line.
 */
async function explainRefusalError(error: unknown, lines: RefusalLine[]): Promise<string | null> {
  const message = getApiErrorMessage(error, "");
  const products = needsLiveStock(message) ? await loadFreshCatalogue() : null;
  const refusal = explainRefusal(message, {
    lines,
    availability: products ? availabilityFromProducts(products) : null,
    inventoryItemVariant: products ? inventoryItemVariants(products) : undefined,
  });
  return refusal ? refusalMessage(refusal, t) : null;
}

export { explainRefusalError };
