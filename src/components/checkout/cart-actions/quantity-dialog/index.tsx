import React, { useMemo, useState } from "react";
import { useChange } from "@/hooks/utils/useChange";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Numpad } from "@/components/ui/numpad";
import { Minus, Plus } from "lucide-react";
import { useCartStore } from "@/context/cart";
import { handleErrorToast } from "@/utils/helpers";
import { useTranslation } from "@/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
};

const QuantityModal: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const items = useCartStore((state) => state.items);
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity);
  const selectedItemId = useCartStore((state) => state.selectedItemId);
  const itemQuantity = useCartStore((state) => state.itemQuantity);
  const setItemQuantity = useCartStore((state) => state.setItemQuantity);
  const [input, setInput] = useState<string>("");
  // The prefilled value is typed over, not appended to.
  const [fresh, setFresh] = useState(true);

  const currentItem = useMemo(
    () => items.find((i) => i.variant_id === selectedItemId),
    [items, selectedItemId]
  );
  const currentQty = currentItem?.quantity || 0;
  const parsed = parseInt(input || "", 10);
  const isValid = !Number.isNaN(parsed) && parsed >= 1;

  useChange(`${open}|${selectedItemId ?? ""}`, () => {
    if (!open) return;
    setInput(String(selectedItemId ? currentQty : (itemQuantity ?? 1)));
    setFresh(true);
  });

  const edit = (value: string) => {
    setInput(value);
    setFresh(false);
  };

  const step = (delta: number) => edit(String(Math.max(1, (isValid ? parsed : 0) + delta)));

  const onApply = () => {
    if (!isValid) return;

    if (selectedItemId) {
      try {
        updateItemQuantity(selectedItemId, parsed);
      } catch (error) {
        handleErrorToast((error as Error).message);
        return;
      }
    } else {
      setItemQuantity(parsed);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="px-12 text-center text-xl">
            {selectedItemId ? currentItem?.title : t("checkout.set_quantity_for_next_item")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon-lg"
            aria-label={t("ui.stepper_decrease")}
            disabled={!isValid || parsed <= 1}
            onClick={() => step(-1)}
          >
            <Minus className="size-6" />
          </Button>
          <output
            aria-live="polite"
            className={`min-w-32 rounded-lg px-4 py-2 text-center text-total tabular-nums ${fresh ? "bg-primary/10" : "bg-surface-subtle"}`}
          >
            {input || "0"}
          </output>
          <Button
            variant="outline"
            size="icon-lg"
            aria-label={t("ui.stepper_increase")}
            onClick={() => step(1)}
          >
            <Plus className="size-6" />
          </Button>
        </div>

        <Numpad
          value={input}
          onChange={edit}
          onEnter={onApply}
          enterDisabled={!isValid}
          replace={fresh}
          allowDecimal={false}
        />
      </DialogContent>
    </Dialog>
  );
};

export default QuantityModal;
