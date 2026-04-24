import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Numpad } from "@/components/ui/numpad";
import { Minus, Plus } from "lucide-react";
import { useCartStore } from "@/context/cart";
import { toast } from "sonner";
import { handleErrorToast } from "@/utils/helpers";
import { useTranslation } from "@/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
};

const QuantityModal: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const {
    items,
    updateItemQuantity,
    selectedItemId,
    itemQuantity,
    setItemQuantity,
  } = useCartStore();
  const [input, setInput] = useState<string>("");
  const [showNumpad, setShowNumpad] = useState(false);

  const currentItem = useMemo(
    () => items.find((i) => i.variant_id === selectedItemId),
    [items, selectedItemId]
  );
  const currentQty = currentItem?.quantity || 0;

  const applyQty = (qty: number): boolean => {
    if (!selectedItemId) return false;
    try {
      updateItemQuantity(selectedItemId, Math.max(0, qty));
      toast.success(`Updated quantity to ${qty}`);
      return true;
    } catch (error) {
      handleErrorToast((error as Error).message);
      return false;
    }
  };

  const onApply = () => {
    const parsed = parseInt(input || "", 10);
    if (Number.isNaN(parsed)) return;

    if (selectedItemId) {
      const success = applyQty(parsed);
      if (success) {
        onClose();
        setShowNumpad(false);
      }
    } else {
      setItemQuantity(Math.max(0, parsed));
      onClose();
      setShowNumpad(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setShowNumpad(false);
      return;
    }

    if (selectedItemId) {
      setInput(currentQty.toString());
    } else {
      setInput("");
    }
  }, [open, selectedItemId, currentQty, itemQuantity]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="text-center text-lg font-medium">
          {selectedItemId
            ? currentItem?.title
            : t("checkout.set_quantity_for_next_item")}
        </DialogTitle>

        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-16 w-16 border text-2xl"
              onClick={() => applyQty(currentQty - 1)}
              disabled={currentQty <= 1 && !!selectedItemId}
            >
              <Minus className="h-8 w-8" />
            </Button>
            <Input
              type="text"
              inputMode="decimal"
              className="h-16 w-24 border-0 bg-muted text-center text-3xl font-semibold focus-visible:ring-2"
              placeholder="0"
              value={input}
              autoFocus={true}
              onFocus={() => setShowNumpad(true)}
              onClick={() => setShowNumpad(true)}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onApply()}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-16 w-16 border text-2xl"
              onClick={() => applyQty(currentQty + 1)}
            >
              <Plus className="h-8 w-8" />
            </Button>
          </div>
          {showNumpad && (
            <Numpad
              value={input}
              onChange={setInput}
              onEnter={onApply}
              allowDecimal={false}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuantityModal;
