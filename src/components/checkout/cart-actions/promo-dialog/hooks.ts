import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleErrorToast } from "@/utils/helpers";
import { useCheckout } from "../../hooks";
import { useQueryPromotions } from "@/hooks/queries/useQueryPromotions";
import { getSdk } from "@/config/medusa";
import { AdminPromotion } from "@medusajs/types";

const formatPromotionValue = (promotion: AdminPromotion): string => {
  const method = promotion.application_method;
  if (!method?.value) return "";
  if (method.type === "percentage") return `${method.value}% off`;
  return `${method.value / 100} off`;
};

const usePromoDialog = () => {
  const { draftOrderId, promoCodes, applyPromoCode, removePromoCode } = useCheckout();
  const { data: promotionsData, isLoading: isLoadingPromotions } = useQueryPromotions();
  const [isApplying, setIsApplying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const isBusy = isApplying || isRemoving;

  const { data: draftOrderForAdjustments } = useQuery({
    queryKey: ["draft-order-adjustments", draftOrderId],
    queryFn: async () => {
      const sdk = getSdk();
      const { draft_order } = await sdk.admin.draftOrder.retrieve(draftOrderId!, {
        fields: "*items,*items.adjustments,+items.adjustments.code",
      });
      return draft_order;
    },
    enabled: !!draftOrderId,
    staleTime: 0,
    gcTime: 30_000,
  });

  const inactiveCodes = useMemo(() => {
    if (!draftOrderForAdjustments?.items || promoCodes.length === 0) return new Set<string>();
    const activeCodes = new Set<string>(
      (draftOrderForAdjustments.items ?? [])
        .flatMap((item) => item.adjustments ?? [])
        .map((adj) => (adj as unknown as Record<string, unknown>).code as string | undefined)
        .filter((c): c is string => Boolean(c))
    );
    return new Set(promoCodes.filter((c) => !activeCodes.has(c)));
  }, [draftOrderForAdjustments, promoCodes]);

  const activePromotions = useMemo(
    () =>
      (promotionsData?.promotions ?? []).filter(
        (p) => p.status === "active" && p.code
      ),
    [promotionsData]
  );

  const availablePromotions = useMemo(
    () =>
      activePromotions.filter(
        (p) => !promoCodes.includes(p.code!.toUpperCase())
      ),
    [activePromotions, promoCodes]
  );

  const handleSelect = useCallback(
    async (code: string) => {
      setIsApplying(true);
      try {
        await applyPromoCode(code);
        if (draftOrderId) {
          toast.success(`Promo code "${code}" applied.`);
        }
      } catch (error) {
        handleErrorToast(
          error instanceof Error ? error.message : "Failed to apply promo code"
        );
      } finally {
        setIsApplying(false);
      }
    },
    [draftOrderId, applyPromoCode]
  );

  const handleRemove = useCallback(
    async (c: string) => {
      setIsRemoving(true);
      try {
        await removePromoCode(c);
        toast.success(`Promo code "${c}" removed.`);
      } catch (error) {
        handleErrorToast(
          error instanceof Error ? error.message : "Failed to remove promo code"
        );
      } finally {
        setIsRemoving(false);
      }
    },
    [removePromoCode]
  );

  return {
    availablePromotions,
    isLoadingPromotions,
    isBusy,
    promoCodes,
    inactiveCodes,
    hasDraftOrder: !!draftOrderId,
    formatPromotionValue,
    handleSelect,
    handleRemove,
  };
};

export { usePromoDialog };
