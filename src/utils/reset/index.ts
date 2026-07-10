import { queryClient } from "@/config/query";
import { useCartStore } from "@/context/cart";
import { useUser } from "@/context/user";
import storage from "@/utils/storage";

/** Full reset on backend-URL change — clears caches, state and storage. */
const resetOnBackendChange = async (): Promise<void> => {
  const { resetSdk } = await import("@/config/medusa");
  resetSdk();

  queryClient.clear();

  document.documentElement.style.removeProperty("--color-primary");
  document.documentElement.style.removeProperty("--color-secondary");
  document.documentElement.style.removeProperty("--font-scale");
  document.title = "POS";

  useCartStore.getState().clearItems();
  useCartStore.getState().setDraftOrderId(null);

  await storage.clearOnBackendChange();

  await storage.removeItem("cart").catch(() => {});

  useUser.getState().update(null);

  const { useSalesChannel } = await import("@/context/sales-channel");
  useSalesChannel.getState().setSalesChannelId(undefined);
  useSalesChannel.getState().setNeedsWarning(true);
};

export { resetOnBackendChange };
