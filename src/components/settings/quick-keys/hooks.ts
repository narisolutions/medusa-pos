import { useState } from "react";
import { AdminProductVariant } from "@medusajs/types";
import { toast } from "sonner";
import { useQueryStore, useUpdateStore } from "@/hooks/queries/useQueryStore";
import { useQueryProducts } from "@/hooks/queries/useQueryProducts";
import { useSalesChannel } from "@/context/sales-channel";
import { useChange } from "@/hooks/utils/useChange";
import type { ProductPickerResult } from "@/components/base/product-picker/hooks";
import { buildStoreMetadataPayload, getQuickKeys, MAX_QUICK_KEYS, type QuickKey } from "@/utils/settings/store/metadata";
import { sameFormValues } from "@/utils/forms/same-values";
import { useTranslation } from "@/i18n";

const useQuickKeysSettings = () => {
  const { t } = useTranslation();
  const { data: store, isLoading } = useQueryStore();
  const { mutateAsync: updateStore } = useUpdateStore();
  const salesChannelId = useSalesChannel((s) => s.salesChannelId);
  const { data: products = [] } = useQueryProducts(salesChannelId);

  const saved = getQuickKeys(store);
  const [keys, setKeys] = useState<QuickKey[]>(saved);
  const [isSaving, setIsSaving] = useState(false);

  // A loaded or freshly saved store is the new starting point.
  useChange(store, () => setKeys(getQuickKeys(store)));

  const isDirty = !sameFormValues(keys, saved);

  const handleAdd = (variant: AdminProductVariant): ProductPickerResult => {
    if (keys.some((key) => key.variant_id === variant.id)) {
      return { success: false, message: t("settings.quick_keys.already_added") };
    }
    if (keys.length >= MAX_QUICK_KEYS) {
      return { success: false, message: t("settings.quick_keys.max_reached", { count: MAX_QUICK_KEYS }) };
    }
    setKeys((prev) => [...prev, { variant_id: variant.id }]);
    return { success: true };
  };

  const setLabel = (index: number, label: string) =>
    setKeys((prev) => prev.map((key, i) => (i === index ? { ...key, label: label || undefined } : key)));

  const move = (index: number, direction: -1 | 1) =>
    setKeys((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const remove = (index: number) => setKeys((prev) => prev.filter((_, i) => i !== index));

  const discard = () => setKeys(saved);

  const save = async () => {
    if (!store?.id) return;
    setIsSaving(true);
    try {
      const cleaned = keys.map((key) => ({ variant_id: key.variant_id, ...(key.label?.trim() ? { label: key.label.trim() } : {}) }));
      await updateStore({
        storeId: store.id,
        payload: {
          metadata: buildStoreMetadataPayload(store.metadata as Record<string, unknown>, { quick_keys: cleaned }),
        },
      });
      toast.success(t("settings.quick_keys.saved"));
    } finally {
      setIsSaving(false);
    }
  };

  return { keys, products, isLoading, isSaving, isDirty, handleAdd, setLabel, move, remove, discard, save };
};

export { useQuickKeysSettings };
