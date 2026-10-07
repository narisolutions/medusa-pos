import { useCallback, useMemo, useState } from "react";
import { AdminOrder } from "@medusajs/types";
import {
  buildReturnPlan,
  getReturnableQuantity,
  type ReturnSelection,
} from "@/utils/pos/post-sale";
import { toNumber } from "@/utils/pos/pricing";

/** What is coming back, per line and condition, capped at what can still come back. */
const useReturnSelection = (order: AdminOrder) => {
  const [selection, setSelection] = useState<ReturnSelection>({});

  const lines = useMemo(
    () =>
      (order.items ?? [])
        .map((item) => ({ item, returnable: getReturnableQuantity(item) }))
        .filter((l) => l.returnable > 0),
    [order.items]
  );

  const change = useCallback(
    (itemId: string, condition: "restock" | "damaged", delta: number, returnable: number) => {
      setSelection((prev) => {
        const current = prev[itemId] ?? { restock: 0, damaged: 0 };
        const next = { ...current, [condition]: Math.max(0, current[condition] + delta) };
        if (next.restock + next.damaged > returnable) return prev;
        return { ...prev, [itemId]: next };
      });
    },
    []
  );

  const reset = useCallback(() => setSelection({}), []);

  const comingBack = lines.reduce((sum, { item }) => {
    const s = selection[item.id];
    return s ? sum + toNumber(item.unit_price) * (s.restock + s.damaged) : sum;
  }, 0);

  // One slip line per condition, so a split line reads as two.
  const slipLines = lines.flatMap(({ item }) => {
    const s = selection[item.id];
    if (!s) return [];
    const base = { title: item.title ?? "-", unitPrice: toNumber(item.unit_price) };
    return [
      ...(s.restock > 0 ? [{ ...base, quantity: s.restock, condition: "restock" as const }] : []),
      ...(s.damaged > 0 ? [{ ...base, quantity: s.damaged, condition: "damaged" as const }] : []),
    ];
  });

  return { lines, selection, change, reset, comingBack, slipLines, plan: buildReturnPlan(selection) };
};

export { useReturnSelection };
